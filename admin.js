'use strict';
// admin.js — панель администратора

// ══════════════════════════════════════════════════
async function claimSuperAdmin(){
  const u=curUser();if(!u)return;
  if(!confirm('Сделать вас суперадминистратором? Возможно только если нет других.'))return;
  try{
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,'users'),FB.where('rank','==','superadmin'),FB.limit(1)));
    if(!snap.empty){showNotif('В системе уже есть суперадминистратор','err');return;}
    await FB.updateDoc(FB.doc(FB.db,'users',u.uid),{rank:'superadmin'});
    window.CURRENT_USER={...u,rank:'superadmin'};
    renderHeaderAuth();renderAdminPage();
    showNotif('Вы стали суперадминистратором!');
  }catch(e){showNotif('Ошибка: '+e.message,'err');}
}
let adminCurrentTab='programs';
let supportSort='newest',supportFilter='all';
function renderAdminPage(){
  const u=curUser();
  if(!u||!isAdmin()){
    document.getElementById('admin-login-screen').style.display='flex';
    document.getElementById('admin-panel-content').style.display='none';
    const claimArea=document.getElementById('claim-superadmin-area');
    if(claimArea&&u){
      claimArea.innerHTML=`<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bd)"><div style="font-size:12px;color:var(--text3);margin-bottom:8px">Вы вошли как <strong style="color:var(--text)">${esc(u.nick||u.email)}</strong>, но не администратор.</div><button class="btn-sm btn-warn" style="width:100%;justify-content:center" onclick="claimSuperAdmin()"><span class="material-symbols-rounded">shield</span>Стать суперадмином</button></div>`;
    }else if(claimArea){claimArea.innerHTML='';}
    return;
  }
  document.getElementById('admin-login-screen').style.display='none';
  document.getElementById('admin-panel-content').style.display='block';
  document.getElementById('admin-rank-badge').textContent=isSuperAdmin()?'ГЛАВНЫЙ АДМИНИСТРАТОР':'АДМИНИСТРАТОР';
  const dbTab=document.getElementById('atab-database');
  if(dbTab)dbTab.style.display=isSuperAdmin()?'':'none';
  renderAdminStats();
  switchAdminTab('programs');
}
function renderAdminStats(){
  const pending=(window.PENDING||[]).filter(p=>p.status==='pending');
  const rejected=(window.PENDING||[]).filter(p=>p.status==='rejected');
  const el=document.getElementById('admin-stats');if(!el)return;
  el.innerHTML=`
    <div class="admin-stat" style="${pending.length?'border-color:rgba(255,209,96,.35)':''}">
      <div class="admin-stat-icon" style="background:rgba(108,116,255,.1)"><span class="material-symbols-rounded" style="color:var(--acc2)">apps</span></div>
      <div><div class="admin-stat-num">${(window.CATALOG||[]).length}</div><div class="admin-stat-lbl">Опубликовано</div></div>
    </div>
    <div class="admin-stat" style="${pending.length?'border-color:rgba(255,209,96,.35);background:rgba(255,209,96,.03)':''}">
      <div class="admin-stat-icon" style="background:rgba(255,209,96,.1)"><span class="material-symbols-rounded" style="color:var(--yel)">pending</span></div>
      <div><div class="admin-stat-num" style="display:flex;align-items:center;gap:6px">${pending.length}${pending.length?`<span class="new-badge" style="background:var(--yel);color:#000">+${pending.length}</span>`:''}</div><div class="admin-stat-lbl">На проверке</div></div>
    </div>
    <div class="admin-stat">
      <div class="admin-stat-icon" style="background:rgba(255,80,114,.1)"><span class="material-symbols-rounded" style="color:var(--red)">cancel</span></div>
      <div><div class="admin-stat-num">${rejected.length}</div><div class="admin-stat-lbl">Отклонено</div></div>
    </div>
    <div class="admin-stat">
      <div class="admin-stat-icon" style="background:rgba(57,224,124,.1)"><span class="material-symbols-rounded" style="color:var(--grn)">group</span></div>
      <div><div class="admin-stat-num" id="admin-users-count">—</div><div class="admin-stat-lbl">Пользователей</div></div>
    </div>`;
  FB.getDocs(FB.collection(FB.db,'users')).then(s=>{const el=document.getElementById('admin-users-count');if(el)el.textContent=s.size;}).catch(()=>{});
}
function switchAdminTab(tab){
  adminCurrentTab=tab;
  ['programs','users','support','catalog','database'].forEach(t=>{
    const btn=document.getElementById('atab-'+t);const panel=document.getElementById('admin-tab-'+t);
    if(btn)btn.classList.toggle('active',t===tab);
    if(panel)panel.style.display=t===tab?'block':'none';
  });
  if(tab==='programs')renderAdminPrograms();
  else if(tab==='users')renderAdminUsers();
  else if(tab==='support')renderAdminSupport();
  else if(tab==='catalog')renderAdminCatalog();
  else if(tab==='database')renderAdminDatabase();
}
async function renderAdminPrograms(searchQ=''){
  const el=document.getElementById('admin-tab-programs');if(!el)return;
  const pending=(window.PENDING||[]).filter(p=>p.status==='pending');
  const allProg=(window.CATALOG||[]).filter(i=>{if(!searchQ)return true;const q=searchQ.toLowerCase();return i.name?.toLowerCase().includes(q)||i.author?.toLowerCase().includes(q);});
  el.innerHTML=`<div class="admin-section-title">🕐 Заявки (${pending.length})</div>
  ${pending.length?`<table class="admin-table"><thead><tr><th>Название</th><th>Тип</th><th>Автор</th><th>Действия</th></tr></thead><tbody>
  ${pending.map(p=>`<tr><td><div style="font-weight:700;font-size:13px">${esc(p.name)}</div><div style="font-size:11px;color:var(--text3)">${esc((p.description||'').slice(0,60))}...</div><div style="display:flex;gap:3px;margin-top:3px">${(p.tags||[]).slice(0,3).map(t=>`<span class="card-tag">#${t}</span>`).join('')}${p.archiveUrl?`<span class="card-tag" style="color:var(--grn)">📦</span>`:''}</div></td>
  <td><span class="type-pill ${typeClass[p.type]||'tp-def'}" ${getTypePillStyle(p.type)}>${p.type}</span></td>
  <td style="font-size:12px">${esc(p.author||'—')}</td>
  <td><div class="admin-actions">
    <button class="btn-sm btn-outline" onclick="openModal('${p.id}')"><span class="material-symbols-rounded">visibility</span></button>
    <button class="btn-sm btn-success" onclick="adminApprove('${p.id}')"><span class="material-symbols-rounded">check</span>Одобрить</button>
    <button class="btn-sm btn-danger" onclick="adminReject('${p.id}')"><span class="material-symbols-rounded">close</span>Откл.</button>
  </div></td></tr>`).join('')}</tbody></table>`:`<div style="color:var(--text3);font-size:13px;padding:12px 0">Нет заявок</div>`}
  <div class="admin-section-title">✅ Опубликованные (${allProg.length})
    <input class="admin-search" placeholder="🔍 Поиск" value="${esc(searchQ)}" oninput="renderAdminPrograms(this.value)" autocomplete="off">
  </div>
  <table class="admin-table"><thead><tr><th>Название</th><th>Тип</th><th>Автор</th><th>⭐</th><th>Действия</th></tr></thead><tbody>
  ${allProg.map(i=>`<tr>
    <td><div style="font-weight:700;font-size:13px">${esc(i.name)}</div>${i.archiveUrl?`<span class="card-tag" style="color:var(--grn);display:inline-block;margin-top:3px">📦</span>`:''}</td>
    <td><span class="type-pill ${typeClass[i.type]||'tp-def'}" ${getTypePillStyle(i.type)}>${i.type}</span></td>
    <td style="font-size:12px">${esc(i.author||'—')}</td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--yel)">${i.stars||0}</td>
    <td><div class="admin-actions">
      <button class="btn-sm btn-warn" onclick="openSubmitModal('${i.id}')"><span class="material-symbols-rounded">edit</span>Ред.</button>
      <button class="btn-sm btn-danger" onclick="adminDeleteProg('${i.id}')"><span class="material-symbols-rounded">delete</span></button>
    </div></td></tr>`).join('')}</tbody></table>`;
}
async function adminApprove(id){
  try{await FB.updateDoc(FB.doc(FB.db,'programs',id),{status:'approved',approvedAt:FB.serverTimestamp()});showNotif('Программа одобрена!');}
  catch(e){showNotif('Ошибка: '+e.message,'err');}
}
async function adminReject(id){
  const reason=prompt('Причина отклонения (необязательно):');if(reason===null)return;
  try{await FB.updateDoc(FB.doc(FB.db,'programs',id),{status:'rejected',rejectReason:reason.trim(),rejectedAt:FB.serverTimestamp()});showNotif('Программа отклонена','warn');}
  catch(e){showNotif('Ошибка: '+e.message,'err');}
}
async function adminDeleteProg(id){
  const item=(window.CATALOG||[]).find(i=>i.id===id);if(!item||!confirm(`Удалить «${item.name}»?`))return;
  try{
    if(item.archiveKey){
      try{
        const cfg=window.GH_CONFIG||{};
        if(cfg.owner&&cfg.repo&&cfg.token){
          const shaRes=await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${item.archiveKey}`,{headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json'}});
          if(shaRes.ok){const d=await shaRes.json();await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${item.archiveKey}`,{method:'DELETE',headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({message:`Delete ${item.archiveName||item.archiveKey}`,sha:d.sha})});}
        }
      }catch(e){console.warn('GitHub delete:',e);}
    }
    await FB.deleteDoc(FB.doc(FB.db,'programs',id));
    showNotif(`«${item.name}» удалена`,'warn');
  }catch(e){showNotif('Ошибка: '+e.message,'err');}
}
async function renderAdminUsers(searchQ=''){
  const el=document.getElementById('admin-tab-users');if(!el)return;
  el.innerHTML='<div class="spinner"></div>';
  try{
    const snap=await FB.getDocs(FB.collection(FB.db,'users'));
    let users=snap.docs.map(d=>({uid:d.id,...d.data()}));
    if(searchQ){const q=searchQ.toLowerCase();users=users.filter(u=>u.login?.toLowerCase().includes(q)||u.nick?.toLowerCase().includes(q)||u.email?.toLowerCase().includes(q));}
    const curU=curUser();
    el.innerHTML=`<div class="admin-section-title">👥 Пользователи (${users.length})
      <input class="admin-search" placeholder="🔍 Поиск" value="${esc(searchQ)}" oninput="renderAdminUsers(this.value)" autocomplete="off">
    </div>
    <table class="admin-table"><thead><tr><th>Пользователь</th><th>Email / Логин</th><th>Ранг</th><th>Дата</th>${isSuperAdmin()?'<th>Управление</th>':''}<th>Блокировка</th></tr></thead><tbody>
    ${users.map(u=>{
      const col=u.color||avatarColor(u.nick||u.email||'?');
      const rankOpts=isSuperAdmin()&&u.uid!==curU?.uid?`<div style="display:flex;gap:5px;flex-wrap:wrap">
        <select class="sort-select" style="font-size:11px;padding:4px 8px" onchange="changeUserRank('${u.uid}',this.value)">
          <option value="user" ${u.rank==='user'?'selected':''}>Пользователь</option>
          <option value="admin" ${u.rank==='admin'?'selected':''}>Администратор</option>
          <option value="superadmin" ${u.rank==='superadmin'?'selected':''}>Гл. Администратор</option>
        </select>
        <button class="btn-sm btn-danger" onclick="adminDeleteUser('${u.uid}')"><span class="material-symbols-rounded">delete</span></button>
      </div>`:'';
      const isBlocked=u.blocked&&(!u.blockedUntil||(u.blockedUntil?.seconds?u.blockedUntil.seconds*1000:u.blockedUntil)>Date.now());
      const blockCell=u.uid!==curU?.uid?isBlocked?`<div style="display:flex;align-items:center;gap:5px"><span style="font-size:11px;color:var(--red);font-family:var(--mono)">Заблокирован</span><button class="btn-sm btn-success" onclick="unblockUser('${u.uid}')"><span class="material-symbols-rounded">lock_open</span>Разбл.</button></div>`:`<button class="btn-sm btn-warn" onclick="openBlockDialog('${u.uid}')"><span class="material-symbols-rounded">block</span>Блок</button>`:'<span style="font-size:11px;color:var(--text3)">— вы —</span>';
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:8px;background:${col};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${(u.nick||u.email||'?').charAt(0).toUpperCase()}</div><div style="font-weight:700;font-size:13px">${esc(u.nick||u.email)}</div></div></td>
        <td><div style="font-family:var(--mono);font-size:12px">${esc(u.email||'—')}</div><div style="font-size:11px;color:var(--text3)">@${esc(u.login||'—')}</div></td>
        <td><span class="rank-pill ${u.rank||'user'}">${u.rank==='superadmin'?'Гл.Администратор':u.rank==='admin'?'Администратор':'Пользователь'}</span></td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text3)">${u.createdAt?timeAgo(u.createdAt):'—'}</td>
        ${isSuperAdmin()?`<td>${rankOpts}</td>`:''}
        <td>${blockCell}</td>
      </tr>`;}).join('')}</tbody></table>`;
  }catch(e){el.innerHTML=`<div style="color:var(--red);padding:12px">Ошибка: ${esc(e.message)}</div>`;}
}
async function changeUserRank(userId,rank){if(!isSuperAdmin())return;try{await FB.updateDoc(FB.doc(FB.db,'users',userId),{rank});renderAdminUsers();showNotif('Ранг изменён');}catch(e){showNotif('Ошибка: '+e.message,'err');}}
async function adminDeleteUser(userId){if(!isSuperAdmin()||!confirm('Удалить аккаунт пользователя?'))return;try{await FB.deleteDoc(FB.doc(FB.db,'users',userId));renderAdminUsers();showNotif('Пользователь удалён','warn');}catch(e){showNotif('Ошибка: '+e.message,'err');}}
async function openBlockDialog(userId){const snap=await FB.getDoc(FB.doc(FB.db,'users',userId));if(!snap.exists())return;const u=snap.data();const durStr=prompt(`Заблокировать «${u.nick||u.email}»
Время в минутах (0=навсегда, отмена=-1):`);if(durStr===null||durStr==='-1')return;const dur=parseInt(durStr)||0;const reason=prompt('Причина (необязательно):')||'';const until=dur>0?new Date(Date.now()+dur*60000):null;try{await FB.updateDoc(FB.doc(FB.db,'users',userId),{blocked:true,blockedUntil:until,blockedReason:reason});renderAdminUsers();showNotif(`Заблокирован${dur>0?` на ${dur} мин`:''}`);}catch(e){showNotif('Ошибка: '+e.message,'err');}}
async function unblockUser(userId){try{await FB.updateDoc(FB.doc(FB.db,'users',userId),{blocked:false,blockedUntil:null,blockedReason:null});renderAdminUsers();showNotif('Пользователь разблокирован');}catch(e){showNotif('Ошибка: '+e.message,'err');}}
async function renderAdminSupport(sort,filter){
  if(sort!==undefined)supportSort=sort;if(filter!==undefined)supportFilter=filter;
  const el=document.getElementById('admin-tab-support');if(!el)return;
  el.innerHTML='<div class="spinner"></div>';
  try{
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,'support'),FB.orderBy('createdAt','desc')));
    let tickets=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(supportFilter==='open')tickets=tickets.filter(t=>t.status==='open');
    else if(supportFilter==='closed')tickets=tickets.filter(t=>t.status==='closed');
    else if(supportFilter==='waiting')tickets=tickets.filter(t=>t.tag==='waiting');
    if(supportSort==='oldest')tickets.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
    else if(supportSort==='open-first')tickets.sort((a,b)=>a.status==='open'?-1:1);
    else if(supportSort==='az')tickets.sort((a,b)=>(a.userNick||'').localeCompare(b.userNick||''));
    el.innerHTML=`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
      <div style="font-weight:700;font-size:15px">💬 Вопросы (${tickets.length})</div>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
        <select class="sort-select" style="font-size:12px;padding:6px 10px" onchange="renderAdminSupport(this.value,undefined)">
          <option value="newest" ${supportSort==='newest'?'selected':''}>Новые</option>
          <option value="oldest" ${supportSort==='oldest'?'selected':''}>Старые</option>
          <option value="open-first" ${supportSort==='open-first'?'selected':''}>Открытые</option>
          <option value="az" ${supportSort==='az'?'selected':''}>A-Z</option>
        </select>
        <select class="sort-select" style="font-size:12px;padding:6px 10px" onchange="renderAdminSupport(undefined,this.value)">
          <option value="all" ${supportFilter==='all'?'selected':''}>Все</option>
          <option value="open" ${supportFilter==='open'?'selected':''}>Открытые</option>
          <option value="closed" ${supportFilter==='closed'?'selected':''}>Закрытые</option>
          <option value="waiting" ${supportFilter==='waiting'?'selected':''}>В ожидании</option>
        </select>
      </div>
    </div>
    ${tickets.length?`<table class="admin-table"><thead><tr><th>Пользователь</th><th>Тема</th><th>Статус</th><th>Дата</th><th>Действия</th></tr></thead><tbody>
    ${tickets.map(t=>`<tr>
      <td style="font-size:13px;font-weight:600">${esc(t.userNick||'—')}</td>
      <td><div style="font-size:13px">${esc(t.subject)}</div><div style="font-size:11px;color:var(--text3)">${esc((t.message||'').slice(0,60))}...</div></td>
      <td><div style="display:flex;flex-direction:column;gap:3px"><span class="status-badge ${t.status==='closed'?'status-approved':'status-pending'}">${t.status==='closed'?'Закрыт':'Открыт'}</span>${t.tag==='waiting'?`<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:4px;background:rgba(108,116,255,.15);color:var(--acc2);border:1px solid rgba(108,116,255,.3);font-family:var(--mono)">⏳ Ожидание</span>`:''}</div></td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--text3)">${timeAgo(t.createdAt)}</td>
      <td><div class="admin-actions">
        <button class="btn-sm btn-outline" onclick="openReplyTicket('${t.id}','${esc(t.userNick||'')}','${esc(t.subject)}')"><span class="material-symbols-rounded">reply</span>Ответить</button>
        <button class="btn-sm btn-${t.status==='closed'?'warn':'success'}" onclick="toggleTicketStatus('${t.id}','${t.status}')">${t.status==='closed'?'Открыть':'Закрыть'}</button>
        <button class="btn-sm btn-${t.tag==='waiting'?'outline':'primary'}" onclick="toggleWaitingTag('${t.id}','${t.tag||''}')"><span class="material-symbols-rounded">${t.tag==='waiting'?'schedule':'pending_actions'}</span>${t.tag==='waiting'?'Снять':'Ожидание'}</button>
      </div></td>
    </tr>`).join('')}</tbody></table>`:`<div style="padding:40px;text-align:center;color:var(--text3)">Нет вопросов</div>`}
    <div id="reply-form" style="display:none;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:20px;margin-top:16px">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px" id="reply-form-title">Ответ</div>
      <div class="form-group"><textarea class="form-textarea" id="reply-text" style="min-height:100px" placeholder="Введите ответ..."></textarea></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-sm btn-outline" onclick="document.getElementById('reply-form').style.display='none'">Отмена</button>
        <button class="btn-sm btn-primary" onclick="sendReply()"><span class="material-symbols-rounded">send</span>Отправить</button>
      </div>
    </div>`;
  }catch(e){el.innerHTML=`<div style="color:var(--red)">Ошибка: ${esc(e.message)}</div>`;}
}
let replyTicketId=null;
function openReplyTicket(id,nick,subject){replyTicketId=id;const el=document.getElementById('reply-form');el.style.display='block';const t=document.getElementById('reply-form-title');if(t)t.textContent=`Ответ: ${nick} — «${subject}»`;document.getElementById('reply-text').value='';el.scrollIntoView({behavior:'smooth'});}
async function sendReply(){if(!replyTicketId)return;const reply=document.getElementById('reply-text').value.trim();try{await FB.updateDoc(FB.doc(FB.db,'support',replyTicketId),{reply,status:'closed'});document.getElementById('reply-form').style.display='none';renderAdminSupport();showNotif('Ответ отправлен!');}catch(e){showNotif('Ошибка: '+e.message,'err');}}
async function toggleTicketStatus(id,cur){try{await FB.updateDoc(FB.doc(FB.db,'support',id),{status:cur==='closed'?'open':'closed'});renderAdminSupport();}catch(e){showNotif('Ошибка','err');}}
async function toggleWaitingTag(id,cur){try{await FB.updateDoc(FB.doc(FB.db,'support',id),{tag:cur==='waiting'?null:'waiting'});renderAdminSupport();}catch(e){showNotif('Ошибка','err');}}

// ══════════════════════════════════════════════════
// PYLAUNCHER
// ══════════════════════════════════════════════════
function renderAdminCatalog(){
  const el=document.getElementById('admin-tab-catalog');
  const pl=SITE_SETTINGS.pylauncher||{};
  el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="settings-section" style="grid-column:1/-1">
      <div class="settings-title"><span class="material-symbols-rounded">category</span>Типы программ</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${(SITE_SETTINGS.types||[]).map(t=>{const col=(SITE_SETTINGS.typeColors&&SITE_SETTINGS.typeColors[t])||'#6c74ff';const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);return `<div style="display:flex;align-items:center;gap:10px;background:var(--bg3);border-radius:8px;padding:8px 12px"><label style="cursor:pointer;position:relative;flex-shrink:0" title="Изменить цвет"><div style="width:22px;height:22px;border-radius:50%;background:${col};border:2px solid rgba(255,255,255,.3)"></div><input type="color" value="${col}" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:22px;height:22px" onchange="setTypeColor('${esc(t)}',this.value)"></label><span class="type-pill" style="background:rgba(${r},${g},${b},.12);color:${col};border:1px solid rgba(${r},${g},${b},.3)">${esc(t)}</span><span style="flex:1;font-size:13px">${esc(t)}</span><button class="chip-del" onclick="removeType('${esc(t)}')"><span class="material-symbols-rounded">delete</span></button></div>`;}).join('')}</div>
      <div class="chip-add-row"><input class="form-input" id="new-type-inp" placeholder="Новый тип..." autocomplete="off"><button class="btn-sm btn-primary" onclick="addType()"><span class="material-symbols-rounded">add</span>Добавить</button></div>
    </div>
    <div class="settings-section">
      <div class="settings-title"><span class="material-symbols-rounded">label</span>Популярные теги</div>
      <div class="chip-list">${(SITE_SETTINGS.tags||[]).map(t=>`<span class="chip">${esc(t)}<button class="chip-del" onclick="removeGlobalTag('${esc(t)}')"><span class="material-symbols-rounded">close</span></button></span>`).join('')}</div>
      <div class="chip-add-row"><input class="form-input" id="new-tag-inp" placeholder="Новый тег..." autocomplete="off" onkeydown="if(event.key==='Enter')addGlobalTag()"><button class="btn-sm btn-primary" onclick="addGlobalTag()"><span class="material-symbols-rounded">add</span></button></div>
    </div>
    <div class="settings-section" style="grid-column:1/-1">
      <div class="settings-title"><span class="material-symbols-rounded" style="color:var(--grn)">rocket_launch</span>PyLauncher — реклама приложения</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.6">Настройте баннер PyLauncher на главной странице. Суперадмин меняет ссылку при выходе новой версии.</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <label for="pl-enabled" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text2)">
          <input type="checkbox" id="pl-enabled" ${pl.enabled?'checked':''} style="width:16px;height:16px;cursor:pointer">
          Показывать баннер на сайте
        </label>
      </div>
      <div class="form-row" style="margin-bottom:10px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" for="pl-url">Ссылка на скачивание</label>
          <input class="form-input" id="pl-url" placeholder="https://raw.githubusercontent.com/..." value="${esc(pl.downloadUrl||'')}" autocomplete="off">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" for="pl-ver">Версия</label>
          <input class="form-input" id="pl-ver" placeholder="1.0.0" value="${esc(pl.version||'1.0.0')}" autocomplete="off">
        </div>
      </div>
      <button class="btn-sm btn-primary" onclick="savePyLauncherSettings()"><span class="material-symbols-rounded">save</span>Сохранить настройки PyLauncher</button>
    </div>
  </div>`;
}
async function setTypeColor(typeName,color){if(!SITE_SETTINGS.typeColors)SITE_SETTINGS.typeColors={};SITE_SETTINGS.typeColors[typeName]=color;await saveSettings();renderAdminCatalog();initTypeFilters();}
async function addType(){const v=document.getElementById('new-type-inp').value.trim();if(!v||(SITE_SETTINGS.types||[]).includes(v))return;SITE_SETTINGS.types.push(v);await saveSettings();renderAdminCatalog();initTypeFilters();showNotif(`Тип «${v}» добавлен`);}
async function removeType(t){if(!confirm(`Удалить тип «${t}»?`))return;SITE_SETTINGS.types=SITE_SETTINGS.types.filter(x=>x!==t);await saveSettings();renderAdminCatalog();initTypeFilters();}
async function addGlobalTag(){const v=document.getElementById('new-tag-inp').value.trim().toLowerCase();if(!v||(SITE_SETTINGS.tags||[]).includes(v))return;SITE_SETTINGS.tags.push(v);await saveSettings();renderAdminCatalog();initTagCloud();showNotif(`Тег «${v}» добавлен`);}
async function removeGlobalTag(t){SITE_SETTINGS.tags=SITE_SETTINGS.tags.filter(x=>x!==t);await saveSettings();renderAdminCatalog();initTagCloud();}

// ══════════════════════════════════════════════════
// DATABASE EXPORT
// ══════════════════════════════════════════════════
function renderAdminDatabase(){
  if(!isSuperAdmin())return;
  const cfg=window.GH_CONFIG||{};
  const el=document.getElementById('admin-tab-database');
  el.innerHTML=`<div style="background:rgba(108,116,255,.06);border:1px solid rgba(108,116,255,.15);border-radius:10px;padding:14px;margin-bottom:20px;font-size:13px;color:var(--text2)"><span class="material-symbols-rounded" style="color:var(--acc2);font-size:16px;vertical-align:middle;margin-right:6px">info</span><strong>БД:</strong> Firebase Firestore &nbsp;·&nbsp; <strong>Архивы:</strong> GitHub Repository</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="settings-section">
      <div class="settings-title"><span class="material-symbols-rounded">hub</span>GitHub Storage</div>
      <div class="form-row" style="margin-bottom:10px">
        <div class="form-group" style="margin-bottom:0"><label class="form-label" for="gh-owner">GitHub Username</label><input class="form-input" id="gh-owner" placeholder="mr-klizer" value="${esc(cfg.owner||'')}" autocomplete="off"></div>
        <div class="form-group" style="margin-bottom:0"><label class="form-label" for="gh-repo">Репозиторий</label><input class="form-input" id="gh-repo" placeholder="pycatalog-storage" value="${esc(cfg.repo||'')}" autocomplete="off"></div>
      </div>
      <div class="form-group" style="margin-bottom:10px"><label class="form-label" for="gh-token">Personal Access Token</label><div style="position:relative"><input class="form-input" id="gh-token" type="password" placeholder="ghp_xxx" value="${esc(cfg.token||'')}" autocomplete="off" style="padding-right:44px"><button onclick="toggleTokenVisibility()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text3);padding:0;line-height:0"><span class="material-symbols-rounded" id="token-eye" style="font-size:18px">visibility</span></button></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn-sm btn-primary" onclick="saveGHConfig()"><span class="material-symbols-rounded">save</span>Сохранить</button>
        <button class="btn-sm btn-outline" onclick="testGHConfig()"><span class="material-symbols-rounded">wifi_tethering</span>Проверить</button>
        <button class="btn-sm btn-danger" onclick="clearGHConfig()"><span class="material-symbols-rounded">delete</span>Очистить</button>
        <span id="gh-test-result" style="font-size:12px;color:var(--text3)"></span>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-title"><span class="material-symbols-rounded">download</span>Экспорт данных</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn-sm btn-primary" onclick="exportFirebaseData('programs')"><span class="material-symbols-rounded">apps</span>Программы JSON</button>
        <button class="btn-sm btn-primary" onclick="exportFirebaseData('users')"><span class="material-symbols-rounded">group</span>Пользователи JSON</button>
        <button class="btn-sm btn-primary" onclick="exportFirebaseData('support')"><span class="material-symbols-rounded">forum</span>Поддержка JSON</button>
        <button class="btn-sm btn-primary" onclick="exportFirebaseData('settings')"><span class="material-symbols-rounded">settings</span>Настройки JSON</button>
      </div>
    </div>
    <div class="settings-section" style="grid-column:1/-1">
      <div class="settings-title"><span class="material-symbols-rounded">help</span>Как создать Personal Access Token</div>
      <ol style="font-size:13px;color:var(--text2);line-height:1.9;padding-left:18px;margin:0">
        <li>github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
        <li>Generate new token (classic) → название «PyCatalog Storage»</li>
        <li>Срок: No expiration · Галочка: <strong>repo</strong> → Generate token → скопируй!</li>
      </ol>
    </div>
  </div>`;
}
function toggleTokenVisibility(){const inp=document.getElementById('gh-token');const eye=document.getElementById('token-eye');if(!inp||!eye)return;inp.type=inp.type==='password'?'text':'password';eye.textContent=inp.type==='password'?'visibility':'visibility_off';}
function saveGHConfig(){const owner=document.getElementById('gh-owner').value.trim();const repo=document.getElementById('gh-repo').value.trim();const token=document.getElementById('gh-token').value.trim();if(!owner||!repo||!token){showNotif('Заполните все три поля','warn');return;}window.GH_CONFIG={owner,repo,token};localStorage.setItem('pycat_gh_config',JSON.stringify({owner,repo,token}));showNotif('GitHub Storage настроен!');}
function clearGHConfig(){if(!confirm('Очистить настройки?'))return;window.GH_CONFIG={};localStorage.removeItem('pycat_gh_config');renderAdminDatabase();showNotif('Настройки очищены','warn');}
async function testGHConfig(){const cfg=window.GH_CONFIG||{};const res=document.getElementById('gh-test-result');const owner=document.getElementById('gh-owner')?.value.trim()||cfg.owner;const repo=document.getElementById('gh-repo')?.value.trim()||cfg.repo;const token=document.getElementById('gh-token')?.value.trim()||cfg.token;if(!owner||!repo||!token){res.textContent='Заполните поля';res.style.color='var(--yel)';return;}res.textContent='Проверка...';res.style.color='var(--text3)';try{const r=await fetch(`https://api.github.com/repos/${owner}/${repo}`,{headers:{'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json'}});if(r.ok){const d=await r.json();res.textContent=`✅ ${d.full_name}`;res.style.color='var(--grn)';}else if(r.status===401){res.textContent='❌ Неверный токен';res.style.color='var(--red)';}else if(r.status===404){res.textContent='❌ Репозиторий не найден';res.style.color='var(--red)';}else{res.textContent=`⚠️ Статус: ${r.status}`;res.style.color='var(--yel)';}}catch(e){res.textContent='❌ '+e.message;res.style.color='var(--red)';}}
async function exportFirebaseData(col){try{const snap=await FB.getDocs(FB.collection(FB.db,col));const data=snap.docs.map(d=>({id:d.id,...d.data()}));const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);downloadBlob(JSON.stringify(data,null,2),'application/json',`pycatalog_${col}_${ts}.json`);showNotif(`${col}.json скачан`);}catch(e){showNotif('Ошибка: '+e.message,'err');}}

// ══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('admin');
  window.onAuthReady = async function() {
    await loadSettings();
    renderHeaderAuth();
    if(isAdmin()&&!window._pendingUnsub){
      window._pendingUnsub = window.startPendingListener();
    }
    window.onPendingUpdate = function(){
      renderAdminStats();
      if(adminCurrentTab==='programs') renderAdminPrograms();
    };
    renderAdminPage();
  };
});
