import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { storage } from "./storage.js";

async function requireAdministrator(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify();
  const user = storage.getUser(request.user.uid);
  if (!user || user.role !== "admin" || user.orgId !== request.user.oid)
    return reply.code(403).send({ error: "Administrator access required" });
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/api/admin/overview", { preHandler: [requireAdministrator] }, async (request) => {
    const result = storage.adminOverview();
    // No candidate profiles, user passwords, or stored connector secrets are exposed.
    storage.addAudit(request.user.oid, "admin.overview", request.user.uid, "Administrator viewed aggregate statistics");
    return result;
  });
}
