import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { connectError, parseCsvLike, parseJob } from "@hirewave/shared";
import { catalog, getConnector, getManifest } from "./connectors.js";
import { storage } from "./storage.js";
import { startRun } from "./runner.js";

export async function coreRoutes(app: FastifyInstance) {
  app.get("/api/plugins", { preHandler: [app.authenticate] }, async (req) => {
    const conn = [...storage.connections(req.user.oid).map((c) => c.pluginId), "hirewavesync"];
    return { plugins: catalog().map((m) => ({ ...m, connected: conn.includes(m.id), hasCredential: !!storage.getCredential(req.user.oid, m.id) })) };
  });

  app.post("/api/plugins/:id/connect", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const { id } = req.params as { id: string };
    const body = z.object({ apiKey: z.string().min(1).max(500).optional() }).safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "Invalid connector settings" });
    if (id === "hirewavesync") return { connected:id,health:"Built-in; automatically connected" };
    const m = getManifest(id);
    if (!m) return reply.code(404).send({ error: "Unknown plugin" });
    const connectedManifests = storage.connections(oid).map((x) => getManifest(x.pluginId)).filter((x): x is NonNullable<typeof x> => !!x);
    const gate = connectError(storage.planOf(oid), m, connectedManifests);
    if (gate) return reply.code(402).send({ error: gate });
    const c = getConnector(id);
    if (!c) return reply.code(400).send({ error: `${m.name} is not available yet.` });

    const credential = body.data.apiKey?.trim() || storage.getCredential(oid, id);
    const h = await c.healthCheck({ credential });
    if (!h.ok) return reply.code(400).send({ error: `Could not connect ${m.name}: ${h.detail}` });
    if (body.data.apiKey?.trim()) storage.setCredential(oid, id, body.data.apiKey.trim());
    storage.addConnection(oid, id);
    storage.addAudit(oid, "connector.connected", uid, `${m.name} connected`);
    return { connected: id, health: h.detail };
  });

  app.delete("/api/plugins/:id", { preHandler: [app.authenticate] }, async (req) => {
    const { oid, uid } = req.user;
    const id = (req.params as { id: string }).id;
    if (id === "hirewavesync") return {ok:false,error:"Built-in plugin is always enabled"};
    storage.removeConnection(oid, id);
    storage.addAudit(oid, "connector.disconnected", uid, `${id} disconnected`);
    return { ok: true };
  });

  app.post("/api/candidates/import", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const body = z.object({ csv: z.string().min(3).max(2_000_000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Provide CSV text up to 2 MB" });
    const parsed = parseCsvLike(body.data.csv);
    if (!parsed.length) return reply.code(400).send({ error: "No candidates found. Include a header row and a name column." });
    const imported = storage.importCandidates(oid, parsed);
    storage.addAudit(oid, "candidate.imported", uid, `${imported} candidates imported from CSV`);
    return { parsed: parsed.length, imported };
  });

  app.post("/api/jobs", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const body = z.object({ text: z.string().min(20).max(100_000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Paste a job description (20+ chars)" });
    const job = parseJob(body.data.text);
    storage.saveJob(oid, job);
    storage.addAudit(oid, "job.created", uid, job.title);
    return job;
  });

  app.get("/api/jobs", { preHandler: [app.authenticate] }, async (req) => ({ jobs: storage.listJobs(req.user.oid) }));

  app.get("/api/jobs/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const job = storage.getJob(req.user.oid, (req.params as { id: string }).id);
    if (!job) return reply.code(404).send({ error: "Job not found" });
    return job;
  });

  app.post("/api/runs", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid, uid } = req.user;
    const body = z.object({ jobId: z.string(), pluginIds: z.array(z.string()).max(25).optional(), limit: z.number().int().min(1).max(500).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid body" });
    const job = storage.getJob(oid, body.data.jobId);
    if (!job) return reply.code(404).send({ error: "Job not found" });
    const plan = storage.planOf(oid);
    const used = storage.getSearchesUsed(oid, plan.id);
    if (used >= plan.searchesPerMonth) return reply.code(402).send({ error: `${plan.label} limit reached (${plan.searchesPerMonth} searches). Upgrade to continue.` });
    const connected = storage.connections(oid).map((c) => c.pluginId);
    const requested: string[] = [...new Set<string>(body.data.pluginIds ?? connected)];
    const ids = requested.filter((id) => connected.includes(id) && !!getConnector(id));
    if (!ids.length) return reply.code(400).send({ error: "No live plugins connected. Connect one first." });
    const selected = ids.map((id) => getManifest(id)).filter((x): x is NonNullable<typeof x> => !!x);
    const paid = selected.filter((m) => m.tier !== "free");
    const famous = selected.filter((m) => m.tier === "famous");
    const extras = selected.filter((m) => m.tier === "extra");
    if (plan.id === "trial" && paid.length > 1) return reply.code(402).send({ error: "Free trial allows one paid/famous connector per run." });
    if (famous.length > plan.famousSlots) return reply.code(402).send({ error: `${plan.label} allows ${plan.famousSlots} famous connector(s).` });
    if (extras.length && !plan.extraPlugins) return reply.code(402).send({ error: `${plan.label} does not include extra-tier connectors.` });
    const limit = Math.min(body.data.limit ?? plan.maxCandidatesPerRun, plan.maxCandidatesPerRun);
    storage.incrementSearches(oid, plan.id);
    return startRun(oid, job, ids, limit, uid);
  });

  app.get("/api/runs/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const run = storage.getRun(req.user.oid, (req.params as { id: string }).id);
    if (!run) return reply.code(404).send({ error: "Run not found" });
    return run;
  });
}
