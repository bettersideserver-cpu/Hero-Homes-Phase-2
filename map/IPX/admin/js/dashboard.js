import { supabase } from './supabase.js';
const $=id=>document.getElementById(id);let units=[],apartmentFloors=[],statuses=[];const unitDrafts=new Map();
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
async function guard(){const {data:{session}}=await supabase.auth.getSession();if(!session){location.href='login.html';return false}return true}
async function load(){
  const results=await Promise.all([
    supabase.from('status_categories').select('*').eq('active',true).order('sort_order').order('id'),
    supabase.from('apartments').select('*').order('tower').order('floor').order('unit')
  ]);
  if(results[0].error) throw results[0].error;
  if(results[1].error) throw results[1].error;
  statuses=results[0].data||[]; units=results[1].data||[]; apartmentFloors=[];
  renderTowerTabs();renderUnits();renderStatuses();renderMetrics();loadVisitors();loadHoldRequests();
}
function renderMetrics(){const available=statuses.find(s=>s.name.toLowerCase()==='available');$('mTotal').textContent=units.length;$('mAvailable').textContent=available?units.filter(u=>u.status_id===available.id).length:0;$('mOther').textContent=units.length-(+$('mAvailable').textContent)}
function markUnsaved(el, type, id){
  const badge=document.querySelector(`[data-unsaved-for="${type}-${id}"]`);
  if(badge) badge.classList.add('show');
}
function markSaved(button, type){
  const id=type==='floor'?button.dataset.floorSave:button.dataset.save;
  const badge=document.querySelector(`[data-unsaved-for="${type}-${id}"]`);
  if(badge) badge.classList.remove('show');
}
function getUnitDraftFromRow(row){
  const save=row.querySelector('[data-save]');
  if(!save)return null;
  const id=String(save.dataset.save);
  const statusId=row.querySelector('.ustatus')?.value||'';
  const statusObj=statuses.find(s=>String(s.id)===String(statusId));
  return {id,statusId,status:statusObj?.name||'Available',buyer_name:row.querySelector('.buyerName')?.value.trim()||'',buyer_number:row.querySelector('.buyerNumber')?.value.trim()||''};
}
function getUnitSource(id){return units.find(x=>String(x.id)===String(id));}
function isUnitDraftChanged(draft,source){
  if(!draft||!source)return false;
  return String(draft.status).toLowerCase()!==String(source.status||'').toLowerCase() ||
    draft.buyer_name!==(source.buyer_name||'') ||
    draft.buyer_number!==(source.buyer_number||'');
}
function updateUnsavedRow(row){
  const draft=getUnitDraftFromRow(row); if(!draft)return;
  const source=getUnitSource(draft.id); if(!source)return;
  if(isUnitDraftChanged(draft,source)) unitDrafts.set(draft.id,draft); else unitDrafts.delete(draft.id);
  const changed=isUnitDraftChanged(draft,source);
  row.classList.toggle('has-unsaved',changed);
  const badge=row.querySelector('.unsaved-badge'); if(badge)badge.classList.toggle('show',changed);
}
function renderUnits(){
  const activeTower=document.querySelector('.tower-tab.active')?.dataset.tower || '9';
  const rows=units.filter(u=>String(u.tower)===String(activeTower)).sort((a,b)=>Number(a.floor)-Number(b.floor)||Number(a.unit)-Number(b.unit));
  $('unitRows').innerHTML=rows.map(u=>{
    const d=unitDrafts.get(String(u.id));
    const statusValue=d?.statusId||statuses.find(s=>String(s.name).toLowerCase()===String(u.status).toLowerCase())?.id||'';
    const buyerName=d?.buyer_name ?? (u.buyer_name||'');
    const buyerNumber=d?.buyer_number ?? (u.buyer_number||'');
    const changed=d ? isUnitDraftChanged(d,u) : false;
    return `<tr class="${changed?'has-unsaved':''}">
      <td>${String(u.floor).padStart(2,'0')}</td><td><strong>Unit ${u.unit}</strong></td>
      <td><select data-id="${u.id}" class="ustatus">${statuses.map(s=>`<option value="${s.id}" ${String(s.id)===String(statusValue)?'selected':''}>${esc(s.name)}</option>`).join('')}</select></td>
      <td><input data-id="${u.id}" class="buyerName" value="${escAttr(buyerName)}" placeholder="Buyer name"></td>
      <td><input data-id="${u.id}" class="buyerNumber" value="${escAttr(buyerNumber)}" placeholder="Buyer number"></td>
      <td><button class="save small-btn" data-save="${u.id}">Save</button><span class="unsaved-badge ${changed?'show':''}" data-unsaved-for="unit-${u.id}">Unsaved</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6">No apartments found.</td></tr>';
}

function renderTowerTabs(){
  let bar=document.getElementById('towerTabs');
  if(!bar){bar=document.createElement('div');bar.id='towerTabs';bar.className='tower-tabs';const unitsPage=document.getElementById('units');unitsPage?.querySelector('.top')?.after(bar);}
  const towers=['9','10','11','12','12A'];
  bar.innerHTML=towers.map((t,i)=>`<button type="button" class="tower-tab ${i===0?'active':''}" data-tower="${t}">Tower ${t}</button>`).join('');
  bar.querySelectorAll('.tower-tab').forEach(b=>b.onclick=()=>{bar.querySelectorAll('.tower-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderUnits();});
}
async function saveUnitRow(row,options={}){
  const draft=getUnitDraftFromRow(row); if(!draft)return {ok:false};
  const id=Number(draft.id);
  const {error}=await supabase.from('apartments').update({status:draft.status,buyer_name:draft.buyer_name,buyer_number:draft.buyer_number,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){if(!options.silent)toast(error.message);return {ok:false,error};}
  const data=units.find(u=>String(u.id)===String(id));
  if(data){data.status=draft.status;data.buyer_name=draft.buyer_name;data.buyer_number=draft.buyer_number;}
  unitDrafts.delete(String(id));
  row.classList.remove('has-unsaved');
  const badge=row.querySelector('.unsaved-badge');if(badge)badge.classList.remove('show');
  if(!options.silent)toast('Apartment saved'); renderMetrics(); return {ok:true};
}

async function saveAllUnits(){
  const rows=[...document.querySelectorAll('#unitRows tr')].filter(r=>r.querySelector('[data-save]')&&r.classList.contains('has-unsaved'));
  if(!rows.length){toast('No unsaved apartment changes');return;}
  let failed=0;
  for(const row of rows){const result=await saveUnitRow(row,{silent:true});if(!result.ok)failed++;}
  toast(failed?`${failed} apartment${failed===1?'':'s'} failed to save`:`${rows.length} apartment${rows.length===1?'':'s'} saved`);
}

$('unitRows').onclick=async e=>{const b=e.target.closest('[data-save]');if(!b)return;await saveUnitRow(b.closest('tr'));};
$('unitRows').addEventListener('input',e=>{if(e.target.matches('input,select'))updateUnsavedRow(e.target.closest('tr'))});
$('unitRows').addEventListener('change',e=>{if(e.target.matches('input,select'))updateUnsavedRow(e.target.closest('tr'))});
$('masterSaveUnits').onclick=saveAllUnits;

function renderStatuses(){ $('statusList').innerHTML=statuses.map(s=>`<div class="status-row"><span class="swatch" style="background:${safeColor(s.color)}"></span><input class="sname" data-id="${s.id}" value="${escAttr(s.name)}"><input class="scolor" data-id="${s.id}" type="color" value="${safeColor(s.color)}"><button class="small-btn" data-edit="${s.id}">Save</button><span class="unsaved-badge" data-unsaved-for="status-${s.id}">Unsaved</span><button class="small-btn danger" data-delete="${s.id}">Delete</button></div>`).join('') }
$('statusForm').onsubmit=async e=>{e.preventDefault();const name=$('statusName').value.trim(),color=$('statusColor').value;const {error}=await supabase.from('status_categories').insert({name,color,active:true,sort_order:statuses.length});if(error){toast(error.message);return}$('statusName').value='';await load();toast('Status added')}
$('statusList').onclick=async e=>{const edit=e.target.closest('[data-edit]');const del=e.target.closest('[data-delete]');if(edit){const id=Number(edit.dataset.edit),name=document.querySelector(`.sname[data-id="${id}"]`).value.trim(),color=document.querySelector(`.scolor[data-id="${id}"]`).value;const {error}=await supabase.from('status_categories').update({name,color}).eq('id',id);if(error)toast(error.message);else{const badge=edit.nextElementSibling; if(badge) badge.classList.remove('show'); await load();toast('Status updated')}} if(del){const id=Number(del.dataset.delete);const s=statuses.find(x=>x.id===id);if(!s)return;if(!confirm(`Delete "${s.name}"? Any units using it will automatically become Available.`))return;const {error}=await supabase.rpc('delete_plot_status',{p_status_id:id});if(error){toast(error.message);return}await load();toast('Status deleted; affected units set to Available')}}
let visitorSignature='';
async function loadVisitors(){
  const {data,error}=await supabase.from('visitors').select('*').order('created_at',{ascending:false});
  if(error){$('visitorRows').innerHTML=`<tr><td colspan="9">${esc(error.message)}</td></tr>`;updateBulkControls('visitors');return;}
  const rows=data||[];
  const signature=rows.map(v=>`${v.id}|${v.created_at}|${v.name||v.first_name||''}|${v.mobile||v.phone||''}|${v.email||''}|${v.city||''}`).join('||');
  if(signature===visitorSignature)return;
  const selected=new Set([...document.querySelectorAll('.visitor-check:checked')].map(x=>String(x.dataset.id)));
  visitorSignature=signature;
  $('visitorRows').innerHTML=rows.map(v=>`<tr><td class="check-col"><input type="checkbox" class="visitor-check" data-id="${escAttr(v.id)}" ${selected.has(String(v.id))?'checked':''}></td><td>${esc(v.name||`${v.first_name||''} ${v.last_name||''}`)}</td><td>${esc(v.mobile||v.phone||'')}</td><td>${esc(v.email||'')}</td><td>${esc(v.city||'')}</td><td>${v.created_at?new Date(v.created_at).toLocaleString():''}</td></tr>`).join('')||'<tr><td colspan="6">No visitors yet.</td></tr>';
  updateBulkControls('visitors');
  if(document.getElementById('visitors')?.classList.contains('active') && rows.length>0) toast('Visitor list updated');
}

let visitorRefreshTimer=null;
let visitorRefreshBusy=false;
async function refreshVisitorsLive(){
  if(visitorRefreshBusy)return;
  visitorRefreshBusy=true;
  try{
    await loadVisitors();
  }finally{
    visitorRefreshBusy=false;
  }
}
function startVisitorLiveRefresh(){
  if(visitorRefreshTimer)clearInterval(visitorRefreshTimer);
  visitorRefreshTimer=setInterval(refreshVisitorsLive,3000);
}

async function loadHoldRequests(){
  const {data,error}=await supabase.from('hold_requests').select('*').order('created_at',{ascending:false});
  if(error){$('holdRequestRows').innerHTML=`<tr><td colspan="10">${esc(error.message)}</td></tr>`;updateBulkControls('holdRequests');return;}
  window.__holdRequests=data||[];
  $('holdRequestRows').innerHTML=(data||[]).map(r=>`<tr><td class="check-col"><input type="checkbox" class="hold-check" data-id="${escAttr(r.id)}"></td><td>${esc(r.tower?`Tower ${r.tower}`:'')}</td><td>${r.floor?esc(String(r.floor).padStart(2,'0')):esc(r.floor_number||'')}</td><td>${r.unit?esc('Unit '+r.unit):esc(r.unit_number||'')}</td><td><strong>${esc(r.apartment_detail||'')}</strong></td><td>${esc(r.visitor_name||'')}</td><td>${esc(r.visitor_mobile||'')}</td><td>${esc(r.visitor_email||'')}</td><td><select class="hold-status" data-id="${r.id}"><option value="pending" ${r.status==='pending'?'selected':''}>Pending</option><option value="approved" ${r.status==='approved'?'selected':''}>Approved</option><option value="rejected" ${r.status==='rejected'?'selected':''}>Rejected</option></select></td><td>${r.created_at?new Date(r.created_at).toLocaleString():''}</td></tr>`).join('')||'<tr><td colspan="10">No hold requests yet.</td></tr>';
  $('selectAllHoldRequests').checked=false;updateBulkControls('holdRequests');
}

function updateBulkControls(type){
  const isVisitors=type==='visitors';
  const checks=[...document.querySelectorAll(isVisitors?'.visitor-check:checked':'.hold-check:checked')];
  const all=[...document.querySelectorAll(isVisitors?'.visitor-check':'.hold-check')];
  const btn=$(isVisitors?'deleteVisitors':'deleteHoldRequests');
  const selectAll=$(isVisitors?'selectAllVisitors':'selectAllHoldRequests');
  if(btn) btn.disabled=checks.length===0;
  if(selectAll){selectAll.checked=all.length>0 && checks.length===all.length;selectAll.indeterminate=checks.length>0 && checks.length<all.length;}
}

async function deleteSelected(type){
  const isVisitors=type==='visitors';
  const selector=isVisitors?'.visitor-check:checked':'.hold-check:checked';
  const ids=[...document.querySelectorAll(selector)].map(x=>x.dataset.id).filter(Boolean);
  if(!ids.length)return;
  const label=isVisitors?'visitor':'hold request';
  if(!confirm(`Delete ${ids.length} selected ${label}${ids.length===1?'':'s'}? This cannot be undone.`))return;
  const table=isVisitors?'visitors':'hold_requests';
  const {error}=await supabase.from(table).delete().in('id',ids);
  if(error){toast(error.message);return;}
  toast(`${ids.length} ${label}${ids.length===1?'':'s'} deleted`);
  if(isVisitors) await loadVisitors(); else await loadHoldRequests();
}

$('selectAllVisitors').onchange=()=>{document.querySelectorAll('.visitor-check').forEach(c=>c.checked=$('selectAllVisitors').checked);updateBulkControls('visitors')};
$('selectAllHoldRequests').onchange=()=>{document.querySelectorAll('.hold-check').forEach(c=>c.checked=$('selectAllHoldRequests').checked);updateBulkControls('holdRequests')};
$('visitorRows').onchange=e=>{if(e.target.classList.contains('visitor-check'))updateBulkControls('visitors')};
$('holdRequestRows').onchange=e=>{if(e.target.classList.contains('hold-check'))updateBulkControls('holdRequests')};
$('deleteVisitors').onclick=()=>deleteSelected('visitors');
$('deleteHoldRequests').onclick=()=>deleteSelected('holdRequests');

$('holdRequestRows').addEventListener('change',e=>{
  if(!e.target.matches('.hold-status'))return;
  const id=Number(e.target.dataset.id); const badge=document.querySelector(`[data-unsaved-for="hold-${id}"]`);
  const source=window.__holdRequests?.find(x=>Number(x.id)===id);
  if(badge && source) badge.classList.toggle('show',e.target.value!==source.status);
});

$('holdRequestRows').addEventListener('change',async e=>{if(!e.target.matches('.hold-status'))return;const id=Number(e.target.dataset.id);const {error}=await supabase.from('hold_requests').update({status:e.target.value,updated_at:new Date().toISOString()}).eq('id',id);if(error){toast(error.message);return;}toast('Hold request updated');});

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function escAttr(v){return esc(v)}
function safeColor(c){return /^#[0-9a-f]{6}$/i.test(c||'')?c:'#22c55e'}

window.addEventListener('beforeunload',e=>{
  if(unitDrafts.size>0){e.preventDefault();e.returnValue='You have unsaved apartment changes.';}
});

startVisitorLiveRefresh();
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(b.dataset.page).classList.add('active');
  if(b.dataset.page==='visitors')loadVisitors();
  if(b.dataset.page==='holdRequests')loadHoldRequests();
});
$('logout').onclick=async()=>{await supabase.auth.signOut();location.href='login.html'};
(async()=>{if(await guard())await load()})();
