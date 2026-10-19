import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { qualifyForWorkflow, destinationAvailable, professionalPhone, draftAgentOutreach } from "@hirewave/shared";
import { storage, type AgentChannel, type AgentTask } from "./storage.js";
import { configured, sendOutreach } from "./agent-services.js";
import { env } from "./env.js";

const channelSchema = z.enum(["email","sms","voice"]);
const dailyLimits: Record<AgentChannel, number> = { email:30, sms:15, voice:5 };

function eligible(oid:string,jobId:string,candidateId:string,channel:AgentChannel):{ok:boolean;reason?:string} {
  const job = storage.getJob(oid,jobId);
  const candidate = storage.getCandidate(oid,candidateId);
  const score = storage.getSlate(oid,jobId).slate.find(s=>s.candidate.id===candidateId)?.score;
  const availability = storage.getAvailability(oid,jobId,candidateId);
  if (!job || !candidate || !score || !availability) return {ok:false,reason:"Candidate is not in this job's current qualified slate"};
  if (storage.isSuppressed(oid,candidateId,candidate.email,candidate)) return {ok:false,reason:"Candidate opted out"};
  const q = qualifyForWorkflow(job,candidate,score,availability);
  if (q.category !== "ready_for_hr") return {ok:false,reason:"Candidate not confirmed eligible and available"};
  if (!q.contactConsent.includes(channel)) return {ok:false,reason:`Candidate has not opted in to ${channel} follow-ups`};
  if (!destinationAvailable(channel,candidate)) return {ok:false,reason:`No usable ${channel} destination`};
  if (storage.recentlySentToCandidate(oid,candidateId,channel)) return {ok:false,reason:"This channel contacted the candidate in the last 7 days"};
  if (storage.recentlyContactedCandidate(oid,candidateId)) return {ok:false,reason:"Candidate was contacted within the last 24 hours"};
  return {ok:true};
}

/** Conservative contact window for automated calls and texts, based on candidate-confirmed timezone. */
function isQuietHour(timezone?:string):boolean {
  if (!timezone) return true;
  try {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:timezone,weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const weekday=parts.find(p=>p.type==='weekday')?.value;
    const hour=Number(parts.find(p=>p.type==='hour')?.value);
    return weekday==='Sat'||weekday==='Sun'||!Number.isFinite(hour)||hour<9||hour>=18;
  } catch { return true; }
}

function scrubTask(task: AgentTask) {
  const {orgId,...safe} = task;
  return safe;
}

export async function agentRoutes(app: FastifyInstance) {
  const auth = {preHandler:[app.authenticate]};
  app.get("/api/agents/jobs/:id",auth,async(req,reply)=>{
    const oid=req.user.oid;
    const jobId=(req.params as {id:string}).id;
    const job=storage.getJob(oid,jobId);
    if(!job)return reply.code(404).send({error:"Job not found"});
    const candidates=storage.getSlate(oid,jobId).slate.map(({candidate,score})=>{
      const availability=storage.getAvailability(oid,jobId,candidate.id);
      const q=qualifyForWorkflow(job,candidate,score,availability);
      const channels=(['email','sms','voice'] as const).map(ch=>{
        const gate=eligible(oid,jobId,candidate.id,ch);
        return {channel:ch,allowed:gate.ok,reason:gate.reason};
      });
      return {id:candidate.id,name:candidate.name,category:q.category,consent:q.contactConsent,
        emailAvailable:destinationAvailable('email',candidate),phoneAvailable:!!professionalPhone(candidate),channels};
    });
    return {job:{id:job.id,title:job.title},candidates,
      tasks:storage.listAgentTasks(oid,jobId).map(scrubTask),
      providers:{email:configured('email'),sms:configured('sms'),voice:configured('voice')},
      sendingEnabled:env.agentsSendingEnabled, limits:dailyLimits};
  });

  app.post("/api/agents/jobs/:id/prepare",auth,async(req,reply)=>{
    const {oid,uid}=req.user;
    if(storage.getUser(uid)?.role==='viewer')return reply.code(403).send({error:'Viewers cannot create outreach'});
    const jobId=(req.params as {id:string}).id;
    const job=storage.getJob(oid,jobId);
    if(!job)return reply.code(404).send({error:'Job not found'});
    const body=z.object({channel:channelSchema,candidateIds:z.array(z.string().min(1)).min(1).max(25)}).safeParse(req.body);
    if(!body.success)return reply.code(400).send({error:'Provide 1-25 candidate IDs and a channel'});
    const outcomes: {candidateId:string;taskId?:string;created?:boolean;error?:string}[]=[];
    for(const id of [...new Set<string>(body.data.candidateIds as string[])]) {
      const gate=eligible(oid,jobId,id,body.data.channel);
      if(!gate.ok){outcomes.push({candidateId:id,error:gate.reason});continue;}
      const candidate=storage.getCandidate(oid,id)!;
      const message=draftAgentOutreach(body.data.channel,candidate,job,storage.getOrg(oid)?.name??'Hiring Team');
      const result=storage.createAgentTask(oid,jobId,id,body.data.channel,message.subject,message.body);
      outcomes.push({candidateId:id,taskId:result.task.id,created:result.created});
    }
    storage.addAudit(oid,'agents.drafts_prepared',uid,`${body.data.channel}: ${outcomes.filter(x=>x.created).length} drafts`);
    return {outcomes};
  });

  // Drafts may be customized by a recruiter, but only BEFORE dispatch.
  // Revision never marks a task approved: dispatch always requires a fresh review.
  app.post("/api/agents/tasks/:id/revise",auth,async(req,reply)=>{
    const {oid,uid}=req.user;
    if(storage.getUser(uid)?.role==='viewer')return reply.code(403).send({error:'Viewers cannot edit outreach'});
    const id=(req.params as {id:string}).id;
    const task=storage.getAgentTask(oid,id);
    if(!task)return reply.code(404).send({error:'Task not found'});
    if(task.status!=='draft')return reply.code(409).send({error:'Only drafts can be edited'});
    const lengthLimit=task.channel==='sms'?320:task.channel==='voice'?650:1500;
    const parsed=z.object({subject:z.string().trim().max(180).optional(),
      body:z.string().trim().min(20).max(lengthLimit)}).safeParse(req.body);
    if(!parsed.success)return reply.code(400).send({error:`Body must be 20-${lengthLimit} characters; subject max 180`});
    // Recruiter edits must retain straightforward unsubscribe/disclosure language.
    if(task.channel==='sms' && !/\bSTOP\b/i.test(parsed.data.body))
      return reply.code(400).send({error:'SMS must include reply STOP opt-out instructions'});
    if(task.channel==='email' && !/opt[ -]?out/i.test(parsed.data.body))
      return reply.code(400).send({error:'Email must include opt-out instructions'});
    if(task.channel==='voice' && !/automat(ed|ic)/i.test(parsed.data.body))
      return reply.code(400).send({error:'Voice script must disclose that this is an automated call'});
    const subject=task.channel==='email' ? (parsed.data.subject?.trim()||'Recruitment follow-up') : undefined;
    const updated=storage.reviseAgentTask(oid,id,subject,parsed.data.body);
    if(!updated)return reply.code(409).send({error:'Draft is no longer editable'});
    storage.addAudit(oid,'agents.draft_revised',uid,`${task.channel}:${id}`);
    return {id:updated.id,updatedAt:updated.updatedAt};
  });

  app.post("/api/agents/tasks/dispatch",auth,async(req,reply)=>{
    const {oid,uid}=req.user;
    if(storage.getUser(uid)?.role==='viewer')return reply.code(403).send({error:'Viewers cannot send outreach'});
    const parsed=z.object({taskIds:z.array(z.string().min(1)).min(1).max(10),contactBasisReviewed:z.literal(true)}).safeParse(req.body);
    if(!parsed.success)return reply.code(400).send({error:'Select 1-10 tasks and explicitly confirm permission/compliance'});
    if(!env.agentsSendingEnabled)return reply.code(503).send({error:'Outbound sending is disabled by AGENTS_SENDING_ENABLED=false'});
    const tasks=[...new Set<string>(parsed.data.taskIds as string[])].map(id=>storage.getAgentTask(oid,id));
    if(tasks.some(t=>!t || t.status!=='draft'))return reply.code(409).send({error:'Every selected task must be an existing unsent draft in your workspace'});
    // One channel per candidate per batch. Prevent simultaneous cross-job contacts.
    const candidateKeys=(tasks as AgentTask[]).map(t=>t.candidateId);
    if(new Set(candidateKeys).size !== candidateKeys.length)
      return reply.code(409).send({error:'Select at most one contact per candidate in a batch'});
    // Fail closed if any candidate lost permission or moved out of the current eligible slate.
    for(const task of tasks as AgentTask[]) {
      const gate=eligible(oid,task.jobId,task.candidateId,task.channel);
      if(!gate.ok)return reply.code(409).send({error:`Task ${task.id} blocked: ${gate.reason}`});
      if(!configured(task.channel))return reply.code(503).send({error:`${task.channel} provider is not configured`});
      if(task.channel !== 'email' && isQuietHour(storage.getAvailability(oid,task.jobId,task.candidateId)?.timezone))
        return reply.code(409).send({error:`${task.channel} is restricted to weekdays 09:00-18:00 in the candidate-confirmed timezone`});
      if(storage.recentAgentCount(oid,task.channel) >= dailyLimits[task.channel])
        return reply.code(429).send({error:`Daily ${task.channel} sending cap reached`});
    }
    const results: {taskId:string;status:string;error?:string}[]=[];
    for(const task of tasks as AgentTask[]) {
      // In-flight submissions are already counted by recentAgentCount.
      if(storage.recentAgentCount(oid,task.channel) >= dailyLimits[task.channel]){
        results.push({taskId:task.id,status:'blocked',error:'Daily channel limit'});continue;
      }
      const gate=eligible(oid,task.jobId,task.candidateId,task.channel);
      if(!gate.ok){results.push({taskId:task.id,status:'blocked',error:gate.reason});continue;}
      storage.updateAgentTask(oid,task.id,{status:'sending',approvedBy:uid});
      try {
        const candidate=storage.getCandidate(oid,task.candidateId)!;
        const providerId=await sendOutreach(task.channel,candidate,task.subject,task.body);
        storage.updateAgentTask(oid,task.id,{status:'sent',providerId});
        storage.addAudit(oid,'agents.sent',uid,`${task.agent}:${task.channel}:${task.id}`);
        results.push({taskId:task.id,status:'sent'});
      } catch(e) {
        // Never auto-retry: network failures can be ambiguous, and duplicating a call is unsafe.
        storage.updateAgentTask(oid,task.id,{status:'failed',error:(e as Error).message.slice(0,200)});
        storage.addAudit(oid,'agents.failed',uid,`${task.channel}:${task.id}`);
        results.push({taskId:task.id,status:'failed',error:(e as Error).message});
      }
    }
    return {results};
  });

  app.post('/api/agents/tasks/:id/cancel',auth,async(req,reply)=>{
    const {oid,uid}=req.user;
    if(storage.getUser(uid)?.role==='viewer')return reply.code(403).send({error:'Viewers cannot cancel agent tasks'});
    const id=(req.params as {id:string}).id;
    const task=storage.cancelAgentTask(oid,id);
    if(!task)return reply.code(409).send({error:'Task not cancellable'});
    storage.addAudit(oid,'agents.cancelled',uid,`Task ${id}`);
    return {ok:true};
  });
}
