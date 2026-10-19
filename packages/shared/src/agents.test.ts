import test from 'node:test';
import assert from 'node:assert/strict';
import {E164,professionalPhone,destinationAvailable,draftAgentOutreach} from './agents.js';
import type { Candidate, JobSpec } from './types.js';
const candidate:Candidate={id:'c1',name:'Example Asha Verma',email:'asha@example.com',skills:['react'],links:[],sources:[{plugin:'pool',fetchedAt:'2026-10-10T00:00:00Z'}],
  profileFields:[{field:'professionalPhone',value:'+919876543210',plugin:'pool',fetchedAt:'2026-10-10T00:00:00Z',method:'imported'}]};
const job:JobSpec={id:'j1',title:'Software Engineer',rawText:'Software Engineer with react skills',mustHave:['react'],niceToHave:[],remote:true,createdAt:'2026-10-10T00:00:00Z'};
test('Only E.164 phone numbers are usable',()=>{
  assert.ok(E164.test('+919876543210'));
  assert.equal(E164.test('9876543210'),false);
  assert.equal(professionalPhone(candidate),'+919876543210');
  assert.equal(professionalPhone({...candidate,profileFields:[{...candidate.profileFields![0],value:'9876543210'}]}),undefined);
});
test('Do not fabricate a candidate phone',()=>{
  assert.equal(professionalPhone({...candidate,profileFields:[]}),undefined);
  assert.equal(destinationAvailable('voice',{...candidate,profileFields:[]}),false);
  assert.equal(destinationAvailable('email',candidate),true);
});
test('Messaging Agent includes opt-out and only recruitment-specific follow up',()=>{
  const email=draftAgentOutreach('email',candidate,job,'Example Company');
  const sms=draftAgentOutreach('sms',candidate,job,'Example Company');
  assert.match(email.body,/OPT OUT/);
  assert.match(sms.body,/STOP/);
  assert.match(email.body,/Software Engineer/);
});
test('Calling Agent script is a truthful notification, not a fake interview booking',()=>{
  const voice=draftAgentOutreach('voice',candidate,job,'Example Company');
  assert.match(voice.body,/automated recruitment follow-up/);
  assert.match(voice.body,/arrange a suitable interview time/);
  assert.doesNotMatch(voice.body,/your interview has been confirmed/i);
});
