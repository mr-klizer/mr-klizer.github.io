'use strict';
// auth.js — страница входа / регистрации / восстановления пароля

// ══════════════════════════════════════════════════
function renderHeaderAuth(){
  const u=curUser();const area=document.getElementById('header-auth-area');if(!area)return;
  // Remove block banner if any
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
      ${isAdmin()?`<button class="admin-nav-btn" onclick="showPage('admin')"><span class="material-symbols-rounded">admin_panel_settings</span>Админ</button>`:''}
      <button class="user-menu-btn" onclick="showPage('profile')">
        <div class="user-avatar-sm" style="background:${col}">${esc((u.nick||u.email||'?').charAt(0).toUpperCase())}</div>
        <span>${esc(u.nick||u.email)}</span>
        <span class="material-symbols-rounded" style="font-size:14px;color:var(--text3)">expand_more</span>
      </button>
    </div>`;
    // Start pending listener if admin
    if(isAdmin()&&!pendingUnsubscribe){
      pendingUnsubscribe=window.startPendingListener();
    }
  }else{
    area.innerHTML=`<button class="btn-sm btn-primary" onclick="showPage('auth')"><span class="material-symbols-rounded">login</span>Войти</button>`;
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
    <button onclick="forceLogout()" style="padding:10px 20px;border-radius:8px;background:rgba(255,80,114,.1);border:1px solid rgba(255,80,114,.3);color:var(--red);cursor:pointer;font-size:13px;font-weight:600"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle">logout</span> Выйти из аккаунта</button>`;
  document.body.appendChild(banner);
}
function forceLogout(){FB.signOut(FB.auth).catch(()=>{});const b=document.getElementById('blocked-banner');if(b)b.remove();}

function clearAuthErr(){document.querySelectorAll('.form-error').forEach(e=>e.style.display='none');document.querySelectorAll('#page-auth .form-input').forEach(e=>e.classList.remove('error'));}
function showAuthErr(msg,fieldId){
  clearAuthErr();
  ['auth-err','auth-err-reg'].forEach(id=>{const e=document.getElementById(id);if(e&&e.offsetParent!==null){e.textContent=msg;e.style.display='block';}});
  if(fieldId){const f=document.getElementById(fieldId);if(f){f.classList.add('error');f.focus();}}
}
function switchAuthForm(form){
  document.getElementById('auth-form-login').style.display=form==='login'?'block':'none';
  document.getElementById('auth-form-register').style.display=form==='register'?'block':'none';
  document.getElementById('auth-form-recover').style.display=form==='recover'?'block':'none';
  document.getElementById('auth-card-title').textContent=form==='login'?'Вход':form==='register'?'Регистрация':'Восстановление';
  document.getElementById('auth-card-sub').textContent=form==='login'?'Войдите чтобы добавлять программы':form==='register'?'Создайте аккаунт':'Восстановите доступ к аккаунту';
  clearAuthErr();
  const cb=document.getElementById('reg-terms');if(cb&&form!=='register'){cb.checked=false;syncTermsBox();}
}
function showRecover(){switchAuthForm('recover');}
function syncTermsBox(){
  const cb=document.getElementById('reg-terms');const box=document.getElementById('reg-terms-box');if(!cb||!box)return;
  if(cb.checked){box.style.background='var(--acc)';box.style.borderColor='var(--acc)';box.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="11" height="11"><polyline points="2,7 5.5,11 12,3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
  else{box.style.background='var(--bg3)';box.style.borderColor='var(--bd2)';box.innerHTML='';}
}
document.addEventListener('change',e=>{if(e.target.id==='reg-terms')syncTermsBox();});

async function doLogin(){
  const email=document.getElementById('li-email').value.trim();
  const pass=document.getElementById('li-pass').value;
  if(!email){showAuthErr('Введите email','li-email');return;}
  if(!pass){showAuthErr('Введите пароль','li-pass');return;}
  try{
    const loginCred=await FB.signInWithEmailAndPassword(FB.auth,email,pass);
    // Сразу загружаем профиль из Firestore не дожидаясь onAuthStateChanged
    await loadUserProfile(loginCred.user);
    renderHeaderAuth();
    showPage('catalog');
    showNotif(`Добро пожаловать, ${window.CURRENT_USER.nick||window.CURRENT_USER.email}!`);
  }catch(e){
    const errMap={
      'auth/user-not-found':'Пользователь с таким email не найден',
      'auth/wrong-password':'Неверный пароль',
      'auth/invalid-email':'Некорректный email',
      'auth/too-many-requests':'Слишком много попыток. Попробуйте позже.',
      'auth/invalid-credential':'Неверный email или пароль',
      'auth/network-request-failed':'Ошибка сети. Проверьте интернет-соединение.',
      'auth/api-key-not-valid':'Неверный API ключ Firebase. Проверьте конфигурацию.',
    };
    const msg=errMap[e.code]||`Ошибка (${e.code}): ${e.message}`;
    showAuthErr(msg,'li-email');
  }
}
async function doRegister(){
  const termsEl=document.getElementById('reg-terms');
  if(!termsEl||!termsEl.checked){showAuthErr('Необходимо принять правила сообщества');const box=document.getElementById('reg-terms-box');if(box){box.style.borderColor='var(--red)';setTimeout(()=>{box.style.borderColor='var(--bd2)';},2000);}return;}
  const login=document.getElementById('reg-login').value.trim();
  const nick=document.getElementById('reg-nick').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const pass=document.getElementById('reg-pass').value;
  const pass2=document.getElementById('reg-pass2').value;
  if(!login){showAuthErr('Введите логин','reg-login');return;}
  if(!/^[a-zA-Z0-9_]{3,30}$/.test(login)){showAuthErr('Логин: только буквы, цифры, _ (3-30 символов)','reg-login');return;}
  if(!nick){showAuthErr('Введите никнейм','reg-nick');return;}
  if(!email){showAuthErr('Введите email','reg-email');return;}
  if(!pass){showAuthErr('Введите пароль','reg-pass');return;}
  if(pass.length<6){showAuthErr('Пароль должен быть не менее 6 символов','reg-pass');return;}
  if(pass!==pass2){showAuthErr('Пароли не совпадают','reg-pass2');return;}
  // Check login uniqueness in Firestore
  try{
    const q=FB.query(FB.collection(FB.db,'users'),FB.where('login','==',login),FB.limit(1));
    const snap=await FB.getDocs(q);
    if(!snap.empty){showAuthErr(`Логин «${login}» уже занят`,'reg-login');return;}
  }catch(e){}
  try{
    const cred=await FB.createUserWithEmailAndPassword(FB.auth,email,pass);
    // Первый зарегистрировавшийся пользователь автоматически становится суперадмином
    let rank='user';
    try{
      const usersSnap=await FB.getDocs(FB.query(FB.collection(FB.db,'users'),FB.limit(1)));
      if(usersSnap.empty) rank='superadmin'; // первый пользователь = суперадмин
    }catch(e){}
    const userDoc={login,nick,email,rank,color:avatarColor(nick),createdAt:FB.serverTimestamp(),blocked:false};
    // Retry setDoc up to 3 times (handles brief Firestore offline)
    let saved=false;
    for(let attempt=0;attempt<3;attempt++){
      try{
        await FB.setDoc(FB.doc(FB.db,'users',cred.user.uid),userDoc);
        saved=true;break;
      }catch(err){
        if(attempt<2)await new Promise(r=>setTimeout(r,1000));
      }
    }
    if(!saved){
      // Save to localStorage as fallback so user isn't lost
      localStorage.setItem('pycat_pending_profile_'+cred.user.uid, JSON.stringify(userDoc));
      console.warn('Profile saved to localStorage as fallback — will sync when Firestore is available');
    }
    window.CURRENT_USER={uid:cred.user.uid,email,...userDoc};
    renderHeaderAuth();
    showPage('catalog');
    if(rank==='superadmin'){
      showNotif(`Добро пожаловать, ${nick}! Вы — суперадминистратор каталога.`);
    }else{
      showNotif(`Аккаунт создан! Добро пожаловать, ${nick}!`);
    }
  }catch(e){
    const regErrMap={
      'auth/email-already-in-use':'Этот email уже используется в другом аккаунте',
      'auth/invalid-email':'Некорректный email адрес',
      'auth/weak-password':'Пароль слишком слабый (минимум 6 символов)',
      'auth/operation-not-allowed':'Регистрация через email отключена. Включите в Firebase Console → Authentication → Sign-in method.',
      'auth/network-request-failed':'Ошибка сети. Проверьте интернет-соединение.',
      'auth/api-key-not-valid':'Неверный API ключ Firebase. Проверьте конфигурацию.',
      'auth/unauthorized-domain':'Домен не авторизован. Добавьте его в Firebase Console → Authentication → Settings → Authorized domains.',
    };
    const msg=regErrMap[e.code]||`Ошибка (${e.code}): ${e.message}`;
    showAuthErr(msg,'reg-email');
  }
}
async function doLogout(){
  await FB.signOut(FB.auth);
  window.CURRENT_USER=null;
  if(pendingUnsubscribe){pendingUnsubscribe();pendingUnsubscribe=null;}
  renderHeaderAuth();
  showPage('catalog');
  showNotif('Вы вышли из аккаунта');
}
async function doRecover(){
  const email=document.getElementById('rec-email').value.trim();
  const res=document.getElementById('rec-result');
  if(!email){res.innerHTML=`<div style="background:rgba(255,80,114,.1);border:1px solid rgba(255,80,114,.3);border-radius:8px;padding:10px;font-size:13px;color:var(--red)">Введите email.</div>`;res.style.display='block';return;}
  try{
    await FB.sendPasswordResetEmail(FB.auth,email);
    res.innerHTML=`<div style="background:rgba(57,224,124,.08);border:1px solid rgba(57,224,124,.25);border-radius:8px;padding:14px;font-size:13px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="material-symbols-rounded" style="color:var(--grn);font-size:20px">mark_email_read</span><strong style="color:var(--grn)">Письмо отправлено!</strong></div>
      <div style="color:var(--text2)">Проверьте почту <strong>${esc(email)}</strong> и перейдите по ссылке для сброса пароля. Проверьте папку «Спам».</div>
    </div>`;
    res.style.display='block';
  }catch(e){
    const msg={'auth/user-not-found':'Аккаунт с таким email не найден','auth/invalid-email':'Некорректный email'}[e.code]||'Ошибка: '+e.message;
    res.innerHTML=`<div style="background:rgba(255,80,114,.1);border:1px solid rgba(255,80,114,.3);border-radius:8px;padding:10px;font-size:13px;color:var(--red)">${esc(msg)}</div>`;
    res.style.display='block';
  }
}

// ══════════════════════════════════════════════════
// PAGES

// ── Перенаправление если уже вошли ──
document.addEventListener('DOMContentLoaded', () => {
  renderHeader('auth');
  // Читаем ?mode= из URL (login / register / recover)
  const mode = new URLSearchParams(location.search).get('mode') || 'login';
  switchAuthForm(mode);
  window.onAuthReady = function() {
    renderHeaderAuth();
    // Если уже авторизован — перенаправить на каталог
    if(window.CURRENT_USER) window.location.href = '/';
  };
});
