'use strict';
// support.js

function openNewTicket(){document.getElementById('new-ticket-form').style.display='block';document.getElementById('ticket-subject').focus();}
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
async function submitTicket(){
  const u=curUser();if(!u)return;
  const subj=document.getElementById('ticket-subject').value.trim();const msg=document.getElementById('ticket-msg').value.trim();
  if(!subj||!msg){showNotif('Заполните тему и сообщение','warn');return;}
  try{
    await FB.addDoc(FB.collection(FB.db,'support'),{userId:u.uid,userNick:u.nick||u.email,subject:subj,message:msg,reply:'',status:'open',tag:null,createdAt:FB.serverTimestamp()});
    showNotif('Вопрос отправлен! Ответим в ближайшее время.');renderSupportPage();
  }catch(e){showNotif('Ошибка: '+e.message,'err');}
}
function toggleTicket(id){const el=document.getElementById('ticket-body-'+id);if(el)el.style.display=el.style.display==='none'?'block':'none';}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('support');
  window.onAuthReady = async function() {
    await loadSettings();
    renderHeaderAuth();
    renderSupportPage();
  };
});
