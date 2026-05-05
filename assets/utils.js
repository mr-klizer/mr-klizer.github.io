'use strict';
// ══════════════════════════════════════════════════
// utils.js — общие функции, глобальное состояние,
// шапка, тема, настройки — используются всеми страницами
// ══════════════════════════════════════════════════

// ── Глобальные данные ──
window.CATALOG  = [];
window.PENDING  = [];
window.CURRENT_USER = null;

// ── Вспомогательные функции ──
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtSize(b){if(b<1024)return b+'B';if(b<1048576)return (b/1024).toFixed(1)+'KB';return (b/1048576).toFixed(1)+'MB';}
function plural(n,a,b,c){const m=n%10,h=n%100;if(m===1&&h!==11)return a;if(m>=2&&m<=4&&!(h>=12&&h<=14))return b;return c;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
function timeAgo(ts){
  if(!ts)return '';
  const d=Math.floor((Date.now()-(ts.seconds?ts.seconds*1000:new Date(ts).getTime()))/1000);
  if(d<60)return 'только что';if(d<3600)return Math.floor(d/60)+' мин. назад';
  if(d<86400)return Math.floor(d/3600)+' ч. назад';
  if(d<604800)return Math.floor(d/86400)+' дн. назад';
  const date=ts.seconds?new Date(ts.seconds*1000):new Date(ts);
  return date.toLocaleDateString('ru');
}
function avatarColor(s){const h=['#6c74ff','#c47aff','#39e07c','#ff9f43','#45e0c8','#ff5072','#ffd160'];let n=0;for(let i=0;i<s.length;i++)n=(n+s.charCodeAt(i))%h.length;return h[n];}
function showNotif(msg,type=''){
  const d=document.createElement('div');d.className='notif'+(type?' notif-'+type:'');
  const icon=type==='err'?'✕':type==='warn'?'⚠':'✓';
  const col=type==='err'?'var(--red)':type==='warn'?'var(--yel)':'var(--grn)';
  d.innerHTML=`<span style="color:${col};margin-right:8px">${icon}</span>${esc(msg)}`;
  document.body.appendChild(d);
  setTimeout(()=>{d.style.opacity='0';d.style.transition='opacity .3s';setTimeout(()=>d.remove(),320);},3500);
}
function downloadBlob(content,type,name){
  const b=content instanceof Blob?content:new Blob([content],{type});
  const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(u),1000);
}

// ── Пользователь ──
function curUser(){return window.CURRENT_USER;}
function isAdmin(){const u=curUser();return u&&(u.rank==='admin'||u.rank==='superadmin');}
function isSuperAdmin(){const u=curUser();return u&&u.rank==='superadmin';}
function isUserBlocked(u){
  if(!u||!u.blocked)return false;
  if(u.blockedUntil&&Date.now()>=(u.blockedUntil.seconds?u.blockedUntil.seconds*1000:u.blockedUntil)){return false;}
  return true;
}

// ── Тема ──
let currentTheme = localStorage.getItem('pycat_theme')||'dark';
function applyTheme(t){document.documentElement.setAttribute('data-theme',t==='dark'?'':t);currentTheme=t;localStorage.setItem('pycat_theme',t);}
applyTheme(currentTheme);

// ── Настройки сайта (Firestore) ──
let SITE_SETTINGS = {
  types:['Web-приложение','Бот','CLI-программа','Data Science','Библиотека'],
  tags:['fastapi','flask','telegram','discord','cli','pandas','asyncio','docker','api','bot','web','ml'],
  typeColors:{},
  pylauncher:{enabled:false,downloadUrl:'',version:'1.0.0'}
};
const typeClass={'Web-приложение':'tp-web','Бот':'tp-bot','Data Science':'tp-ds','CLI-программа':'tp-cli','Библиотека':'tp-lib'};
function getTypePillStyle(type){
  const col=SITE_SETTINGS.typeColors&&SITE_SETTINGS.typeColors[type];
  if(!col)return '';
  const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
  return `style="background:rgba(${r},${g},${b},.12);color:${col};border:1px solid rgba(${r},${g},${b},.3)"`;
}
async function loadSettings(){
  try{
    const snap=await FB.getDoc(FB.doc(FB.db,'settings','site'));
    if(snap.exists())SITE_SETTINGS={...SITE_SETTINGS,...snap.data()};
  }catch(e){}
}
async function saveSettings(){
  try{await FB.setDoc(FB.doc(FB.db,'settings','site'),SITE_SETTINGS);}catch(e){}
}

// ── GitHub Storage конфиг ──
window.GH_CONFIG = JSON.parse(localStorage.getItem('pycat_gh_config')||'{}');

// ── Навигация между страницами (теперь реальные URL) ──
function navigate(page){
  const map={
    catalog:'/',auth:'/auth/',profile:'/profile/',
    admin:'/admin/',support:'/support/',about:'/about/',
    myutils:'/profile/#myutils'
  };
  const url = map[page]||'/';
  window.location.href = url;
}
// Обратная совместимость — showPage теперь навигирует
function showPage(name){navigate(name);}

// ── Шапка (общая для всех страниц) ──
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 589 585" width="28" height="28"><g><path fill="#f9f9f9" d="M 78.5,11.5 C 102.405,29.473 128.072,44.973 155.5,58C 177.75,67.8057 200.75,75.3057 224.5,80.5C 177.847,127.653 131.014,174.653 84,221.5C 71.5426,167.922 48.376,119.589 14.5,76.5C 25.1504,44.1838 46.4837,22.5172 78.5,11.5 Z"/></g><g><path fill="#f9f9f9" d="M 508.5,11.5 C 541.494,21.6594 563.494,43.1594 574.5,76C 540.738,119.359 517.572,167.859 505,221.5C 457.986,174.653 411.153,127.653 364.5,80.5C 418.153,68.6686 466.153,45.6686 508.5,11.5 Z"/></g><g><path fill="#f7f7f7" d="M 357.5,217.5 C 377.404,215.256 395.737,219.422 412.5,230C 423.067,238.649 429.4,249.482 431.5,262.5C 421.575,265.148 411.575,267.481 401.5,269.5C 398.525,257.022 390.858,248.856 378.5,245C 353.398,241.46 337.898,251.96 332,276.5C 330.117,289.828 330.117,303.161 332,316.5C 339.089,346.124 356.923,355.957 385.5,346C 394.997,338.856 400.83,329.356 403,317.5C 412.674,321.002 422.507,324.002 432.5,326.5C 424.493,360.284 402.993,377.284 368,377.5C 330.819,374.657 308.152,354.99 300,318.5C 295.448,294.279 298.782,271.279 310,249.5C 321.376,232.228 337.209,221.561 357.5,217.5 Z"/></g><g><path fill="#f7f7f7" d="M 222.5,220.5 C 240.893,217.791 256.393,223.124 269,236.5C 278.381,250.212 281.048,265.212 277,281.5C 271.18,301.32 258.013,312.487 237.5,315C 222.19,316.208 206.857,316.708 191.5,316.5C 191.5,335.833 191.5,355.167 191.5,374.5C 181.167,374.5 170.833,374.5 160.5,374.5C 160.5,323.167 160.5,271.833 160.5,220.5C 181.167,220.5 201.833,220.5 222.5,220.5 Z"/></g><g><path fill="#f9f9f9" d="M 82.5,361.5 C 130.25,407.749 177.583,454.582 224.5,502C 170.739,514.634 122.239,537.801 79,571.5C 46.6328,560.633 25.1328,538.966 14.5,506.5C 48.6984,463.761 71.3651,415.427 82.5,361.5 Z"/></g><g><path fill="#f9f9f9" d="M 504.5,361.5 C 514.108,401.079 529.608,438.412 551,473.5C 558.848,484.677 566.681,495.844 574.5,507C 563.62,539.38 541.953,560.88 509.5,571.5C 466.591,537.549 418.257,514.549 364.5,502.5C 411.188,455.479 457.854,408.479 504.5,361.5 Z"/></g></svg>`;

const FOOTER_HTML = `<footer class="footer">
  <div style="display:flex;flex-direction:column;gap:6px">
    <div class="footer-logo">PyCatalog</div>
    <div style="font-size:12px;color:var(--text3)">Каталог Python-программ · Firebase + GitHub Storage</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:8px;border-top:1px solid var(--bd)">
      <div style="width:22px;height:22px;border-radius:6px;background:#0a0b14;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 586 586" width="16" height="16"><g><path fill="#f8f8f8" d="M 77.5,11.5 C 173.085,84.4835 279.085,104.65 395.5,72C 436.936,58.7054 474.436,38.5388 508,11.5C 519.91,15.3678 520.91,16.2011 521.5,17.5C 437.141,102.693 352.307,187.359 267,271.5C 189.373,194.873 112.04,117.873 35,40.5C 47.0473,26.0655 61.214,17.0655 77.5,11.5 Z"/></g><g><path fill="#f9f9f9" d="M 546.5,34.5 C 555,41.5 563.112,51.8857 573.5,76C 496.644,176.672 478.144,287.506 518,408.5C 531.635,444.123 550.135,476.79 573.5,506.5C 569.443,517.28 567,522.5C 482.32,437.986 397.82,353.32 313.5,268.5C 391.188,190.479 468.854,112.479 546.5,34.5 Z"/></g><g><path fill="#f9f9f9" d="M 19.5,60.5 C 104.479,144.812 189.146,229.479 273.5,314.5C 195.833,392.833 117.833,470.833 39.5,548.5C 18.5259,522.837 13.5,506.5C 87.3946,409.829 107.228,302.829 73,185.5C 59.3641,145.545 39.5308,109.212 13.5,76.5C 15.3104,71.0655 17.3104,65.7321 19.5,60.5 Z"/></g><g><path fill="#f9f9f9" d="M 315.5,311.5 C 394.084,388.583 472.25,466.25 550,544.5C 538.337,558.307 524.504,566.641 508.5,571.5C 407.818,494.923 297.152,476.423 176.5,516C 141.209,529.469 108.876,547.802 79.5,571C 67.8782,568.014 62.5,565C 147.035,480.632 231.368,396.132 315.5,311.5 Z"/></g></svg>
      </div>
      <div style="font-size:12px;color:var(--text3)">Разработан <strong style="color:var(--text2)">Klizer</strong></div>
    </div>
  </div>
  <div class="footer-links">
    <a href="/about/">О проекте</a>
    <a href="/" onclick="event.preventDefault();openSubmitModal()">Добавить программу</a>
    <a href="/support/">Поддержка</a>
    <a href="/admin/">Модерация</a>
  </div>
</footer>`;

function renderHeader(activePage=''){
  const pages=[
    {id:'catalog',label:'Каталог',href:'/'},
    {id:'about',label:'О проекте',href:'/about/'},
    {id:'submit',label:'Добавить программу',href:'#',onclick:'openSubmitModal()'},
    {id:'myutils',label:'Мои программы',href:'/profile/#myutils'},
    {id:'support',label:'Поддержка',href:'/support/'},
  ];
  const navLinks=pages.map(p=>{
    const isActive=p.id===activePage;
    const onclick=p.onclick?` onclick="event.preventDefault();${p.onclick}"`:'';
    return `<a href="${p.href}"${onclick} class="${isActive?'active':''}">${p.label}</a>`;
  }).join('');
  const headerEl=document.getElementById('site-header');
  if(!headerEl)return;
  headerEl.innerHTML=`
    <a class="logo" href="/">
      <div class="logo-mark"><div style="width:32px;height:32px;border-radius:10px;background:#0a0b14;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">${LOGO_SVG}</div></div>
      <div><div class="logo-name">PyCatalog</div></div>
    </a>
    <nav>${navLinks}</nav>
    <div class="header-right">
      <span id="header-count" style="font-size:12px;color:var(--text3);font-family:var(--mono)"></span>
      <div id="header-auth-area"></div>
    </div>`;
}

function renderHeaderAuth(){
  const u=curUser();const area=document.getElementById('header-auth-area');if(!area)return;
  const bb=document.getElementById('blocked-banner');
  if(u&&isUserBlocked(u)){
    if(!bb)renderBlockedBanner(u);
    const col=u.color||avatarColor(u.nick||u.email||'?');
    area.innerHTML=`<div style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:rgba(255,80,114,.1);border:1px solid rgba(255,80,114,.25)">
      <span class="material-symbols-rounded" style="font-size:15px;color:var(--red)">block</span>
      <span style="font-size:12px;font-weight:700;color:var(--red)">${esc(u.nick||u.email)}</span>
    </div>`;
    return;
  }
  if(bb)bb.remove();
  if(u){
    const col=u.color||avatarColor(u.nick||u.email||'?');
    area.innerHTML=`<div style="display:flex;gap:8px;align-items:center">
      ${isAdmin()?`<a href="/admin/" class="admin-nav-btn"><span class="material-symbols-rounded">admin_panel_settings</span>Админ</a>`:''}
      <a href="/profile/" class="user-menu-btn">
        <div class="user-avatar-sm" style="background:${col}">${esc((u.nick||u.email||'?').charAt(0).toUpperCase())}</div>
        <span>${esc(u.nick||u.email)}</span>
        <span class="material-symbols-rounded" style="font-size:14px;color:var(--text3)">expand_more</span>
      </a>
    </div>`;
  }else{
    area.innerHTML=`<a href="/auth/" class="btn-sm btn-primary"><span class="material-symbols-rounded">login</span>Войти</a>`;
  }
}

function renderBlockedBanner(u){
  const existing=document.getElementById('blocked-banner');if(existing)existing.remove();
  const until=u.blockedUntil?(u.blockedUntil.seconds?u.blockedUntil.seconds*1000:u.blockedUntil):null;
  const timeLeft=until?Math.ceil((until-Date.now())/60000):null;
  const banner=document.createElement('div');banner.id='blocked-banner';
  banner.innerHTML=`<div style="width:72px;height:72px;border-radius:20px;background:rgba(255,80,114,.15);border:2px solid rgba(255,80,114,.4);display:flex;align-items:center;justify-content:center"><span class="material-symbols-rounded" style="font-size:36px;color:var(--red)">block</span></div>
    <div style="text-align:center;max-width:440px;padding:0 20px">
      <div style="font-size:22px;font-weight:900;color:var(--text);margin-bottom:8px">Аккаунт заблокирован</div>
      <div style="font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:6px">Ваш аккаунт <strong style="color:var(--text)">${esc(u.nick||u.email)}</strong> заблокирован администратором.</div>
      ${u.blockedReason?`<div style="font-size:13px;background:rgba(255,80,114,.08);border:1px solid rgba(255,80,114,.2);border-radius:8px;padding:10px 14px;color:var(--text2);margin-bottom:12px"><strong style="color:var(--red)">Причина:</strong> ${esc(u.blockedReason)}</div>`:''}
      <div style="font-size:13px;color:var(--text3)">${timeLeft?`Осталось: <strong style="color:var(--yel);font-family:var(--mono)">${timeLeft} мин.</strong>`:'Блокировка постоянная.'}</div>
    </div>
    <button onclick="forceLogout()" style="padding:10px 20px;border-radius:8px;background:rgba(255,80,114,.1);border:1px solid rgba(255,80,114,.3);color:var(--red);cursor:pointer;font-size:13px;font-weight:600"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle">logout</span> Выйти</button>`;
  document.body.appendChild(banner);
}
function forceLogout(){FB.signOut(FB.auth).catch(()=>{});const b=document.getElementById('blocked-banner');if(b)b.remove();window.location.href='/';}

// Подставляем футер если есть контейнер
document.addEventListener('DOMContentLoaded',()=>{
  const f=document.getElementById('site-footer');
  if(f)f.innerHTML=FOOTER_HTML.replace('<footer class="footer">','').replace('</footer>','');
  const savedGH=localStorage.getItem('pycat_gh_config');
  if(savedGH){try{window.GH_CONFIG=JSON.parse(savedGH);}catch(e){}}
});
