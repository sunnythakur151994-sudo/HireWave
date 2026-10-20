
 // npm workspace scripts change cwd to apps/api; always read the repo-level .env.
 // dotenv does not override platform-supplied variables (e.g. Railway secrets).
 import dotenv from "dotenv";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
 dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

 const splitOrigins = (raw: string) => raw.split(",").map((x) => x.trim()).filter(Boolean);

 export const env = {
   port: Number(process.env.PORT ?? 4000),
   jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me-please-32chars!",
   credentialsKey: process.env.CREDENTIALS_KEY ?? "dev-credentials-key-change-me-32chars!",
   dataDir: process.env.DATA_DIR ?? "./data",
   allowSetPlan: process.env.HIREWAVE_ALLOW_SET_PLAN === "1",
   githubToken: process.env.GITHUB_TOKEN,
   corsOrigins: splitOrigins(process.env.CORS_ORIGIN ?? "http://localhost:5173"),
   isProduction: process.env.NODE_ENV === "production",
   publicWebUrl: process.env.PUBLIC_WEB_URL ?? "http://localhost:5173",
   agentsSendingEnabled: process.env.AGENTS_SENDING_ENABLED === "true",
   twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
   twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
   twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
   resendApiKey: process.env.RESEND_API_KEY,
   recruitmentFromEmail: process.env.RECRUITMENT_FROM_EMAIL,
   signupEnabled: true,
   reviewPassword: process.env.REVIEW_ACCESS_PASSWORD || "",
   adminEmail: (process.env.HIREWAVE_ADMIN_EMAIL || "").trim().toLowerCase(),
   adminPasswordHash: (process.env.HIREWAVE_ADMIN_PASSWORD_HASH || "").trim(),
   adminPasswordPolicy: process.env.HIREWAVE_ADMIN_PASSWORD_POLICY || "",
 };

 if (env.isProduction && ([env.jwtSecret, env.credentialsKey].some(
   (s) => s.length < 32 || s.includes("change-me") || s.startsWith("dev-")
 ))) {
   throw new Error("Production requires two separate strong JWT_SECRET and CREDENTIALS_KEY values (at least 32 chars).");
 }

 if (env.isProduction && env.adminEmail && env.adminPasswordPolicy !== "strong") {
   throw new Error("Public deployment requires a strong, unique administrator password (16+ characters). Run scripts/setup-admin.mjs again.");
 }
