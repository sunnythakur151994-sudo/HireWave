import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { qualifyForWorkflow } from "@hirewave/shared";
import { storage } from "./storage.js";
import { env } from "./env.js";

const tokenSchema = z.string().regex(/^[a-zA-Z0-9_-]{40,60}$/);
const messageText = (firstName: string, title: string, link: string) =>
  `Hello ${firstName},\n\nWe are reviewing people for a ${title} opportunity. If you would like to be considered, please confirm your current availability and communication preferences at the secure link below:\n\n${link}\n\nNo response is required if you are not interested. Your contact preferences will be respected.\n\nRegards,\nRecruitment Team`;

export async function automationRoutes(app: FastifyInstance) {
  app.get("/api/automation/jobs/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { oid } = req.user;
    const id = (req.params as {id: string}).id;
    const job = storage.getJob(oid, id);
    if (!job) return reply.code(404).send({error:"Job not found"});
    const { slate, run } = storage.getSlate(oid, id);
    const candidates = slate.map(({candidate, score}) => ({
      candidate: { id:candidate.id, name:candidate.name, title:candidate.title, company:candidate.company,
        location:candidate.location, emailAvailable:!!candidate.email, sources:candidate.sources.map(s=>s.plugin) },
      qualification: qualifyForWorkflow(job, candidate, score, storage.getAvailability(oid, id, candidate.id)),
    }));
    const counts = {
      ready_for_hr: candidates.filter(c=>c.qualification.category === "ready_for_hr").length,
      awaiting_availability: candidates.filter(c=>c.qualification.category === "awaiting_availability").length,
      needs_review: candidates.filter(c=>c.qualification.category === "needs_review").length,
      unavailable: candidates.filter(c=>c.qualification.category === "unavailable").length,
    };
    return {job: {id:job.id, title:job.title, mustHave:job.mustHave, minYears:job.minYears}, run, counts,
      candidates, meetingRequests: storage.listMeetingRequests(oid,id),
      services: { emailReady: !!env.resendApiKey && !!env.recruitmentFromEmail, smsReady: !!env.agentsSendingEnabled && !!env.twilioAccountSid && !!env.twilioAuthToken && !!env.twilioFromNumber, voiceReady: !!env.agentsSendingEnabled && !!env.twilioAccountSid && !!env.twilioAuthToken && !!env.twilioFromNumber, calendarReady: false }};
  });

  app.post("/api/automation/jobs/:id/invite", {preHandler:[app.authenticate]}, async (req, reply) => {
    const {oid,uid} = req.user;
    if(storage.getUser(uid)?.role==="viewer") return reply.code(403).send({error:"Viewer role cannot send invitations"});
    const jobId = (req.params as {id:string}).id;
    const parsed = z.object({candidateId:z.string().min(1),sendEmail:z.boolean().default(false),
      contactBasisReviewed:z.boolean().default(false)}).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({error:"Invalid candidate/invitation settings"});
    const job=storage.getJob(oid,jobId);
    const candidate=storage.getCandidate(oid,parsed.data.candidateId);
    if (!job || !candidate || storage.isSuppressed(oid,candidate.id,candidate.email))
      return reply.code(404).send({error:"Candidate or job unavailable"});
    const {slate}=storage.getSlate(oid,jobId);
    const scored=slate.find(s=>s.candidate.id === candidate.id)?.score;
    if (!scored) return reply.code(400).send({error:"Candidate must appear in the current job slate"});
    const q=qualifyForWorkflow(job,candidate,scored,storage.getAvailability(oid,jobId,candidate.id));
    if (!q.criteriaVerified || q.availability !== "unknown")
      return reply.code(400).send({error:"Only qualified, availability-unconfirmed candidates can be invited automatically. Missing profile evidence requires HR review."});
    if (parsed.data.sendEmail && (!parsed.data.contactBasisReviewed || !candidate.email))
      return reply.code(400).send({error:"Email requires a professional address and an explicit recruiter confirmation of contact permission and opt-out checks"});
    if (parsed.data.sendEmail && storage.sentInvitesToday(oid)>=30)
      return reply.code(429).send({error:"Workspace daily invitation limit reached"});
    if (parsed.data.sendEmail && (!env.resendApiKey || !env.recruitmentFromEmail))
      return reply.code(503).send({error:"Configure RESEND_API_KEY and RECRUITMENT_FROM_EMAIL on the server"});
    let issued: ReturnType<typeof storage.createAvailabilityInvite>;
    try { issued=storage.createAvailabilityInvite(oid,jobId,candidate.id); }
    catch(e) { return reply.code(429).send({error:(e as Error).message}); }
    const link=`${env.publicWebUrl.replace(/\/$/,"")}/availability/${issued.token}`;
    const subject=`Availability confirmation - ${job.title}`;
    if (parsed.data.sendEmail) {
      const recipient = candidate.email!;
      try {
        const result = await fetch("https://api.resend.com/emails", {
          method:"POST", headers:{Authorization:`Bearer ${env.resendApiKey}`,"Content-Type":"application/json"},
          body: JSON.stringify({from:env.recruitmentFromEmail,to:[recipient],subject,
            text:messageText(candidate.name.split(" ")[0]||"there",job.title,link)}),
          signal: AbortSignal.timeout(15000),
        });
        if(!result.ok) {
          storage.revokeAvailabilityInvite(issued.invite.id);
          return reply.code(502).send({error:`Email provider rejected request (${result.status}); verify sending domain and sender permissions`});
        }
        storage.markInviteSent(issued.invite.id);
        storage.addAudit(oid,"availability.invite_sent",uid,`Availability inquiry sent for ${candidate.id}`);
        return {sent:true, status:"sent", candidateId:candidate.id};
      } catch {
        storage.revokeAvailabilityInvite(issued.invite.id);
        return reply.code(502).send({error:"Email service unavailable; retry later"});
      }
    }
    storage.addAudit(oid,"availability.link_created",uid,`Secure availability link generated for ${candidate.id}`);
    return {sent:false, link, subject, body:messageText(candidate.name.split(" ")[0]||"there",job.title,link)};
  });

  app.get("/api/availability/:token", async (req,reply) => {
    const parsed=tokenSchema.safeParse((req.params as {token:string}).token);
    if(!parsed.success) return reply.code(404).send({error:"Invalid link"});
    const invite=storage.findAvailabilityInvite(parsed.data);
    if(!invite) return reply.code(404).send({error:"Link expired or already used"});
    const job=storage.getJob(invite.orgId,invite.jobId);
    if(!job) return reply.code(404).send({error:"Job not found"});
    return {role:job.title, organization:storage.getOrg(invite.orgId)?.name ?? "Recruitment team"};
  });

  app.post("/api/availability/:token", async(req,reply) => {
    const token=tokenSchema.safeParse((req.params as {token:string}).token);
    if(!token.success) return reply.code(404).send({error:"Invalid link"});
    const body=z.object({status:z.enum(["available","unavailable"]),timezone:z.string().max(80).optional(),
      availableFrom:z.string().max(60).optional(),preferredWindow:z.string().max(240).optional(),
      contactConsent:z.array(z.enum(["email","sms","voice"])).max(3).default([]),doNotContact:z.boolean().default(false)}).safeParse(req.body);
    if(!body.success) return reply.code(400).send({error:"Invalid response"});
    const {doNotContact,...responseData}=body.data;
    const stored=storage.recordCandidateAvailability(token.data,{...responseData,status:doNotContact?"unavailable":responseData.status,contactConsent:doNotContact?[]:responseData.contactConsent});
    if(!stored) return reply.code(404).send({error:"Link expired or already used"});
    if (doNotContact) {
      const c=storage.getCandidate(stored.orgId,stored.candidateId);
      storage.suppress(stored.orgId,stored.candidateId,c?.email);
      storage.addAudit(stored.orgId,"candidate.opted_out",undefined,"Candidate requested no future contact");
    } else storage.addAudit(stored.orgId,"availability.responded",undefined,`Candidate ${stored.candidateId}: ${stored.status}`);
    return {recorded:true};
  });

  app.post("/api/automation/jobs/:id/meeting-requests", {preHandler:[app.authenticate]}, async(req,reply) => {
    const {oid,uid}=req.user;
    if(storage.getUser(uid)?.role==="viewer") return reply.code(403).send({error:"Viewer role cannot create meeting requests"});
    const jobId=(req.params as {id:string}).id;
    const parsed=z.object({candidateId:z.string().min(1)}).safeParse(req.body);
    if(!parsed.success) return reply.code(400).send({error:"Invalid candidate"});
    const job=storage.getJob(oid,jobId);
    const candidate=storage.getCandidate(oid,parsed.data.candidateId);
    const availability=storage.getAvailability(oid,jobId,parsed.data.candidateId);
    const {slate}=storage.getSlate(oid,jobId);
    const score=slate.find(s=>s.candidate.id === parsed.data.candidateId)?.score;
    if(!job || !candidate || !score || !availability) return reply.code(404).send({error:"Candidate data not found"});
    const q=qualifyForWorkflow(job,candidate,score,availability);
    if(q.category !== "ready_for_hr") return reply.code(400).send({error:"Only candidate-confirmed available profiles may enter the HR meeting queue"});
    const meeting=storage.createMeetingRequest(oid,jobId,candidate.id,availability.preferredWindow);
    storage.addAudit(oid,"meeting.requested",uid,`HR calendar approval pending for candidate ${candidate.id}`);
    return meeting;
  });
}
