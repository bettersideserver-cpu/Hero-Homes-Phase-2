import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('feedback migration enforces privacy, idempotency, counts and unlike isolation', async t => {
 const db = new PGlite(); t.after(() => db.close());
 await db.exec('create role anon; create role authenticated;');
 const sql = readFileSync(new URL('../map/IPX/admin/sql/like-comment.sql', import.meta.url), 'utf8');
 await db.exec(sql); await db.exec(sql);
 const client = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
 const context = JSON.stringify({page_key:'/tour?tower=9&floor=12&unit=2',page_url:'https://example.test/tour',page_name:'Living room',tower:'9',floor:12,unit:2});
 const send = (kind, who=client, liked=true, comment='', request=null) => db.query('select submit_page_feedback($1,$2,$3,$4,$5,$6,$7)', [who,kind,context,'Visitor',liked,comment,request]);
 await db.exec('set role anon');
 await send('like'); await send('like');
 await assert.rejects(db.query('select * from page_feedback'), /permission denied/);
 await assert.rejects(db.query('delete from page_feedback'), /permission denied/);
 await send('comment',client,true,'Nice apartment','33333333-3333-4333-8333-333333333333');
 await send('comment',client,true,'Nice apartment','33333333-3333-4333-8333-333333333333');
 await assert.rejects(send('comment',client,true,' ', '44444444-4444-4444-8444-444444444444'), /check constraint/);
 await send('like',other,false);
 await db.exec('set role authenticated');
 let rows = (await db.query('select * from page_feedback order by kind')).rows;
 assert.equal(rows.length,2); assert.equal(rows[0].floor,12); assert.equal(rows[0].unit,2); assert.equal(rows[0].comment,'Nice apartment');
 await send('like',client,false);
 assert.equal((await db.query("select count(*)::int as n from page_feedback where kind='like'")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int as n from page_feedback where kind='comment'")).rows[0].n,1);
 await send('like');
 await db.query("delete from page_feedback where kind='comment'");
 assert.equal((await db.query('select kind from page_feedback')).rows[0].kind, 'like');
 await db.query("delete from page_feedback where kind='like'");
 assert.equal((await db.query('select * from page_feedback')).rows.length, 0);
});

import {JSDOM} from 'jsdom';
const settle = async () => {for(let i=0;i<5;i++) await new Promise(resolve=>setImmediate(resolve));};
async function admin(t) {
 const dom = new JSDOM(readFileSync(new URL('../map/IPX/admin/index.html', import.meta.url),'utf8'), {runScripts:'outside-only'});
 t.after(() => dom.window.close()); const w = dom.window;
 let records = Array.from({length:52}, (_,i) => ({id:String(i),kind:i ? 'like':'comment',visitor_name:'<img src=x>',page_key:'/tour?tower=9',page_name:'Living room',tower:'9',floor:12,unit:2,comment:i ? '':'<script>bad</script>',created_at:'2026-10-27T00:00:00Z'}));
 const deletions=[]; let fail=false;
 w.confirm = () => true;
 w.supabase = {from() { let kind; const query = {
 select(){return query;}, order(){return query;}, delete(){return query;},
 eq(_key,value){kind=value;return query;},range(a,b){const filtered=records.filter(r=>r.kind===kind);return Promise.resolve({data:filtered.slice(a,b+1),count:filtered.length});},
 in(_key,ids){deletions.push({kind,ids});if(fail)return Promise.resolve({error:{message:'Denied'}});records=records.filter(r=>!(r.kind===kind && ids.includes(r.id)));return Promise.resolve({error:null});}
 };return query;}};
 w.eval(readFileSync(new URL('../map/IPX/admin/js/feedback.js',import.meta.url),'utf8').replace("import { supabase } from './supabase.js';",'const supabase = window.supabase;').replaceAll('export ', '')+';window.loadFeedback=loadFeedback;initFeedback();');
 await w.loadFeedback();
 return {w,deletions,setFailure(value){fail=value;}};
}
test('admin separates tables, escapes text and independently paginates', async t => {
 const {w}=await admin(t);
 assert.equal(w.document.querySelector('#feedbackLikes').textContent,'51');
 assert.equal(w.document.querySelector('#feedbackComments').textContent,'1');
 assert.equal(w.document.querySelectorAll('#likeRows input').length,50);
 assert.equal(w.document.querySelectorAll('#commentRows input').length,1);
 assert.equal(w.document.querySelectorAll('#likeRows img, #commentRows script').length,0);
 w.document.querySelector('#likeNext').click(); await settle();
 assert.equal(w.document.querySelectorAll('#likeRows input').length,1);
 assert.equal(w.document.querySelector('#likePage').textContent,'51–51 of 51');
 assert.equal(w.document.querySelector('#commentPage').textContent,'1–1 of 1');
 w.document.querySelector('#likeRows button').click();await settle();
 assert.equal(w.document.querySelector('#likePage').textContent,'1–50 of 50');
 assert.equal(w.document.querySelector('#feedbackLikes').textContent,'50');
 assert.equal(w.document.querySelector('#feedbackComments').textContent,'1');
});
test('bulk deletion is table scoped, cancellable, and preserves selection on failure', async t => {
 const {w,deletions,setFailure}=await admin(t);
 const select=w.document.querySelector('#likeSelectAll');select.click();
 assert.equal(w.document.querySelectorAll('#likeRows input:checked').length,50);
 assert.equal(w.document.querySelectorAll('#commentRows input:checked').length,0);
 w.confirm=()=>false;w.document.querySelector('#likeDeleteSelected').click();await settle();
 assert.equal(deletions.length,0);
 w.confirm=()=>true;setFailure(true);w.document.querySelector('#likeDeleteSelected').click();await settle();
 assert.equal(w.document.querySelectorAll('#likeRows input:checked').length,50);
 assert.match(w.document.querySelector('#feedbackMessage').textContent,/Could not delete/);
 setFailure(false);w.document.querySelector('#likeDeleteSelected').click();await settle();
 assert.equal(deletions.at(-1).kind,'like');assert.equal(deletions.at(-1).ids.length,50);
 assert.equal(w.document.querySelector('#feedbackLikes').textContent,'1');
 assert.equal(w.document.querySelector('#feedbackComments').textContent,'1');
 w.document.querySelector('#commentRows button').click();await settle();
 assert.equal(w.document.querySelector('#feedbackComments').textContent,'0');
 assert.equal(w.document.querySelector('#feedbackLikes').textContent,'1');
 assert.match(w.document.querySelector('#commentRows').textContent,/No comments yet/);
});
