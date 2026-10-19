import { buildServer } from "./server.js";
import { env } from "./env.js";

const app = await buildServer();
await app.listen({ port: env.port, host: "0.0.0.0" });
console.log(`HireWave API listening on http://localhost:${env.port}`);
