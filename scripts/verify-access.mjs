import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
`);
const ids = Object.fromEntries(['adminA','adminB','studentA','studentB','workerA','workerA2','workerB','rejectA'].map((n,i)=>[n,`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
for(const [name,id] of Object.entries(ids)) await db.query('insert into auth.users values ($1,$2,$3)',[id,`${name}@campuscare-test.example`,JSON.stringify({name})]);
const migrations = new URL('../supabase/migrations/', import.meta.url);
for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
  await db.exec(await readFile(new URL(file, migrations), 'utf8'));
}
async function as(name) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[name]||'']); await db.exec(`set role ${name ? 'authenticated':'anon'}`); }
async function call(name,args=[]) { const result=await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args);return result.rows[0].result; }
async function denied(fn,code) {await assert.rejects(fn,e=>e.code===code,`expected ${code}`);}
await as('adminA');const orgA=(await call('cc_create_organisation',['Campus A','College','Noida'])).organisation.id;const codeA=(await call('cc_members')).joinCode;
await as('adminB');const orgB=(await call('cc_create_organisation',['Campus B','Workplace','Delhi'])).organisation.id;const codeB=(await call('cc_members')).joinCode;
await as('');assert.equal((await call('cc_directory')).length,2);await denied(()=>call('cc_workspace'),'42501');
for(const table of ['cc_organisations','cc_memberships','cc_workspaces']) await denied(()=>db.query('select * from public.'+table),'42501');
await as('studentA');await denied(()=>call('cc_join_organisation',[orgA,null,'admin',null]),'42501');
await denied(()=>call('cc_join_organisation',['00000000-0000-4000-8000-000000000099',null,'resident',null]),'22023');
await denied(()=>call('cc_join_organisation',[null,null,'resident',null]),'22023');
assert.equal((await call('cc_join_organisation',[orgA,null,'resident',null])).status,'active');
await denied(()=>call('cc_join_organisation',[orgB,null,'resident',null]),'P0001');
await denied(()=>call('cc_members'),'42501');await denied(()=>db.query("update public.cc_memberships set role='admin' where user_id=$1",[ids.studentA]),'42501');
await as('studentB');await call('cc_join_organisation',[orgB,'not-needed-for-students','resident',null]);
await as('workerA');
for (const invalidCode of [null, '', 'wrong']) await denied(()=>call('cc_join_organisation',[orgA,invalidCode,'worker','Electrical']),'42501');
for(const name of ['workerA','workerA2','rejectA']) {await as(name);assert.equal((await call('cc_join_organisation',[orgA,codeA,'worker','Electrical'])).status,'pending');await denied(()=>call('cc_workspace'),'42501');await denied(()=>call('cc_apply_action',[{action:'create'}]),'42501');}
await as('workerB');await call('cc_join_organisation',[orgB,codeB,'worker','Electrical']);
await as('adminA');await denied(()=>call('cc_review_worker',[ids.workerB,true]),'42501');await call('cc_review_worker',[ids.workerA,true]);await call('cc_review_worker',[ids.workerA2,true]);await call('cc_review_worker',[ids.rejectA,false]);
await as('rejectA');assert.equal((await call('cc_context')).status,'rejected');await denied(()=>call('cc_workspace'),'42501');
const payload={action:'create',title:'Light needs repair',description:'The light in the study hall is broken.',category:'Electrical',zone:'Library',location:'First floor',priority:'High'};
await as('studentA');await call('cc_apply_action',[payload]);let issue=(await call('cc_workspace')).issues[0];assert.equal(issue.reporterId,ids.studentA);
await denied(()=>call('cc_apply_action',[{action:'assign',id:issue.id,workerId:ids.workerA,priority:'High'}]),'42501');
await as('adminB');assert.equal((await call('cc_workspace')).issues.length,0);await denied(()=>call('cc_apply_action',[{action:'assign',id:issue.id,workerId:ids.workerA,priority:'High'}]),'42501');
await as('adminA');await denied(()=>call('cc_apply_action',[{action:'assign',id:issue.id,workerId:ids.workerB,priority:'High'}]),'42501');await call('cc_apply_action',[{action:'assign',id:issue.id,workerId:ids.workerA,priority:'High'}]);
await as('workerA2');assert.equal((await call('cc_workspace')).issues.length,0);await denied(()=>call('cc_apply_action',[{action:'start',id:issue.id,workerId:ids.workerA}]),'42501');
await as('workerA');assert.equal((await call('cc_workspace')).issues.length,1);await denied(()=>call('cc_apply_action',[payload]),'42501');await call('cc_apply_action',[{action:'start',id:issue.id,workerId:ids.workerA}]);
await denied(()=>call('cc_apply_action',[{action:'resolve',id:issue.id,note:'Fixed',photo:`https://res.cloudinary.com/test/image/upload/campuscare/${orgB}/${ids.workerA}/x.png`}]),'22023');
await call('cc_apply_action',[{action:'resolve',id:issue.id,workerId:ids.workerA,note:'Fixed and tested the light.'}]);
await as('adminA');await denied(()=>call('cc_apply_action',[{action:'confirm',id:issue.id}]),'42501');
await as('studentA');await call('cc_apply_action',[{action:'confirm',id:issue.id}]);assert.equal((await call('cc_workspace')).issues[0].status,'Confirmed');await call('cc_apply_action',[{action:'reopen',id:issue.id,note:'The light is flickering again.'}]);assert.equal((await call('cc_workspace')).issues[0].status,'Reported');
await denied(()=>call('cc_create_organisation',['Other campus','College','Elsewhere']),'P0001');
await as('adminA');for(const table of ['cc_organisations','cc_memberships','cc_workspaces']) await denied(()=>db.query('select * from public.'+table),'42501');
console.log('PASS: signup role escalation, cross-organisation access, direct-table writes, wrong-worker actions, pending/rejected access and foreign photo URLs are blocked.');
console.log('PASS: students/employees join without a code; workers require the correct code and approval. Admin creation, assignment, repair, reporter confirmation and reopening work in PostgreSQL.');
await db.close();
