// One-time local admin provisioning. Password input is never saved; only scrypt salt/hash enters .env.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
const envPath=path.resolve('.env');
const examplePath=path.resolve('.env.example');
if(!fs.existsSync(envPath)) fs.copyFileSync(examplePath,envPath);
const reader=createInterface({input:process.stdin,output:process.stdout});
const question=(prompt)=>new Promise(resolve=>reader.question(prompt,resolve));
const email=(await question('Administrator email: ')).trim();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){console.error('Invalid email');process.exit(1)}
reader.close();
const readHidden=()=>new Promise((resolve,reject)=>{
  process.stdout.write('Admin password (hidden): ');
  if(!process.stdin.isTTY){reject(new Error('Run in an interactive PowerShell terminal'));return;}
  let password='';const input=process.stdin;
  input.setRawMode(true);input.resume();
  const onData=(buf)=>{
    const str=buf.toString('utf8');
    for(const char of str){
      if(char==='\u0003'){input.setRawMode(false);input.off('data',onData);input.pause();reject(new Error('Cancelled'));return;}
      if(char==='\r'||char==='\n'){input.setRawMode(false);input.off('data',onData);input.pause();process.stdout.write('\n');resolve(password);return;}
      if(char==='\u007f'||char==='\b'){password=password.slice(0,-1);continue;}
      password+=char;
    }
  }; input.on('data',onData);
});
const password=await readHidden();
if(password.length<16){console.error('Use a unique password of at least sixteen characters.');process.exit(1)}
const strength=password.length>=16?'strong':'short';
const salt=randomBytes(16).toString('hex');
const hash=scryptSync(password,salt,64).toString('hex');
let contents=fs.readFileSync(envPath,'utf8');
for(const [k,v] of Object.entries({HIREWAVE_ADMIN_EMAIL:email.toLowerCase(),HIREWAVE_ADMIN_PASSWORD_HASH:`${salt}:${hash}`,HIREWAVE_ADMIN_PASSWORD_POLICY:strength})){
  const re=new RegExp(`^${k}=.*$`,'m');
  if(re.test(contents)) contents=contents.replace(re,`${k}=${v}`);
  else contents+=`\n${k}=${v}\n`;
}
fs.writeFileSync(envPath,contents,{mode:0o600});
console.log('Admin account configured. Restart the API and log in normally; you will be routed to the Admin Portal.');
if(strength==='short')console.warn('WARNING: This password is too weak for public deployment. Set a unique 16+ character password and run this tool again before publishing the site.');
