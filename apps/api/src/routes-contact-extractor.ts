import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { storage } from "./storage.js";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?<!\w)(?:\+?\d[\d.\s()-]{7,16}\d)(?!\w)/g;
const PROFILE = /https?:\/\/(?:[\w-]+\.)?linkedin\.com\/in\/[a-zA-Z0-9_%.-]+/gi;
const BLOCK = new Set(["example.com","example.org","test.com","email.com","domain.com"]);

export function extractProfessionalContacts(text: string) {
  const found = new Map<string,{type:"email"|"phone"|"profile"; value:string; note:string}>();
  for (const match of text.matchAll(EMAIL)) {
    const value = match[0].toLowerCase();
    if (BLOCK.has(value.split("@")[1]) || /^(noreply|no-reply|test)@/.test(value)) continue;
    found.set(`email:${value}`,{type:"email",value,note:"Unverified; confirm professional relevance and permission"});
  }
  for (const match of text.matchAll(PROFILE)) {
    const value=match[0];found.set(`profile:${value.toLowerCase()}`,{type:"profile",value,note:"Profile URL only; page is not accessed"});
  }
  for (const match of text.matchAll(PHONE)) {
    const value=match[0].replace(/[. ()-]/g, "");
    const digits=value.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) continue;
    found.set(`phone:${digits}`,{type:"phone",value,note:"Unverified; contact only with appropriate permission"});
  }
  return [...found.values()].slice(0,250);
}

export async function contactExtractorRoutes(app: FastifyInstance) {
  app.post("/api/plugins/hirewavesync/extract",{preHandler:[app.authenticate]}, async (req,reply)=>{
    const body=z.object({text:z.string().min(1).max(100000),source:z.string().max(500).optional()}).safeParse(req.body);
    if(!body.success) return reply.code(400).send({error:"Provide up to 100,000 characters of authorized professional text"});
    const rows=extractProfessionalContacts(body.data.text);
    storage.addAudit(req.user.oid,"extractor.used",req.user.uid,`Processed permitted text; ${rows.length} values returned`);
    return {plugin:"hirewavesync",connected:true,contacts:rows,
      notice:"Results are not validated or automatically saved. No URLs were fetched or third-party services contacted."};
  });
}
