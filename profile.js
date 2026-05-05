'use strict';
// profile.js — страница профиля пользователя

}

function renderProfileLiked(){
  const u=curUser();const items=window.CATALOG.filter(i=>(i.likes||[]).includes(u?.uid));
  const el=document.getElementById('profile-tab-liked');
  el.innerHTML=items.length?`<div class="cards-grid">${items.map(i=>renderCard(i)).join('')}</div>`:`<div class="empty-state"><span class="material-symbols-rounded">star_border</span><div class="empty-state-title">Нет избранных программ</div></div>`;
}

function renderProfilePage(){
  const u=curUser();if(!u){showPage('auth');return;}
  const col=u.color||avatarColor(u.nick||u.email||'?');
  const rankText=u.rank==='superadmin'?'Главный Администратор':u.rank==='admin'?'Администратор':'Пользователь';
  const rankClass=u.rank==='superadmin'?'rank-pill superadmin':u.rank==='admin'?'rank-pill admin':'rank-pill user';
  document.getElementById('profile-header').innerHTML=`
    <div class="profile-avatar" style="background:${col}">${(u.nick||u.email||'?').charAt(0).toUpperCase()}</div>
    <div style="flex:1"><div class="profile-name">${esc(u.nick||u.email)}</div><div class="profile-login">@${esc(u.login||u.email)}</div><span class="${rankClass}" style="margin-top:6px;display:inline-flex">${rankText}</span></div>
    <button class="btn-sm btn-danger" onclick="doLogout()"><span class="material-symbols-rounded">logout</span>Выйти</button>`;
  renderProfileSettings();switchProfileTab('settings');
}

async function renderProfilePrograms(){
  const u=curUser();if(!u)return;
  const q=FB.query(FB.collection(FB.db,'programs'),FB.where('authorId','==',u.uid));
  const snap=await FB.getDocs(q);const added=snap.docs.map(d=>({id:d.id,...d.data()}));
  const el=document.getElementById('profile-tab-myprograms');
  el.innerHTML=added.length?`<div class="cards-grid">${added.map(i=>renderCard(i)).join('')}</div>`:`<div class="empty-state"><span class="material-symbols-rounded">inventory_2</span><div class="empty-state-title">Вы ещё не добавляли программы</div><button class="btn-large btn-primary" onclick="openSubmitModal()"><span class="material-symbols-rounded">add_circle</span>Добавить</button></div>`;
}

function renderProfileSettings(){
  const u=curUser();if(!u)return;
  document.getElementById('profile-tab-settings').innerHTML=`
    <div class="settings-section">
      <div class="settings-title"><span class="material-symbols-rounded">person</span>Личные данные</div>
      <div class="form-row"><div class="form-group"><label class="form-label" for="pf-nick">Никнейм</label><input class="form-input" id="pf-nick" autocomplete="nickname" value="${esc(u.nick||'')}"></div>
      <div class="form-group"><label class="form-label" for="pf-login">Логин</label><input class="form-input" id="pf-login" autocomplete="username" value="${esc(u.login||'')}"></div></div>
      <button class="btn-sm btn-primary" onclick="saveProfileData()"><span class="material-symbols-rounded">save</span>Сохранить</button>
    </div>
    <div class="settings-section">
      <div class="settings-title"><span class="material-symbols-rounded">lock</span>Смена пароля</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="pf-pass">Новый пароль</label><input class="form-input" id="pf-pass" autocomplete="new-password" type="password" placeholder="Мин. 6 символов"></div>
        <div class="form-group"><label class="form-label" for="pf-pass2">Подтверждение</label><input class="form-input" id="pf-pass2" autocomplete="new-password" type="password" placeholder="Повторите пароль"></div>
      </div>
      <button class="btn-sm btn-primary" onclick="savePassword()"><span class="material-symbols-rounded">key</span>Изменить пароль</button>
    </div>
    <div class="settings-section">
      <div class="settings-title"><span class="material-symbols-rounded">palette</span>Цветовая тема</div>
      <div class="theme-grid">
        ${[['dark','Тёмная','linear-gradient(135deg,#08090f,#1c1e30)'],['light','Светлая','linear-gradient(135deg,#f4f5fb,#eef0fa)'],['ocean','Океан','linear-gradient(135deg,#040d1a,#0e2645)'],['forest','Лес','linear-gradient(135deg,#060f07,#142e15)'],['sunset','Закат','linear-gradient(135deg,#110608,#32141c)']].map(([id,name,bg])=>`
        <button class="theme-btn ${currentTheme===id?'active':''}" onclick="applyTheme('${id}');renderProfileSettings()">
          <div class="theme-swatch" style="background:${bg}"></div><div class="theme-name">${name}</div>
        </button>`).join('')}
      </div>
    </div>
    <div class="settings-section danger-zone">
      <div class="settings-title"><span class="material-symbols-rounded">warning</span>Опасная зона</div>
      <button class="btn-sm btn-danger" onclick="deleteAccount()"><span class="material-symbols-rounded">delete_forever</span>Удалить аккаунт</button>
    </div>`;
}

async function renderSupportPage(){
  const u=curUser();const el=document.getElementById('support-content');
  if(!u){el.innerHTML=`<div class="empty-state"><span class="material-symbols-rounded">support_agent</span><div class="empty-state-title">Войдите чтобы задать вопрос</div><button class="btn-large btn-primary" onclick="showPage('auth')"><span class="material-symbols-rounded">login</span>Войти</button></div>`;return;}
  el.innerHTML=`<div style="margin-bottom:20px"><button class="btn-sm btn-primary" onclick="openNewTicket()"><span class="material-symbols-rounded">add</span>Новый вопрос</button></div><div id="ticket-list"><div class="spinner"></div></div>
  <div id="new-ticket-form" style="display:none;background:var(--bg2);border:1px solid var(--bd);border-radius:14px;padding:20px;margin-top:16px">
    <div class="form-group"><label class="form-label" for="ticket-subject">Тема<span class="req">*</span></label><input class="form-input" id="ticket-subject" autocomplete="off" placeholder="Кратко опишите проблему"></div>
    <div class="form-group"><label class="form-label" for="ticket-msg">Сообщение<span class="req">*</span></label><textarea class="form-textarea" id="ticket-msg" placeholder="Подробно опишите вопрос..." style="min-height:100px"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn-sm btn-outline" onclick="document.getElementById('new-ticket-form').style.display='none'">Отмена</button>
      <button class="btn-sm btn-primary" onclick="submitTicket()"><span class="material-symbols-rounded">send</span>Отправить</button>
    </div>
  </div>`;
  try{
    const q=FB.query(FB.collection(FB.db,'support'),FB.where('userId','==',u.uid),FB.orderBy('createdAt','desc'));
    const snap=await FB.getDocs(q);const tickets=snap.docs.map(d=>({id:d.id,...d.data()}));
    const tl=document.getElementById('ticket-list');
    tl.innerHTML=tickets.length?tickets.map(t=>`<div class="ticket-item ${t.status==='closed'?'closed-ticket':'open-ticket'}" onclick="toggleTicket('${t.id}')">
      <div class="ticket-title">${esc(t.subject)}</div>
      <div class="ticket-meta">${timeAgo(t.createdAt)} · ${t.status==='closed'?'✅ Закрыт':'⏳ Открыт'}</div>
      <div id="ticket-body-${t.id}" style="display:none;margin-top:10px">
        <div style="font-size:13px;color:var(--text);margin-bottom:8px">${esc(t.message||'').replace(/\n/g,'<br>')}</div>
        ${t.reply?`<div class="ticket-reply"><div class="ticket-reply-label">Ответ администратора</div>${esc(t.reply).replace(/\n/g,'<br>')}</div>`:'<div style="font-size:12px;color:var(--text3);font-style:italic">Ответ ещё не получен</div>'}
      </div></div>`).join(''):
    `<div class="empty-state"><span class="material-symbols-rounded">forum</span><div class="empty-state-title">Вопросов пока нет</div><div class="empty-state-sub">Задайте свой первый вопрос администраторам</div></div>`;
  }catch(e){showNotif('Ошибка загрузки тикетов','err');}
}

async function resubmitProgram(id){
  try{await FB.updateDoc(FB.doc(FB.db,'programs',id),{status:'pending',rejectReason:null,submittedAt:FB.serverTimestamp()});renderMyUtils();showNotif('Программа отправлена на повторную проверку!');}
  catch(e){showNotif('Ошибка: '+e.message,'err');}
}

async function savePassword(){
  const p=document.getElementById('pf-pass').value;const p2=document.getElementById('pf-pass2').value;
  if(p.length<6){showNotif('Пароль должен быть не менее 6 символов','warn');return;}
  if(p!==p2){showNotif('Пароли не совпадают','warn');return;}
  try{await FB.updatePassword(FB.auth.currentUser,p);showNotif('Пароль изменён!');}
  catch(e){showNotif('Ошибка: '+e.message+'. Попробуйте перелогиниться.','err');}
}

async function saveProfileData(){
  const u=curUser();if(!u)return;
  const nick=document.getElementById('pf-nick').value.trim();const login=document.getElementById('pf-login').value.trim();
  if(!nick||!login){showNotif('Заполните все поля','warn');return;}
  // Check login uniqueness
  try{await FB.updateDoc(FB.doc(FB.db,'programs',id),{status:'pending',rejectReason:null,submittedAt:FB.serverTimestamp()});renderMyUtils();showNotif('Программа отправлена на повторную проверку!');}
  catch(e){showNotif('Ошибка: '+e.message,'err');}
}

async function savePassword(){
  const p=document.getElementById('pf-pass').value;const p2=document.getElementById('pf-pass2').value;
  if(p.length<6){showNotif('Пароль должен быть не менее 6 символов','warn');return;}
  if(p!==p2){showNotif('Пароли не совпадают','warn');return;}
  try{await FB.updatePassword(FB.auth.currentUser,p);showNotif('Пароль изменён!');}
  catch(e){showNotif('Ошибка: '+e.message+'. Попробуйте перелогиниться.','err');}
}

async function saveProfileData(){
  const u=curUser();if(!u)return;
  const nick=document.getElementById('pf-nick').value.trim();const login=document.getElementById('pf-login').value.trim();
  if(!nick||!login){showNotif('Заполните все поля','warn');return;}
  // Check login uniqueness
  if(login!==u.login){
    const q=FB.query(FB.collection(FB.db,'users'),FB.where('login','==',login),FB.limit(1));
    const snap=await FB.getDocs(q);if(!snap.empty){showNotif('Логин уже занят','err');return;}
  }
  try{await FB.updateDoc(FB.doc(FB.db,'users',u.uid),{nick,login});window.CURRENT_USER={...u,nick,login};renderHeaderAuth();renderProfilePage();showNotif('Данные сохранены!');}
  catch(e){showNotif('Ошибка: '+e.message,'err');}
}

function showArchiveRes(name,size,badge,zipped){
  document.getElementById('archive-result-name').textContent=name;document.getElementById('archive-result-info').textContent=(zipped?'✓ Архивировано · ':'✓ Готово · ')+fmtSize(size);document.getElementById('archive-result-badge').textContent=badge;document.getElementById('archive-result').style.display='flex';
}

async function submitTicket(){

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  renderHeader('profile');
  window.onAuthReady = async function() {
    await loadSettings();
    renderHeaderAuth();
    if(!window.CURRENT_USER){ window.location.href='/auth/'; return; }
    renderProfilePage();
    // Если пришли через #myutils — переключить вкладку
    if(location.hash === '#myutils') renderMyUtils();
  };
});

  const u=curUser();
  // Liked
  const likedItems=window.CATALOG.filter(i=>(i.likes||[]).includes(u?.uid));
  const lg=document.getElementById('my-liked-grid');
  lg.innerHTML=likedItems.length?likedItems.map(i=>renderCard(i)).join(''):`<div style="grid-column:1/-1"><div class="empty-state"><span class="material-symbols-rounded">star_border</span><div class="empty-state-title">Нет избранных программ</div><div class="empty-state-sub">Нажмите ⭐ на карточке</div><button class="btn-large btn-primary" onclick="showPage('catalog')"><span class="material-symbols-rounded">apps</span>К каталогу</button></div></div>`;
  // Added / pending
  if(!u){document.getElementById('my-added-grid').innerHTML=`<div style="grid-column:1/-1"><div class="empty-state"><span class="material-symbols-rounded">login</span><div class="empty-state-title">Войдите в аккаунт</div><button class="btn-large btn-primary" onclick="showPage('auth')"><span class="material-symbols-rounded">login</span>Войти</button></div></div>`;return;}
  try{
    const q=FB.query(FB.collection(FB.db,'programs'),FB.where('authorId','==',u.uid),FB.orderBy('submittedAt','desc'));
    const snap=await FB.getDocs(q);
    const added=snap.docs.map(d=>({id:d.id,...d.data()}));
    const ag=document.getElementById('my-added-grid');
    if(!added.length){ag.innerHTML=`<div style="grid-column:1/-1"><div class="empty-state"><span class="material-symbols-rounded">inventory_2</span><div class="empty-state-title">Вы ещё не добавляли программы</div><button class="btn-large btn-primary" onclick="openSubmitModal()"><span class="material-symbols-rounded">add_circle</span>Добавить программу</button></div></div>`;return;}
    const smap={pending:p=>`<span class="status-badge status-pending">⏳ На проверке</span>`,approved:p=>`<span class="status-badge status-approved">✅ Опубликована</span>`,rejected:p=>`<div style="display:flex;flex-direction:column;gap:4px"><span class="status-badge status-rejected">❌ Отклонена</span>${p.rejectReason?`<div style="font-size:11px;color:var(--text3);background:rgba(255,80,114,.06);border:1px solid rgba(255,80,114,.15);border-radius:6px;padding:4px 8px"><strong style="color:var(--red)">Причина:</strong> ${esc(p.rejectReason)}</div>`:''}</div>`};
    ag.innerHTML=added.map(p=>`<div class="card pending-card" onclick="openModal('${p.id}')">
      <div class="card-top"><div class="card-name">${esc(p.name)}</div><span class="type-pill ${typeClass[p.type]||'tp-def'}" ${getTypePillStyle(p.type)}>${p.type}</span></div>
      <div class="card-desc">${esc(p.description)}</div>
      <div class="card-tags">${(p.tags||[]).slice(0,5).map(t=>`<span class="card-tag">#${t}</span>`).join('')}</div>
      <div class="pending-card-footer">
        ${smap[p.status]?.(p)||''}
        <div style="margin-left:auto;display:flex;gap:5px">
          <button class="btn-sm btn-outline" onclick="event.stopPropagation();openSubmitModal('${p.id}')"><span class="material-symbols-rounded">edit</span>Ред.</button>
          ${p.status==='rejected'?`<button class="btn-sm btn-warn" onclick="event.stopPropagation();resubmitProgram('${p.id}')"><span class="material-symbols-rounded">refresh</span>Переподать</button>`:''}
          <button class="btn-sm btn-danger" onclick="event.stopPropagation();deleteMyProgram('${p.id}')"><span class="material-symbols-rounded">delete</span></button>
        </div>
      </div></div>`).join('');
  }catch(e){showNotif('Ошибка загрузки','err');}
}

function renderProfileLiked(){

function switchProfileTab(tab){
  ['settings','myprograms','liked'].forEach(t=>{document.getElementById('ptab-'+t).classList.toggle('active',t===tab);document.getElementById('profile-tab-'+t).style.display=t===tab?'block':'none';});
  if(tab==='myprograms')renderProfilePrograms();if(tab==='liked')renderProfileLiked();
}

function toggleTicket(id){const el=document.getElementById('ticket-body-'+id);if(el)el.style.display=el.style.display==='none'?'block':'none';}

function updatePreview(){