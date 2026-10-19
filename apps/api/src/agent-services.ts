import type { Candidate } from "@hirewave/shared";
import { E164, professionalPhone } from "@hirewave/shared";
import { env } from "./env.js";
import type { AgentChannel } from "./storage.js";

export function configured(channel: AgentChannel): boolean {
  if (!env.agentsSendingEnabled) return false;
  if (channel === "email") return !!env.resendApiKey && !!env.recruitmentFromEmail;
  return !!env.twilioAccountSid && !!env.twilioAuthToken && !!env.twilioFromNumber && E164.test(env.twilioFromNumber);
}

function cleanXml(s: string) {
  return s.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[ch]!));
}

async function sendTwilio(kind: "sms" | "voice", to: string, body: string): Promise<string> {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber)
    throw new Error("Provider configuration missing");
  const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");
  const endpoint = kind === "sms" ? "Messages" : "Calls";
  const form = new URLSearchParams({ From: env.twilioFromNumber, To: to });
  if (kind === "sms") form.set("Body", body);
  else form.set("Twiml", `<Response><Say language="en-US">${cleanXml(body)}</Say></Response>`);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.twilioAccountSid)}/${endpoint}.json`, {
    method:"POST", headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},
    body:form.toString(),signal:AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Twilio rejected request (HTTP ${response.status})`);
  const payload = await response.json() as {sid?:string};
  if (!payload.sid) throw new Error("Twilio returned no message/call ID");
  return payload.sid;
}

export async function sendOutreach(channel: AgentChannel, candidate: Candidate, subject: string | undefined, body: string): Promise<string> {
  if (!configured(channel)) throw new Error("Channel disabled or provider credentials missing");
  if (channel === "email") {
    if (!candidate.email || !env.resendApiKey || !env.recruitmentFromEmail) throw new Error("Email details unavailable");
    const response = await fetch("https://api.resend.com/emails", {
      method:"POST",headers:{Authorization:`Bearer ${env.resendApiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({from:env.recruitmentFromEmail,to:[candidate.email],subject:subject ?? "Recruitment follow-up",text:body}),
      signal:AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Resend rejected request (HTTP ${response.status})`);
    const result = await response.json() as {id?:string};
    if (!result.id) throw new Error("Resend returned no message ID");
    return result.id;
  }
  const number = professionalPhone(candidate);
  if (!number) throw new Error("No verified-format professional phone in candidate profile");
  return sendTwilio(channel, number, body);
}
