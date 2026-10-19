import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./auth.js";
import { storage } from "./storage.js";
import { env } from "./env.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/signup", async (req, reply) => {
    if (!env.signupEnabled) return reply.code(403).send({ error: "Registration is closed. Ask the HireWave administrator for access." });
    const body = z.object({
      email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(120), orgName: z.string().min(1).max(160),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Invalid signup details" });
    if (body.data.email.toLowerCase() === env.adminEmail) return reply.code(403).send({ error: "This email is reserved for administrator access" });
    if (storage.findUserByEmail(body.data.email)) return reply.code(409).send({ error: "Email already registered" });
    const { user, org } = storage.createOrgWithUser({ ...body.data, passwordHash: hashPassword(body.data.password) });
    const token = app.jwt.sign({ uid: user.id, oid: org.id }, { expiresIn: "8h" });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, org };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid credentials" });
    const found = storage.findUserByEmail(body.data.email);
    if (!found || !verifyPassword(body.data.password, found.user.passwordHash)) return reply.code(401).send({ error: "Invalid credentials" });
    storage.addAudit(found.org.id, "auth.login", found.user.id, "Successful login");
    const token = app.jwt.sign({ uid: found.user.id, oid: found.org.id }, { expiresIn: "8h" });
    return { token, user: { id: found.user.id, email: found.user.email, name: found.user.name, role: found.user.role }, org: found.org };
  });

  app.get("/api/me", { preHandler: [async (req) => { await req.jwtVerify(); }] }, async (req, reply) => {
    const u = storage.getUser(req.user.uid);
    if (!u) return reply.code(401).send({ error: "User no longer exists" });
    return { user: { id: u.id, email: u.email, name: u.name, role: u.role }, org: storage.getOrg(u.orgId) };
  });
}
