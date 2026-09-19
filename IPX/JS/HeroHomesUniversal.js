/* HERO HOMES — visitor gate + shared apartment context
   Works on Tower A/B/C, floor plans and apartment 360 pages.
*/
(function(){
  'use strict';
  const SUPABASE_URL='https://lgsuzidpqnqgyqucrotx.supabase.co';
  const SUPABASE_KEY='sb_publishable_K587kfedNvRzY0t03KfAzQ_zVMjCcuS';
  const VISITOR_KEY='heroHomesVisitor';

  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const saved=()=>{try{return JSON.parse(sessionStorage.getItem(VISITOR_KEY)||'null')}catch(_){return null}};
  const save=v=>{sessionStorage.setItem(VISITOR_KEY,JSON.stringify(v));window.HeroHomesVisitor=v};
  const context=()=>{
    const p=new URLSearchParams(location.search);
    const tower=p.get('tower')||sessionStorage.getItem('selectedTower')||sessionStorage.getItem('heroHomesTower')||'';
    const floorRaw=p.get('floor')||sessionStorage.getItem('selectedFloor')||sessionStorage.getItem('heroHomesFloor')||'';
    const unitRaw=p.get('unit')||sessionStorage.getItem('selectedUnit')||'';
    const floor=Number(floorRaw);
    const unit=Number(unitRaw);
    return {tower:String(tower||'').trim(),floor:(floor>=1&&floor<=32)?floor:null,unit:[1,2].includes(unit)?unit:null};
  };
  const headers=()=>({'Content-Type':'application/json','apikey':SUPABASE_KEY,'Prefer':'return=minimal'});
  async function post(table,payload){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:headers(),body:JSON.stringify(payload)});
    if(!r.ok){let m=`Supabase ${r.status}`;try{const x=await r.json();m=x.message||x.details||m}catch(_){}throw new Error(m)}
    return r.json();
  }

  function style(){
    if(document.getElementById('hhUniversalStyles'))return;
    const s=document.createElement('style');s.id='hhUniversalStyles';s.textContent=`
      #hhVisitorGate{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.68);backdrop-filter:blur(14px);font-family:Arial,sans-serif}
      #hhVisitorGate.open{display:flex}
      #hhVisitorGate .card{width:min(470px,100%);background:#1E302B;color:#F5F2EA;border:1px solid rgba(232,227,217,.4);border-radius:18px;padding:28px;box-shadow:0 25px 90px rgba(0,0,0,.55)}
      #hhVisitorGate h2{margin:0 0 8px;font-size:25px}.hh-sub{margin:0 0 22px;color:#D8D3C9;font-size:13px;line-height:1.5}
      #hhVisitorGate label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 6px;color:#D8D3C9}
      #hhVisitorGate input{width:100%;box-sizing:border-box;height:44px;padding:0 13px;border-radius:9px;border:1px solid rgba(175,169,158,.55);background:rgba(255,255,255,.06);color:#fff;outline:none}
      #hhVisitorGate input:focus{border-color:#E8E3D9;box-shadow:0 0 0 3px rgba(232,227,217,.08)}
      #hhVisitorGate button{width:100%;height:46px;margin-top:18px;border:0;border-radius:10px;background:#E8E3D9;color:#1E302B;font-weight:700;cursor:pointer}
      #hhVisitorGate .msg{min-height:18px;margin-top:10px;font-size:12px;color:#ffb4aa}
      #hhHoldConfirm{position:fixed;inset:0;z-index:2147483645;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.65);backdrop-filter:blur(10px);font-family:Arial,sans-serif}
      #hhHoldConfirm.open{display:flex}#hhHoldConfirm .card{width:min(460px,100%);background:#1E302B;color:#fff;border:1px solid #AFA99E;border-radius:18px;padding:26px;box-shadow:0 25px 90px rgba(0,0,0,.55)}
      #hhHoldConfirm h2{margin:0 0 10px}.hh-detail{padding:14px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.06);margin:14px 0 20px}.hh-actions{display:flex;gap:10px}.hh-actions button{flex:1;height:44px;border:0;border-radius:10px;font-weight:700;cursor:pointer}.hh-no{background:#343d45;color:#fff}.hh-yes{background:#E8E3D9;color:#1E302B}
    `;document.head.appendChild(s);
  }

  function ensureVisitorGate(){
    style();
    let gate=document.getElementById('hhVisitorGate');
    if(!gate){
      gate=document.createElement('div');gate.id='hhVisitorGate';gate.innerHTML=`<div class="card"><h2>Request Details</h2><p class="hh-sub">Please enter your details to continue to Hero Homes.</p><form id="hhVisitorForm"><label>Full Name *</label><input id="hhVName" required autocomplete="name"><label>Mobile Number *</label><input id="hhVMobile" required inputmode="numeric" maxlength="10" autocomplete="tel"><label>Email <span style="font-weight:400;opacity:.75">(optional)</span></label><input id="hhVEmail" type="email" autocomplete="email"><label>City *</label><input id="hhVCity" required autocomplete="address-level2"><div class="msg" id="hhVMsg"></div><button type="submit">Continue</button></form></div>`;
      document.body.appendChild(gate);
      gate.querySelector('#hhVisitorForm').addEventListener('submit',async e=>{
        e.preventDefault();
        const name=gate.querySelector('#hhVName').value.trim(),mobile=gate.querySelector('#hhVMobile').value.trim(),email=gate.querySelector('#hhVEmail').value.trim(),city=gate.querySelector('#hhVCity').value.trim(),msg=gate.querySelector('#hhVMsg'),btn=gate.querySelector('button');
        if(!name||!/^\d{10}$/.test(mobile)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!city){msg.textContent='Please enter valid details in all fields.';return}
        btn.disabled=true;btn.textContent='Submitting...';
        const c=context();
        try{
          await post('visitors',{name,first_name:name.split(/\s+/)[0]||name,last_name:name.split(/\s+/).slice(1).join(' '),mobile,phone:mobile,dial_code:'+91',email,city,tower:c.tower||null,floor:c.floor||null,unit:c.unit||null,source_page:location.href});
          save({fullName:name,mobile,email,city,tower:c.tower||null,floor:c.floor||null,unit:c.unit||null,submittedAt:new Date().toISOString()});
          gate.classList.remove('open');document.body.style.overflow='';
        }catch(err){console.error('Hero Homes visitor submit:',err);msg.textContent='Could not submit: '+err.message;}
        finally{btn.disabled=false;btn.textContent='Continue'}
      });
    }
    return gate;
  }

  function showGate(){const gate=ensureVisitorGate();const v=saved();if(v){gate.classList.remove('open');return false}gate.classList.add('open');document.body.style.overflow='hidden';return true}

  function setContext(tower,floor,unit){
    if(tower) {sessionStorage.setItem('selectedTower',String(tower));sessionStorage.setItem('heroHomesTower',String(tower));}
    if(floor) {sessionStorage.setItem('selectedFloor',String(floor));sessionStorage.setItem('heroHomesFloor',String(floor));}
    if(unit) sessionStorage.setItem('selectedUnit',String(unit));
  }

  // Tower overview pages: derive real tower/floor from SVG data-name and route correctly.
  function wireTowerOverview(){
    const file=location.pathname.split('/').pop(); if(!/^Tower_[ABC]\.html$/i.test(file))return;
    document.addEventListener('click',e=>{
      const path=e.target.closest?.('.Cutout path[data-link][data-name]'); if(!path)return;
      const name=path.getAttribute('data-name')||'';
      const m=name.match(/^(9|10|11|12A|12)?_?Floor_(\d+)$/i); if(!m)return;
      let tower=(m[1]||'11').toUpperCase(); if(tower==='12A')tower='12A';
      const floor=Number(m[2]);
      const target=path.getAttribute('data-link'); if(!target)return;
      e.preventDefault();e.stopImmediatePropagation();
      setContext(tower,floor,null);
      const u=new URL(target,location.href);u.searchParams.set('tower',tower);u.searchParams.set('floor',String(floor));
      location.href=u.href;
    },true);
  }

  function wireFloorApartmentNavigation(){
    if(!/\/Floor\//i.test(location.pathname))return;
    const file=location.pathname.split('/').pop();
    const tower=({'Tower-9.html':'9','Tower-10.html':'10','Tower-11.html':'11','Tower-12.html':'12','Tower-C-12-A.html':'12A'})[file]||'';
    const p=new URLSearchParams(location.search);const floor=Number(p.get('floor')||sessionStorage.getItem('selectedFloor')||1);
    document.addEventListener('click',e=>{
      const path=e.target.closest?.('.Cutout path[data-link]');if(!path)return;
      const id=(path.id||'').replace(/[^a-z0-9]/gi,'').toLowerCase();let unit=null;
      if(id==='appartment1')unit=1;if(id==='appartment2')unit=2;if(!unit)return;
      const target=path.getAttribute('data-link');if(!target)return;
      e.preventDefault();e.stopImmediatePropagation();
      setContext(tower,floor,unit);
      const u=new URL(target,location.href);u.searchParams.set('tower',tower);u.searchParams.set('floor',String(floor));u.searchParams.set('unit',String(unit));
      location.href=u.href;
    },true);
  }

  function wireTypicalHold(){
    const btn=document.getElementById('holdRequestBtn');if(!btn)return;
    style();
    btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();
      if(!saved()){showGate();return;}
      const c=context();
      let modal=document.getElementById('hhHoldConfirm');
      if(!modal){modal=document.createElement('div');modal.id='hhHoldConfirm';modal.innerHTML=`<div class="card"><h2>Request to Hold</h2><p>Want to request this apartment?</p><div class="hh-detail" id="hhHoldDetail"></div><div class="hh-actions"><button class="hh-no" id="hhHoldNo">No</button><button class="hh-yes" id="hhHoldYes">Yes, Request to Hold</button></div><div id="hhHoldMsg" style="margin-top:12px;font-size:12px"></div></div>`;document.body.appendChild(modal);
        modal.querySelector('#hhHoldNo').onclick=()=>modal.classList.remove('open');
        modal.querySelector('#hhHoldYes').onclick=async()=>{const v=saved(),m=modal.querySelector('#hhHoldMsg'),yes=modal.querySelector('#hhHoldYes');if(!c.tower||!c.floor||![1,2].includes(c.unit)){m.textContent='Apartment details are missing. Please open the apartment from its floor plan.';return}yes.disabled=true;yes.textContent='Submitting...';const detail=`Tower ${c.tower} • Floor ${String(c.floor).padStart(2,'0')} • Unit ${c.unit}`;try{await post('hold_requests',{tower:c.tower,floor:c.floor,unit:c.unit,apartment_detail:detail,unit_number:`${c.tower}-${c.floor}-${c.unit}`,property_name:'Hero Homes',source_type:'hero_homes',floor_number:String(c.floor),visitor_name:v.fullName,visitor_mobile:v.mobile,visitor_email:v.email,visitor_city:v.city,status:'pending'});m.textContent='✓ Hold request submitted successfully.';setTimeout(()=>modal.classList.remove('open'),900)}catch(err){console.error('Hero Homes hold request:',err);m.textContent='Could not submit: '+err.message}finally{yes.disabled=false;yes.textContent='Yes, Request to Hold'}};
      }
      const detail=modal.querySelector('#hhHoldDetail');detail.textContent=(c.tower&&c.floor&&c.unit)?`Tower ${c.tower} • Floor ${String(c.floor).padStart(2,'0')} • Unit ${c.unit}`:'Apartment details missing';modal.querySelector('#hhHoldMsg').textContent='';modal.classList.add('open');
    },true);
  }

  function init(){
    window.HeroHomesContext=context;window.HeroHomesVisitor=saved();window.HeroHomesInsert=(t,p)=>post(t,p);window.HeroHomesGetSavedLead=saved;
    const file=location.pathname.split('/').pop();
    const isTower=/^Tower_[ABC]\.html$/i.test(file);
    const isTypical=/Typical\.html$/i.test(file);
    if(isTower||isTypical){
      const v=saved(); if(!v) showGate();
    }
    wireTowerOverview();wireFloorApartmentNavigation();wireTypicalHold();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
