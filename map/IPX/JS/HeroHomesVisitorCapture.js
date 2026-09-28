/* Hero Homes — enquiry form -> Supabase visitors (one submission per browser) */
(() => {
'use strict';
const URL='https://lgsuzidpqnqgyqucrotx.supabase.co';
const KEY='sb_publishable_K587kfedNvRzY0t03KfAzQ_zVMjCcuS';
const STORAGE='heroHomesVisitor';
const saved=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'null')}catch(e){return null}};
function headers(){return {'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${KEY}`,'Prefer':'return=minimal'}}
async function submitVisitor(data){const r=await fetch(`${URL}/rest/v1/visitors`,{method:'POST',headers:headers(),body:JSON.stringify(data)});if(!r.ok){let m=`Supabase ${r.status}`;try{const e=await r.json();m=e.message||e.details||m}catch(_){}throw new Error(m)}}
function init(){
 const form=document.getElementById('enquiryForm'), overlay=document.getElementById('enquiryOverlay');
 if(!form)return;
 form.addEventListener('submit',async e=>{
   e.preventDefault();e.stopImmediatePropagation();
   const fullName=(form.elements.fullName?.value||'').trim();
   const mobile=(form.elements.phone?.value||'').replace(/\D/g,'');
   const email=(form.elements.email?.value||'').trim();
   const city=(form.elements.city?.value||'').trim();
   const preferredTime=(form.elements.preferredTime?.value||'').trim();
   if(!fullName||mobile.length!==10||!email||!city||!preferredTime){
      alert('Please fill all required fields correctly.');return;
   }
   if(saved()){
      if(overlay){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true')}
      return;
   }
   const btn=form.querySelector('button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Submitting...'}
   try{
      await submitVisitor({name:fullName,first_name:fullName.split(/\s+/)[0],last_name:fullName.split(/\s+/).slice(1).join(' '),mobile,phone:mobile,dial_code:form.elements.dialCode?.value||'+91',email,city,preferred_time:preferredTime,source_page:location.href});
      sessionStorage.setItem(STORAGE,JSON.stringify({fullName,mobile,email,city,submittedAt:new Date().toISOString()}));
      form.reset();
      if(overlay){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true')}
      alert('Thank you! Your details have been submitted.');
   }catch(err){console.error('Hero Homes visitor capture:',err);alert('Could not submit your details: '+err.message)}
   finally{if(btn){btn.disabled=false;btn.textContent='Request a Call Back'}}
 },true);
 if(saved() && overlay){/* keep form usable but do not force it open */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();