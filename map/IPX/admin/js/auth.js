import { supabase } from './supabase.js';
const $=id=>document.getElementById(id);
function show(msg,err=false){const el=$('authMsg');if(el){el.textContent=msg;el.className=err?'error':'';}}
$('loginForm').onsubmit=async e=>{e.preventDefault();show('Signing in...');const {data,error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){show(error.message,true);return} location.href='index.html'};
const registerForm=$('registerForm');
if(registerForm){registerForm.onsubmit=async e=>{e.preventDefault();show('Creating user...');const email=$('regEmail').value.trim();const password=$('regPassword').value;const {error}=await supabase.auth.signUp({email,password});if(error){show(error.message,true);return}show('User created. You can now log in.');registerForm.reset();};}
const showRegister=$('showRegister');
if(showRegister) showRegister.onclick=()=>{ $('loginView').style.display='none'; $('registerView').style.display='block'; };
const backLogin=$('backLogin');
if(backLogin) backLogin.onclick=()=>{ $('registerView').style.display='none'; $('loginView').style.display='block'; };
