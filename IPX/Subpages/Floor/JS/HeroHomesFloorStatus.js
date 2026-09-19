(function () {
  "use strict";
  const SUPABASE_URL = "https://lgsuzidpqnqgyqucrotx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_K587kfedNvRzY0t03KfAzQ_zVMjCcuS";
  const TOWER_BY_FILE = {
    "Tower-9.html":"9", "Tower-10.html":"10", "Tower-11.html":"11",
    "Tower-12.html":"12", "Tower-C-12-A.html":"12A"
  };
  const COLORS = {
    available:'#35C759', sold:'#FF3B30', hold:'#FFB000', blocked:'#8E8E93',
    reserved:'#AF52DE', booked:'#FF9500'
  };
  function tower(){ return TOWER_BY_FILE[location.pathname.split('/').pop()] || ''; }
  function floor(){
    const n=parseInt(new URLSearchParams(location.search).get('floor')||'',10);
    if(n>=1 && n<=32) return n;
    const s=parseInt(sessionStorage.getItem('selectedFloor')||'',10);
    return (s>=1&&s<=32)?s:1;
  }
  function color(status){
    const k=String(status||'Available').trim().toLowerCase();
    return COLORS[k] || '#8E8E93';
  }
  function paths(){
    return Array.from(document.querySelectorAll('.Cutout path')).filter(p=>{
      const id=(p.id||'').replace(/\s+/g,'').toLowerCase();
      return id==='appartment1' || id==='appartment2';
    });
  }
  async function load(){
    const t=tower(), f=floor(); if(!t)return;
    sessionStorage.setItem('selectedFloor',String(f));
    const url=SUPABASE_URL+'/rest/v1/apartment_status_public'
      +'?select=tower%2Cfloor%2Cunit%2Cstatus%2Cstatus_color'
      +'&tower=eq.'+encodeURIComponent(t)
      +'&floor=eq.'+encodeURIComponent(f)
      +'&order=unit.asc';
    try{
      const r=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},cache:'no-store'});
      if(!r.ok){ const body=await r.text(); throw new Error('Supabase '+r.status+': '+body); }
      const rows=await r.json();
      paths().forEach((p,i)=>{
        const row=rows.find(x=>Number(x.unit)===i+1);
        const status=row?.status||'Available';
        const c=row?.status_color||color(status);
        p.style.setProperty('--hh-status-color',c);
        p.style.setProperty('fill',c,'important');
        p.style.setProperty('stroke',c,'important');
        p.style.setProperty('fill-opacity','.42','important');
        p.style.setProperty('stroke-opacity','.95','important');
        p.dataset.hhStatus=status;
      });
    }catch(e){console.error('Hero Homes dynamic status error:',e);}
  }
  function start(){ load(); setInterval(load,3000); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
