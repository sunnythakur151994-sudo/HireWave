
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import staticFiles from "@fastify/static";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { storage } from "./storage.js";
import { authRoutes } from "./routes-auth.js";
import { coreRoutes } from "./routes-core.js";
import { automationRoutes } from "./routes-automation.js";
import { outputRoutes } from "./routes-output.js";
import { agentRoutes } from "./routes-agents.js";
import { adminRoutes } from "./routes-admin.js";
import { contactExtractorRoutes } from "./routes-contact-extractor.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: env.isProduction ? "info" : "debug" }
  });

  await app.register(cors, {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow: boolean) => void
    ) => {
      if (!origin || env.corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: false,
  });

  await app.register(jwt, { secret: env.jwtSecret });

  app.decorate("authenticate", async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      await req.jwtVerify();

      const authUser = storage.getUser(req.user.uid);

      if (!authUser || authUser.orgId !== req.user.oid) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }

      if (authUser.role === "admin") {
        reply.code(403).send({
          error: "Administrator accounts use the Admin Portal"
        });
        return;
      }
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
  });

  app.get("/api/health", async () => ({
    ok: true,
    version: "0.6.1-admin-extractor",
    ts: new Date().toISOString()
  }));

  await app.register(authRoutes);
  await app.register(coreRoutes);
  await app.register(outputRoutes);
  await app.register(automationRoutes);
  await app.register(agentRoutes);
  await app.register(adminRoutes);
  await app.register(contactExtractorRoutes);

  if (env.isProduction) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const webDist = path.resolve(here, "../../web/dist");

    if (!existsSync(path.join(webDist, "index.html"))) {
      throw new Error(
        "Frontend build not found. Run 'npm run build' from the repository root first."
      );
    }

    await app.register(staticFiles, {
      root: webDist,
      wildcard: false
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }

      if (
        request.method !== "GET" ||
        !(request.headers.accept ?? "").includes("text/html")
      ) {
        return reply.code(404).send({ error: "Not found" });
      }

      return reply
        .header("Cache-Control", "no-cache")
        .sendFile("index.html");
    });
  }

  return app;
}
