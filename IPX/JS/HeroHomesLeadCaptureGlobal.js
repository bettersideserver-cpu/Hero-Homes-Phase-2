/* HERO HOMES — REQUIRED VISITOR GATE + HOLD REQUESTS */
(function(){
  'use strict';
  const SUPABASE_URL='https://lgsuzidpqnqgyqucrotx.supabase.co';
  const SUPABASE_KEY='sb_publishable_K587kfedNvRzY0t03KfAzQ_zVMjCcuS';
  const VISITOR_KEY='heroHomesVisitor';

  const saved=()=>{try{return JSON.parse(sessionStorage.getItem(VISITOR_KEY)||'null')}catch(e){return null}};
  const save=v=>{sessionStorage.setItem(VISITOR_KEY,JSON.stringify(v));window.HeroHomesVisitor=v};
  const params=new URLSearchParams(location.search);
  const context=()=>({
    tower:params.get('tower')||sessionStorage.getItem('heroHomesTower')||sessionStorage.getItem('selectedTower')||'',
    floor:parseInt(params.get('floor')||sessionStorage.getItem('heroHomesFloor')||sessionStorage.getItem('selectedFloor')||'',10)||null,
    unit:parseInt(params.get('unit')||sessionStorage.getItem('heroHomesUnit')||sessionStorage.getItem('selectedUnit')||'',10)||null
  });
  const headers=()=>({
    'Content-Type':'application/json',
    'apikey':SUPABASE_KEY,
    'Authorization':'Bearer '+SUPABASE_KEY,
    'Prefer':'return=minimal'
  });
  async function post(table,payload){
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+table,{method:'POST',headers:headers(),body:JSON.stringify(payload)});
    if(!r.ok){let m='Supabase '+r.status;try{const x=await r.json();m=x.message||x.details||x.hint||m}catch(e){}throw new Error(m)}
    return true;
  }

  function addStyles(){
    if(document.getElementById('hhRequiredGateStyles'))return;
    const s=document.createElement('style');s.id='hhRequiredGateStyles';s.textContent=`
    #hhRequiredVisitorGate{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(16px);font-family:Arial,sans-serif}

#hhRequiredVisitorGate.open{display:flex}

#hhRequiredVisitorGate .hh-card{width:min(520px,100%);box-sizing:border-box;background:#ffffff;color:#292929;border:1px solid rgba(181,18,27,.35);border-radius:18px;padding:30px;box-shadow:0 30px 100px rgba(0,0,0,.65)}

#hhRequiredVisitorGate h2{margin:0 0 8px;font-size:28px}.hh-copy{margin:0 0 24px;color:#666666;font-size:13px;line-height:1.5}

#hhRequiredVisitorGate label{display:block;margin:14px 0 7px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#555555}

#hhRequiredVisitorGate input{display:block;width:100%;height:46px;box-sizing:border-box;padding:0 14px;border-radius:10px;border:1px solid #d6d6d6;background:#ffffff;color:#292929;font-size:14px;outline:none}

#hhRequiredVisitorGate input:focus{border-color:#b5121b;box-shadow:0 0 0 3px rgba(181,18,27,.1)}

#hhRequiredVisitorGate button{width:100%;height:48px;margin-top:20px;border:0;border-radius:10px;background:#b5121b;color:#ffffff;font-weight:700;cursor:pointer}

#hhRequiredVisitorGate button:disabled{opacity:.6;cursor:wait}.hh-error{min-height:18px;margin-top:10px;color:#b5121b;font-size:12px}

#hhHoldConfirm{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.68);backdrop-filter:blur(12px);font-family:Arial,sans-serif}

#hhHoldConfirm.open{display:flex}#hhHoldConfirm .hh-hold-card{width:min(460px,100%);box-sizing:border-box;background:#ffffff;color:#292929;border:1px solid rgba(181,18,27,.3);border-radius:18px;padding:26px;box-shadow:0 25px 90px rgba(0,0,0,.55)}

.hh-detail{padding:14px;border:1px solid rgba(181,18,27,.2);border-radius:12px;background:rgba(181,18,27,.04);margin:16px 0 20px}.hh-actions{display:flex;gap:10px}.hh-actions button{flex:1;height:44px;border:0;border-radius:10px;font-weight:700;cursor:pointer}.hh-no{background:#eeeeee;color:#292929}.hh-yes{background:#b5121b;color:#ffffff}
    `;document.head.appendChild(s);
  }

  function hideOldForms(){
    ['newLeadFormOverlay','newLeadCaptureForm','hhVisitorOverlay','hhVisitorGate'].forEach(id=>{
      const el=document.getElementById(id); if(el) { if(id==='newLeadFormOverlay') {el.classList.remove('active','open');el.style.display='none'} else if(id!=='hhRequiredVisitorGate') el.style.display='none'; }
    });
  }

  function ensureGate(){
    addStyles();
    let g=document.getElementById('hhRequiredVisitorGate');
    if(g)return g;
    g=document.createElement('div');g.id='hhRequiredVisitorGate';
    g.innerHTML=`<div class="hh-card"><h2>Request Details</h2><p class="hh-copy">Please enter your details to continue to Hero Homes.</p><form id="hhRequiredVisitorForm" novalidate><label>Full Name *</label><input id="hhReqName" required autocomplete="name"><label>Phone Number *</label><input id="hhReqPhone" required inputmode="numeric" maxlength="10" autocomplete="tel"><label>Email <span style="font-weight:400;opacity:.75">(optional)</span></label><input id="hhReqEmail" type="email" autocomplete="email"><label>City *</label><input id="hhReqCity" required autocomplete="address-level2"><div class="hh-error" id="hhReqError"></div><button id="hhReqSubmit" type="submit">Continue</button></form></div>`;
    document.body.appendChild(g);
    g.querySelector('#hhRequiredVisitorForm').addEventListener('submit',async function(e){
      e.preventDefault();
      const name=g.querySelector('#hhReqName').value.trim(), phone=g.querySelector('#hhReqPhone').value.replace(/\D/g,''), email=g.querySelector('#hhReqEmail').value.trim(), city=g.querySelector('#hhReqCity').value.trim();
      const err=g.querySelector('#hhReqError'), btn=g.querySelector('#hhReqSubmit'), c=context(); err.textContent='';
      if(!name||!city||!/^[0-9]{10}$/.test(phone)){err.textContent='Please enter your name, valid 10-digit phone number and city.';return}
      if(email && !/^\S+@\S+\.\S+$/.test(email)){err.textContent='Please enter a valid email address.';return}
      btn.disabled=true;btn.textContent='Submitting...';
      try{
        await post('visitors',{name,first_name:name.split(/\s+/)[0]||name,last_name:name.split(/\s+/).slice(1).join(' '),mobile:phone,phone:phone,dial_code:'+91',email:email||'',city,source_page:location.href});
        save({fullName:name,mobile:phone,email,city,submittedAt:new Date().toISOString()});
        g.classList.remove('open');document.body.style.overflow='';
      }catch(ex){console.error('Hero Homes visitor submit:',ex);err.textContent='Could not submit: '+ex.message}
      finally{btn.disabled=false;btn.textContent='Continue'}
    });
    return g;
  }

  function showGate(){
    hideOldForms();
    if(saved())return;
    const g=ensureGate();g.classList.add('open');document.body.style.overflow='hidden';
  }

  function setContext(tower,floor,unit){
    if(tower){sessionStorage.setItem('heroHomesTower',String(tower));sessionStorage.setItem('selectedTower',String(tower))}
    if(floor){sessionStorage.setItem('heroHomesFloor',String(floor));sessionStorage.setItem('selectedFloor',String(floor))}
    if(unit){sessionStorage.setItem('heroHomesUnit',String(unit));sessionStorage.setItem('selectedUnit',String(unit))}
  }

  function wireTowerFloorLinks(){
    if(!/^Tower_[ABC]\.html$/i.test(location.pathname.split('/').pop()||''))return;
    document.addEventListener('click',function(e){
      const path=e.target.closest&&e.target.closest('path[data-link]'); if(!path)return;
      const name=path.getAttribute('data-name')||''; const m=name.match(/^(9|10|11|12A)_Floor_(\d+)$/i); if(!m)return;
      const target=path.getAttribute('data-link');if(!target)return;
      e.preventDefault();e.stopImmediatePropagation();
      setContext(m[1].toUpperCase(),Number(m[2]),null);
      const u=new URL(target,location.href);u.searchParams.set('tower',m[1].toUpperCase());u.searchParams.set('floor',m[2]);location.href=u.href;
    },true);
  }

  function wireHold(){
    const btn=document.getElementById('holdRequestBtn');if(!btn)return;
    addStyles();
    btn.addEventListener('click',async function(e){
      e.preventDefault();e.stopImmediatePropagation();
      if(!saved()){showGate();return}
      const c=context(); let modal=document.getElementById('hhHoldConfirm');
      if(!modal){modal=document.createElement('div');modal.id='hhHoldConfirm';modal.innerHTML=`<div class="hh-hold-card"><h2>Request to Hold</h2><p>Want to request this apartment?</p><div class="hh-detail" id="hhHoldDetail"></div><div class="hh-actions"><button class="hh-no" id="hhHoldNo">No</button><button class="hh-yes" id="hhHoldYes">Yes, Request to Hold</button></div><div id="hhHoldMsg" style="margin-top:12px;font-size:12px"></div></div>`;document.body.appendChild(modal);modal.querySelector('#hhHoldNo').onclick=()=>modal.classList.remove('open');}
      const detail=modal.querySelector('#hhHoldDetail');detail.textContent=(c.tower&&c.floor&&c.unit)?`Tower ${c.tower} • Floor ${String(c.floor).padStart(2,'0')} • Unit ${c.unit}`:'Apartment details missing';modal.querySelector('#hhHoldMsg').textContent='';modal.classList.add('open');
      modal.querySelector('#hhHoldYes').onclick=async()=>{const v=saved(),m=modal.querySelector('#hhHoldMsg'),yes=modal.querySelector('#hhHoldYes');if(!c.tower||!c.floor||![1,2].includes(c.unit)){m.textContent='Apartment details are missing.';return}yes.disabled=true;yes.textContent='Submitting...';try{await post('hold_requests',{visitor_name:v.fullName,visitor_mobile:v.mobile,visitor_email:v.email||'',visitor_city:v.city,tower:c.tower,floor:c.floor,unit:c.unit,apartment_detail:`Tower ${c.tower} • Floor ${String(c.floor).padStart(2,'0')} • Unit ${c.unit}`,status:'pending'});m.textContent='✓ Hold request submitted successfully.';setTimeout(()=>modal.classList.remove('open'),900)}catch(ex){console.error('Hero Homes hold request:',ex);m.textContent='Could not submit: '+ex.message}finally{yes.disabled=false;yes.textContent='Yes, Request to Hold'}};
    },true);
  }

  function init(){
    window.HeroHomesVisitor=saved();window.HeroHomesContext=context;window.HeroHomesGetSavedLead=saved;window.HeroHomesResetVisitor=()=>{sessionStorage.removeItem(VISITOR_KEY);location.reload()};
    const file=location.pathname.split('/').pop()||'';
    const isTower=/^Tower_[ABC]\.html$/i.test(file);
    if(isTower && !saved())showGate();
    wireTowerFloorLinks();wireHold();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
