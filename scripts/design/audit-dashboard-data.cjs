// Read-only integration audit. Auth is stubbed in this process only; no HTTP cookies
// or deployed authorization are changed. Only record counts are printed.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
require('@next/env').loadEnvConfig(process.cwd());
require('sucrase/register/ts');
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient({ datasourceUrl: process.env.DATABASE_PRISMA_DATABASE_URL || process.env.DATABASE_URL });
const prisma = client.$extends({ query: { $allModels: { $allOperations({ operation, args, query }) {
  assert.ok(['findMany','findFirst','findUnique','count','aggregate','groupBy'].includes(operation), `Read-only audit blocked ${operation}`);
  return query(args);
} } } });
let session = { user: { id: 'audit-read-only', role: 'admin' } };
const load = Module._load;
Module._load = function(id, parent, main) {
  if (id === '@/lib/prisma') return { prisma };
  if (id === '@/lib/auth') return { authOptions: {}, getSession: async()=>session, requireAdmin: async () => { if(session?.user.role !== 'admin') throw new Error('Unauthorized: Admin access required'); return session; }, requireAuth: async () => { if(!session) throw new Error('Unauthorized'); return session; }, canEdit: s => s?.user.role === 'admin', isAdmin: s=>s?.user.role==='admin' };
  if (id === 'next-auth' || id === 'next-auth/next') return { getServerSession: async () => session };
  return load.call(this, id.startsWith('@/') ? path.join(process.cwd(),id.slice(2)) : id, parent, main);
};
(async()=>{try {
  const routes = ['users','resume-book','job-applications','weekly','team','job-postings','articles','pitches','strategy','investments','calendar','holdings','contact','research-reports','dcf-models','newsletter/editions','newsletter/subscribers','learning/courses','learning/curated','employer-logos','settings'];
  for(const name of routes) {
    const route = require(path.join(process.cwd(),`app/api/${name}/route.ts`));
    const result = await route.GET(new Request(`http://localhost/api/${name}?all=true`));
    assert.equal(result.status,200,`${name} listing failed`);
    const data = await result.json(); assert.ok(name === 'settings' ? typeof data === 'object' : Array.isArray(data),`${name} must return expected data`);
    console.log(`PASS ${name}: ${Array.isArray(data)?data.length:Object.keys(data).length} records`);
    if(['users','resume-book','job-applications','weekly','dcf-models','research-reports'].includes(name)) {
      const admin=session;session=null;
      const denied = await route.GET(new Request(`http://localhost/api/${name}`));
      assert.equal(denied.status,401,`${name} must reject unauthenticated reads`);session=admin;
    }
  }
  function audit(dir) { for(const f of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,f.name); if(f.isDirectory()) audit(p); else if(/\.(ts|tsx)$/.test(p)) assert.ok(!/new PrismaClient\s*\(/.test(fs.readFileSync(p,'utf8')),`${p} bypasses shared database config`); } }
  audit('app'); console.log('PASS application database-client audit');
} finally {await client.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
