import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Candidate, JobSpec, Run } from "@hirewave/shared";
import { mergeCandidates, scoreCandidate } from "@hirewave/shared";
import { getConnector } from "./connectors.js";
import { storage } from "./storage.js";

export interface RunEvent { kind: string; data: unknown; at: string }
export const emitters = new Map<string, EventEmitter>();
const histories = new Map<string, RunEvent[]>();

function emit(runId: string, kind: string, data: unknown) {
  const event = { kind, data, at: new Date().toISOString() };
  const history = histories.get(runId) ?? [];
  history.push(event);
  histories.set(runId, history.slice(-100));
  emitters.get(runId)?.emit("event", event);
}

export function getRunEventHistory(runId: string) { return histories.get(runId) ?? []; }

export async function startRun(orgId: string, job: JobSpec, pluginIds: string[], limit: number, actorUserId?: string): Promise<Run> {
  const run: Run = {
    id: randomUUID(), orgId, jobId: job.id, pluginIds, status: "running",
    totalFound: 0, slateSize: 0, createdAt: new Date().toISOString(),
  };
  storage.createRun(run);
  storage.addAudit(orgId, "sourcing.run_started", actorUserId, `Run ${run.id} for ${job.title}`);
  emitters.set(run.id, new EventEmitter());
  histories.set(run.id, []);

  void (async () => {
    try {
      emit(run.id, "started", { plugins: pluginIds });
      const pool = storage.listPoolCandidates(orgId);
      const batches = await Promise.all(pluginIds.map(async (pid): Promise<Candidate[]> => {
        emit(run.id, "plugin_started", { plugin: pid });
        try {
          const c = getConnector(pid);
          if (!c) { emit(run.id, "plugin_error", { plugin: pid, error: "Unknown connector" }); return []; }
          const credential = storage.getCredential(orgId, pid);
          const candidates = await c.search(job, { limit, pool, credential });
          emit(run.id, "plugin_done", { plugin: pid, found: candidates.length });
          return candidates;
        } catch (e) {
          emit(run.id, "plugin_error", { plugin: pid, error: (e as Error).message });
          return [];
        }
      }));

      const all = batches.flat();
      emit(run.id, "merging", { found: all.length });
      const merged = mergeCandidates(all).filter((c) => !storage.isSuppressed(orgId, c.id, c.email, c));
      const scored = merged.flatMap((c) => {
        if (!storage.upsertCandidate(orgId, c)) return [];
        const saved = storage.canonicalCandidate(orgId, c);
        return saved ? [scoreCandidate(job, saved)] : [];
      }).sort((a, b) => b.score - a.score).slice(0, limit);
      storage.saveScores(orgId, run.id, scored);
      storage.updateRun(run.id, { status: "done", totalFound: merged.length, slateSize: scored.length, finishedAt: new Date().toISOString() });
      storage.addAudit(orgId, "sourcing.run_completed", actorUserId, `Run ${run.id}: ${merged.length} merged, ${scored.length} ranked`);
      emit(run.id, "done", { total: merged.length, slate: scored.length });
    } catch (e) {
      const message = (e as Error).message;
      storage.updateRun(run.id, { status: "error", error: message, finishedAt: new Date().toISOString() });
      storage.addAudit(orgId, "sourcing.run_failed", actorUserId, `Run ${run.id}: ${message}`);
      emit(run.id, "error", { message });
    } finally {
      setTimeout(() => { emitters.delete(run.id); histories.delete(run.id); }, 5 * 60_000);
    }
  })();

  return run;
}
