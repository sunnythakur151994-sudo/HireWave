/** Password gate intended ONLY for invitation-only client reviews. */
import type { FastifyInstance } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";

const COOKIE = "hirewave_review";
const TWENTY_FOUR_HOURS = 24 * 60 * 60;
const failures = new Map<string, { count: number; reset: number }>();

function sig(expiry: string) {
  return createHmac("sha256", env.credentialsKey).update(`review:${expiry}`).digest("hex");
}
function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
function validSession(cookieHeader: string) {
  const raw = cookieHeader.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${COOKIE}=`))?.split("=")[1];
  if (!raw) return false;
  const [expires, token] = raw.split(".");
  if (!expires || !token || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  return safeEquals(sig(expires), token);
}
const ACCESS_FORM = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HireWave - Private Client Review</title><style>body{background:#051814;color:#d9fff2;font:16px system-ui;min-height:90vh;display:grid;place-items:center}main{border:1px solid #176455;padding:32px;border-radius:18px;width:min(340px,85vw)}h1{color:#3ee0b1}input,button{box-sizing:border-box;width:100%;padding:13px;margin:10px 0;border-radius:8px}button{background:#12b99d;color:#031814;border:0;font-weight:700;cursor:pointer}input{background:#092921;color:white;border:1px solid #237260}#err{color:#ffa8a8}</style></head><body><main><h1>HireWave</h1><p>Private client review</p><form id="f"><label>Access password <input id="password" type="password" required autocomplete="current-password" /></label><button type="submit">Open HireWave</button></form><p id="err" role="alert"></p></main><script>document.getElementById('f').addEventListener('submit',async(e)=>{e.preventDefault();const err=document.getElementById('err');err.textContent='';try{const r=await fetch('/_review/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value})});if(r.ok)location.replace('/');else err.textContent='Wrong password or too many attempts.';}catch{err.textContent='Connection error';}});</script></body></html>`;

export async function registerReviewAccess(app: FastifyInstance) {
  if (!env.isProduction || !env.reviewPassword) return;
  app.addHook("onRequest", async (request, reply) => {
    const pathname = (request.url || "").split("?")[0];
    if (pathname === "/api/health" || pathname === "/_review" || pathname === "/_review/unlock") return;
    if (request.method === "OPTIONS") return;
    if (validSession(request.headers.cookie ?? "")) return;
    if (pathname.startsWith("/api/")) return reply.code(401).send({ error: "Private review access required" });
    return reply.redirect("/_review");
  });

  app.get("/_review", async (_request, reply) => reply.header("Cache-Control", "no-store").type("text/html").send(ACCESS_FORM));
  app.post("/_review/unlock", async (request, reply) => {
    const key = request.ip;
    const now = Date.now();
    const row = failures.get(key);
    if (row && now < row.reset && row.count >= 8) return reply.code(429).send({ error: "Too many attempts" });
    const supplied = typeof request.body === "object" && request.body !== null && "password" in request.body
      ? (request.body as Record<string, unknown>).password : null;
    if (typeof supplied !== "string" || !safeEquals(supplied, env.reviewPassword)) {
      const fresh = !row || now >= row.reset ? { count: 0, reset: now + 15 * 60 * 1000 } : row;
      fresh.count++;
      failures.set(key, fresh);
      return reply.code(401).send({ error: "Invalid access password" });
    }
    failures.delete(key);
    const expiry = String(Math.floor(Date.now()/1000) + TWENTY_FOUR_HOURS);
    reply.header("Set-Cookie", `${COOKIE}=${expiry}.${sig(expiry)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TWENTY_FOUR_HOURS}`);
    return { ok: true };
  });
}
