'use strict';
// catalog.js — логика главной страницы каталога
let catalogUnsubscribe = null;
let pendingUnsubscribe = null;

// ══════════════════════════════════════════════════
window.onAuthReady = async function(){
  await loadSettings();
  // If Firebase auth has a user but CURRENT_USER isn't loaded yet (e.g. page refresh)
  const fbUser = FB.auth.currentUser;
  if(fbUser && (!window.CURRENT_USER || window.CURRENT_USER.uid !== fbUser.uid)){
    await window.loadUserProfile(fbUser);
  }
  renderHeaderAuth();
  initPyLauncher();
  // Start real-time catalog listener
  if(!catalogUnsubscribe){
    catalogUnsubscribe = window.startCatalogListener();
  }
  // If admin, start pending listener
  if(isAdmin()&&!pendingUnsubscribe){
    pendingUnsubscribe = window.startPendingListener();
  }
};
window.onCatalogUpdate = function(){
  applyFilters();
  updateStats();
  initTypeFilters();
  initTagCloud();
  document.getElementById('header-count').textContent=`${window.CATALOG.length} программ`;
  // Hide loading screen on first load
  const ls=document.getElementById('loading-screen');
  if(ls&&!ls.classList.contains('hidden')){
    ls.classList.add('hidden');
    setTimeout(()=>ls.remove(),400);
  }
};
window.onPendingUpdate = function(){
  if(document.getElementById('page-admin').classList.contains('active')){
    renderAdminStats();
    if(adminCurrentTab==='programs')renderAdminPrograms();
  }
};

// Fallback: hide loading screen after 8 seconds even if Firebase fails
setTimeout(()=>{
  const ls=document.getElementById('loading-screen');
  if(ls&&!ls.classList.contains('hidden')){
    ls.classList.add('hidden');
    setTimeout(()=>ls.remove(),400);
    // Check if config is still placeholder
    const txt=document.getElementById('loading-text');
    // Config is now hardcoded — no placeholder check needed
    const isPlaceholder = false;
    if(isPlaceholder){
      showNotif('⚠️ Замените данные Firebase в файле index.html на свои!','err');
    }else{
      showNotif('Не удалось подключиться к Firebase. Проверьте правила Firestore и интернет-соединение.','err');
    }
  }
},8000);

// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
let filtered=[],activeType='',activeTags=new Set();
function updateStats(){
  document.getElementById('stat-total').textContent=window.CATALOG.length;
  document.getElementById('stat-web').textContent=window.CATALOG.filter(i=>i.type==='Web-приложение').length;
  document.getElementById('stat-bots').textContent=window.CATALOG.filter(i=>i.type==='Бот').length;
  document.getElementById('stat-cli').textContent=window.CATALOG.filter(i=>i.type==='CLI-программа').length;
}
function initTypeFilters(){
  const cnt={};window.CATALOG.forEach(i=>cnt[i.type]=(cnt[i.type]||0)+1);
  const icons={'Web-приложение':'language','Бот':'smart_toy','Data Science':'analytics','CLI-программа':'terminal','Библиотека':'library_books'};
  const el=document.getElementById('type-filters');el.innerHTML='';
  const all=document.createElement('button');all.className='filter-btn'+(activeType===''?' active':'');
  all.innerHTML=`<span><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;margin-right:6px">apps</span>Все типы</span><span class="filter-count">${window.CATALOG.length}</span>`;
  all.onclick=()=>setTypeFilter('',all);el.appendChild(all);
  SITE_SETTINGS.types.forEach(type=>{
    const btn=document.createElement('button');btn.className='filter-btn'+(activeType===type?' active':'');
    btn.innerHTML=`<span><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;margin-right:6px">${icons[type]||'code'}</span>${type}</span><span class="filter-count">${cnt[type]||0}</span>`;
    btn.onclick=()=>setTypeFilter(type,btn);el.appendChild(btn);
  });
}
function initTagCloud(){
  const c={};window.CATALOG.forEach(i=>(i.tags||[]).forEach(t=>c[t]=(c[t]||0)+1));
  const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,20);
  document.getElementById('tag-cloud').innerHTML=top.map(([t])=>`<span class="tag-pill${activeTags.has(t)?' active':''}" onclick="toggleTag('${t}',this)">${t}</span>`).join('');
}
function onSearch(){applyFilters();}
function setTypeFilter(type,btn){activeType=type;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}
function toggleTag(tag,el){if(activeTags.has(tag)){activeTags.delete(tag);el.classList.remove('active');}else{activeTags.add(tag);el.classList.add('active');}applyFilters();}
function applyFilters(){
  const q=document.getElementById('main-search')?.value.toLowerCase()||'';
  const sort=document.getElementById('sort-select')?.value||'stars';
  filtered=window.CATALOG.filter(i=>{
    const mT=!activeType||i.type===activeType;
    const mTg=!activeTags.size||[...activeTags].every(t=>(i.tags||[]).includes(t));
    const mQ=!q||i.name?.toLowerCase().includes(q)||(i.description||'').toLowerCase().includes(q)||(i.tags||[]).some(t=>t.includes(q));
    return mT&&mTg&&mQ;
  });
  if(sort==='stars')filtered.sort((a,b)=>(b.stars||0)-(a.stars||0));
  else if(sort==='name')filtered.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  else filtered.sort((a,b)=>((b.addedAt?.seconds||0)-(a.addedAt?.seconds||0)));
  document.getElementById('search-count').textContent=filtered.length!==window.CATALOG.length?filtered.length:'';
  renderGrid(filtered);
}

// ══════════════════════════════════════════════════
// RENDER CARDS
// ══════════════════════════════════════════════════
function renderGrid(items){
  const el=document.getElementById('cards-grid');
  const ri=document.getElementById('results-info');
  if(ri)ri.textContent=`Найдено: ${items.length} из ${window.CATALOG.length}`;
  if(!items.length){el.innerHTML=`<div class="empty"><span class="material-symbols-rounded">search_off</span><div class="empty-title">Ничего не найдено</div></div>`;return;}
  el.innerHTML=items.map(i=>renderCard(i)).join('');
}
function renderCard(i,extra=''){
  const u=curUser();const isLiked=u&&(i.likes||[]).includes(u.uid);
  const cmtCount=i.commentCount||0;
  return `<div class="card" onclick="openModal('${i.id}')">
    <div class="card-top">
      <div class="card-name">${esc(i.name)}</div>
      <div class="card-meta"><div class="stars"><span class="material-symbols-rounded">star</span>${i.stars||0}</div><span class="type-pill ${typeClass[i.type]||'tp-def'}" ${getTypePillStyle(i.type)}>${i.type}</span></div>
    </div>
    <div class="card-desc">${esc(i.description)}</div>
    <div class="card-tags">${(i.tags||[]).slice(0,5).map(t=>`<span class="card-tag">#${t}</span>`).join('')}${(i.tags||[]).length>5?`<span class="card-tag">+${(i.tags||[]).length-5}</span>`:''}</div>
    <div class="card-footer">
      <span class="card-author">${esc(i.author||'community')} · v${esc(i.version||'1.0')}</span>
      <button class="like-btn ${isLiked?'liked':''}" onclick="event.stopPropagation();toggleLike('${i.id}',this)"><span class="material-symbols-rounded">star</span>${i.stars||0}</button>
      ${cmtCount?`<span style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:3px"><span class="material-symbols-rounded" style="font-size:13px">forum</span>${cmtCount}</span>`:''}
      <button class="btn-sm btn-outline" onclick="event.stopPropagation();openModal('${i.id}')"><span class="material-symbols-rounded">visibility</span>Подробнее</button>
      <button class="btn-sm btn-primary" id="dl-btn-${i.id}" onclick="event.stopPropagation();triggerDownload('${i.id}')"><span class="material-symbols-rounded">download</span>Скачать</button>
    </div>${extra}</div>`;
}

// ══════════════════════════════════════════════════
// LIKES — Firestore atomic increment
// ══════════════════════════════════════════════════
async function toggleLike(id,btn){
  const u=curUser();if(!u){showNotif('Войдите чтобы ставить лайки','warn');return;}
  const item=window.CATALOG.find(i=>i.id===id);if(!item)return;
  const ref=FB.doc(FB.db,'programs',id);
  const isLiked=(item.likes||[]).includes(u.uid);
  try{
    await FB.updateDoc(ref,{
      likes:isLiked?FB.arrayRemove(u.uid):FB.arrayUnion(u.uid),
      stars:FB.increment(isLiked?-1:1)
    });
    // Optimistic update
    if(isLiked){item.likes=(item.likes||[]).filter(x=>x!==u.uid);item.stars=Math.max(0,(item.stars||1)-1);}
    else{item.likes=[...(item.likes||[]),u.uid];item.stars=(item.stars||0)+1;}
    if(btn){btn.classList.toggle('liked',!isLiked);btn.innerHTML=`<span class="material-symbols-rounded">star</span>${item.stars}`;}
    // Update modal if open
    if(currentItem&&currentItem.id===id){
      document.getElementById('m-like-btn').classList.toggle('liked',!isLiked);
      document.getElementById('m-like-count').textContent=item.stars;
    }
  }catch(e){showNotif('Ошибка: '+e.message,'err');}
}
function toggleLikeModal(){if(!currentItem)return;const btn=document.getElementById('m-like-btn');toggleLike(currentItem.id,btn);}

// ══════════════════════════════════════════════════
// MODAL: DETAIL
// ══════════════════════════════════════════════════
let currentItem=null;
async function openModal(id){
  const item=window.CATALOG.find(i=>i.id===id)||window.PENDING.find(i=>i.id===id);
  if(!item)return;
  currentItem=item;
  const u=curUser();const canEdit=u&&(u.uid===item.authorId||isAdmin());
  document.getElementById('m-title').textContent=item.name||'';
  document.getElementById('m-meta').textContent=`v${item.version||'1.0'}  ·  ${item.author||'community'}`;
  document.getElementById('m-edit-btn').style.display=canEdit?'flex':'none';
  document.getElementById('m-info-grid').innerHTML=`
    <div class="info-item"><div class="info-item-lbl">Тип</div><div class="info-item-val"><span class="type-pill ${typeClass[item.type]||'tp-def'}" ${getTypePillStyle(item.type)}>${item.type}</span></div></div>
    <div class="info-item"><div class="info-item-lbl">Версия</div><div class="info-item-val" style="font-family:var(--mono)">${item.version||'1.0'}</div></div>
    <div class="info-item"><div class="info-item-lbl">Автор</div><div class="info-item-val">${esc(item.author||'community')}</div></div>
    <div class="info-item"><div class="info-item-lbl">Рейтинг</div><div class="info-item-val stars-big"><span class="material-symbols-rounded" style="font-size:16px">star</span>${item.stars||0}</div></div>`;
  document.getElementById('m-tags').innerHTML=(item.tags||[]).map(t=>`<span class="tag-pill">#${t}</span>`).join('');
  document.getElementById('m-readme').innerHTML=marked.parse(item.readme||'Нет документации');
  document.getElementById('m-req').textContent=item.requirements||'—';
  const isLiked=u&&(item.likes||[]).includes(u.uid);
  document.getElementById('m-like-btn').classList.toggle('liked',isLiked);
  document.getElementById('m-like-count').textContent=item.stars||0;
  // Archive
  const archSec=document.getElementById('m-archive-section');
  if(item.archiveUrl){
    archSec.style.display='block';
    document.getElementById('m-download-project').style.display='flex';
    document.getElementById('m-archive-name').textContent=item.archiveName||'project.zip';
    document.getElementById('m-archive-meta').textContent=item.archiveSize?fmtSize(item.archiveSize)+' · GitHub Storage':'Хранится в GitHub репозитории';
    document.getElementById('m-archive-tree').innerHTML='<div style="padding:12px;font-size:13px;color:var(--text2)">Файлы доступны для скачивания</div>';
  }else{archSec.style.display='none';document.getElementById('m-download-project').style.display='none';}
  document.getElementById('modal').classList.add('open');
  document.querySelectorAll('#m-readme pre code').forEach(b=>hljs.highlightElement(b));
  renderComments(id);
}
function closeModal(){document.getElementById('modal').classList.remove('open');currentItem=null;}
function openEditModal(){if(currentItem)openSubmitModal(currentItem.id);}

// ══════════════════════════════════════════════════
// COMMENTS — Firestore subcollection
// ══════════════════════════════════════════════════
async function renderComments(progId){
  const listEl=document.getElementById('m-comment-list');
  const inputArea=document.getElementById('m-comment-input-area');
  listEl.innerHTML='<div style="padding:12px;color:var(--text3);font-size:13px">Загрузка...</div>';
  try{
    const snap=await FB.getDocs(FB.query(FB.collection(FB.db,'programs',progId,'comments'),FB.orderBy('at','asc')));
    const cmts=snap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('m-comment-count').textContent=cmts.length?`(${cmts.length})`:'';
    if(!cmts.length){listEl.innerHTML='<div class="comment-empty">Комментариев пока нет. Будьте первым!</div>';}
    else{
      const u=curUser();
      listEl.innerHTML=cmts.map(c=>{
        const rankLabel=c.userRank==='superadmin'?'<span class="comment-rank rank-superadmin">ГЛ. АДМИНИСТРАТОР</span>':c.userRank==='admin'?'<span class="comment-rank rank-admin">ADMIN</span>':'';
        const canDel=u&&(u.uid===c.userId||isAdmin());
        const col=c.userColor||avatarColor(c.userNick||'?');
        return `<div class="comment-item" id="cmt-${c.id}">
          <div class="comment-header">
            <div class="comment-avatar" style="background:${col}">${esc((c.userNick||'?').charAt(0).toUpperCase())}</div>
            <span class="comment-author">${esc(c.userNick||'Аноним')}</span>${rankLabel}
            <span class="comment-time">${timeAgo(c.at)}</span>
            ${canDel?`<button class="comment-del" onclick="deleteComment('${progId}','${c.id}')"><span class="material-symbols-rounded">delete</span></button>`:''}
          </div>
          <div class="comment-text">${esc(c.text).replace(/\n/g,'<br>')}</div>
        </div>`;
      }).join('');
    }
  }catch(e){listEl.innerHTML='<div class="comment-empty">Ошибка загрузки комментариев</div>';}
  const u=curUser();
  if(u&&!isUserBlocked(u)){
    inputArea.innerHTML=`<div class="comment-input-wrap">
      <textarea class="comment-input" id="cmt-input" placeholder="Написать комментарий..." onkeydown="if(event.ctrlKey&&event.key==='Enter')postComment('${progId}')"></textarea>
      <button class="btn-sm btn-primary" style="align-self:flex-end" onclick="postComment('${progId}')"><span class="material-symbols-rounded">send</span></button>
    </div><div style="font-size:11px;color:var(--text3);margin-top:4px">Ctrl+Enter для отправки</div>`;
  }else if(!u){
    inputArea.innerHTML=`<div style="text-align:center;padding:12px;font-size:13px;color:var(--text2)"><a onclick="closeModal();showPage('auth')" style="cursor:pointer;color:var(--acc2)">Войдите</a> чтобы оставить комментарий</div>`;
  }
}
async function postComment(progId){
  const u=curUser();if(!u)return;
  const inp=document.getElementById('cmt-input');const text=inp.value.trim();if(!text)return;
  inp.disabled=true;
  try{
    const comment={userId:u.uid,userNick:u.nick||u.email,userColor:u.color||avatarColor(u.nick||'?'),userRank:u.rank||'user',text,at:FB.serverTimestamp()};
    await FB.addDoc(FB.collection(FB.db,'programs',progId,'comments'),comment);
    await FB.updateDoc(FB.doc(FB.db,'programs',progId),{commentCount:FB.increment(1)});
    inp.value='';renderComments(progId);
  }catch(e){showNotif('Ошибка: '+e.message,'err');}
  inp.disabled=false;
}
async function deleteComment(progId,cmtId){
  try{
    await FB.deleteDoc(FB.doc(FB.db,'programs',progId,'comments',cmtId));
    await FB.updateDoc(FB.doc(FB.db,'programs',progId),{commentCount:FB.increment(-1)});
    renderComments(progId);
  }catch(e){showNotif('Ошибка удаления','err');}
}

// ══════════════════════════════════════════════════
// DOWNLOADS
// ══════════════════════════════════════════════════
async function triggerDownload(id){
  const item=window.CATALOG.find(i=>i.id===id)||window.PENDING.find(i=>i.id===id);
  if(!item)return;
  if(item.archiveUrl){
    const btn=document.getElementById('dl-btn-'+id);
    if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="margin:0;width:14px;height:14px"></div>';}
    try{
      const resp=await fetch(item.archiveUrl);
      if(!resp.ok) throw new Error(''+resp.status);
      const blob=await resp.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=item.archiveName||item.name.replace(/[^a-zA-Z0-9._-]/g,'_')+'.zip';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      showNotif('«'+item.name+'» скачан');
    }catch(e){
      window.open(item.archiveUrl,'_blank');
      showNotif('Открывается в браузере','warn');
    }
    if(btn){btn.disabled=false;btn.innerHTML='<span class="material-symbols-rounded">download</span>Скачать';}
  }else{
    const c='# '+item.name+'\n\n'+item.description+'\n\n'+('readme' in item?item.readme:'');
    downloadBlob(c,'text/markdown',item.name.replace(/\s+/g,'_')+'_README.md');
    showNotif('README.md скачан','warn');
  }
}
async function downloadProject(){
  if(!currentItem||!currentItem.archiveUrl){showNotif('Архив недоступен','err');return;}
  try{
    const resp=await fetch(currentItem.archiveUrl);
    if(!resp.ok) throw new Error(''+resp.status);
    const blob=await resp.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=currentItem.archiveName||currentItem.name.replace(/[^a-zA-Z0-9._-]/g,'_')+'.zip';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    showNotif('Архив скачан');
  }catch(e){
    window.open(currentItem.archiveUrl,'_blank');
    showNotif('Открывается в браузере','warn');
  }
}

// ══════════════════════════════════════════════════


// ── Submit modal (открывается с главной) ──
// ══════════════════════════════════════════════════
let selFiles=[],archiveBlob=null,archiveName='';
let submitTags=[],editingId=null;

// ══════════════════════════════════════════════════
function addTag(t){t=t.toLowerCase().replace(/[^a-zа-яё0-9._-]/gi,'');if(!t||submitTags.includes(t)||submitTags.length>=12)return;submitTags.push(t);const inp=document.getElementById('tag-inp');const pill=document.createElement('span');pill.className='form-tag-item';pill.dataset.tag=t;pill.innerHTML=`${t}<button class="form-tag-remove" onclick="removeTag('${t}')" type="button">×</button>`;document.getElementById('tags-wrap').insertBefore(pill,inp);}

function clearFiles(){selFiles=[];archiveBlob=null;archiveName='';document.getElementById('file-list').innerHTML='';document.getElementById('archive-result').style.display='none';document.getElementById('processing-bar').style.display='none';document.getElementById('upload-zone').classList.remove('has-files');document.getElementById('clear-files-btn').style.display='none';document.getElementById('file-input').value='';document.getElementById('folder-input').value='';document.getElementById('s-files-err').style.display='none';}


async function deleteAccount(){

function handleFileSelect(fileList){const files=[...fileList];if(!files.length)return;selFiles=files;archiveBlob=null;archiveName='';renderFileList(files);processFiles(files);}

function handleTagInput(e){const inp=document.getElementById('tag-inp');if(e.key==='Enter'||e.key===','||e.key===' '){e.preventDefault();addTag(inp.value.replace(/,/g,'').trim());inp.value='';inp.size=12;}else if(e.key==='Backspace'&&!inp.value&&submitTags.length)removeTag(submitTags[submitTags.length-1]);}

function openNewTicket(){document.getElementById('new-ticket-form').style.display='block';document.getElementById('ticket-subject').focus();}

function openSubmitModal(existingId=null){
  const u=curUser();if(!u){showPage('auth');return;}
  editingId=existingId;const isEdit=!!existingId;
  const item=isEdit?(window.CATALOG.find(i=>i.id===existingId)||window.PENDING.find(i=>i.id===existingId)):null;
  const sel=document.getElementById('s-type');sel.innerHTML='<option value="">— Выберите тип —</option>';
  SITE_SETTINGS.types.forEach(t=>sel.add(new Option(t,t)));
  document.getElementById('submit-modal-title').textContent=isEdit?'Редактировать программу':'Добавить программу';
  document.getElementById('submit-modal-sub').textContent=isEdit?'Изменения сохранятся сразу':'После проверки программа появится в каталоге';
  document.getElementById('submit-btn').innerHTML=isEdit?`<span class="material-symbols-rounded">save</span>Сохранить`:`<span class="material-symbols-rounded">send</span>Отправить`;
  document.getElementById('s-edit-id').value=existingId||'';
  submitTags=item?[...item.tags]:[];selFiles=[];archiveBlob=null;archiveName='';
  document.getElementById('s-name').value=item?.name||'';
  document.getElementById('s-desc').value=item?.description||'';
  document.getElementById('s-type').value=item?.type||'';
  document.getElementById('s-version').value=item?.version||'1.0.0';
  document.getElementById('s-author').value=item?.author||'';
  document.getElementById('s-req').value=item?.requirements||'';
  document.getElementById('s-readme').value=item?.readme||'';
  document.getElementById('tags-wrap').innerHTML=`<input class="form-tag-input" id="tag-inp" placeholder="Добавь тег" onkeydown="handleTagInput(event)" oninput="this.size=Math.max(12,this.value.length+2)">`;
  submitTags.forEach(t=>{const pill=document.createElement('span');pill.className='form-tag-item';pill.dataset.tag=t;pill.innerHTML=`${t}<button class="form-tag-remove" onclick="removeTag('${t}')" type="button">×</button>`;document.getElementById('tags-wrap').insertBefore(pill,document.getElementById('tag-inp'));});
  document.getElementById('submit-preview').style.display='none';
  document.querySelectorAll('[id^="s-"][id$="-err"]').forEach(e=>e.style.display='none');
  clearFiles();
  document.getElementById('s-files-group').style.display=isEdit?'none':'block';
  document.getElementById('submit-modal').classList.add('open');
}

async function processFiles(files){
  const bar=document.getElementById('processing-bar'),msg=document.getElementById('processing-msg'),det=document.getElementById('processing-detail');
  document.getElementById('archive-result').style.display='none';
  if(files.length===1){const f=files[0];const n=f.name.toLowerCase();if(n.endsWith('.zip')||n.endsWith('.tar.gz')){bar.style.display='flex';msg.textContent='Проверка архива...';det.textContent=f.name;archiveBlob=new Blob([await f.arrayBuffer()],{type:'application/zip'});archiveName=f.name;bar.style.display='none';showArchiveRes(f.name,f.size,'ZIP (оригинал)',false);return;}}
  bar.style.display='flex';msg.textContent='Создание ZIP...';det.textContent='';
  try{
    const zip=new JSZip();const sName=document.getElementById('s-name').value.trim().replace(/\s+/g,'_')||'project';
    const readmeContent=document.getElementById('s-readme').value.trim();const reqContent=document.getElementById('s-req').value.trim();
    const fileNames=files.map(f=>(f._uploadPath||f.webkitRelativePath||f.name).toLowerCase());
    let processed=0;
    for(const f of files){const path=f._uploadPath||f.webkitRelativePath||f.name;zip.file(files.length===1?f.name:path,await f.arrayBuffer());processed++;det.textContent=`${processed}/${files.length}: ${f.name}`;}
    if(readmeContent&&!fileNames.some(n=>n.endsWith('readme.md')))zip.file('README.md',readmeContent);
    if(reqContent&&!fileNames.some(n=>n.endsWith('requirements.txt')))zip.file('requirements.txt',reqContent);
    msg.textContent='Сжатие...';
    archiveBlob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},m=>{det.textContent=`${m.percent.toFixed(0)}%`;});
    archiveName=sName+'.zip';
    bar.style.display='none';showArchiveRes(archiveName,archiveBlob.size,`ZIP (${files.length} ${plural(files.length,'файл','файла','файлов')})`,true);
  }catch(err){bar.style.display='none';showNotif('Ошибка архивирования: '+err.message,'err');}
}

function removeTag(t){submitTags=submitTags.filter(x=>x!==t);const el=document.querySelector(`.form-tag-item[data-tag="${t}"]`);if(el)el.remove();}

function renderFileList(files){
  document.getElementById('upload-zone').classList.add('has-files');document.getElementById('clear-files-btn').style.display='flex';

function downloadUtil(){if(currentItem){const c=`# ${currentItem.name}\n\n${currentItem.readme||''}`;downloadBlob(c,'text/markdown',currentItem.name.replace(/\s+/g,'_')+'_README.md');showNotif('README.md скачан');}}

function handleDrop(e){e.preventDefault();document.getElementById('upload-zone').classList.remove('drag-over');const files=[...e.dataTransfer.files];handleFileSelect(files);}
  document.getElementById('archive-result-name').textContent=name;document.getElementById('archive-result-info').textContent=(zipped?'✓ Архивировано · ':'✓ Готово · ')+fmtSize(size);document.getElementById('archive-result-badge').textContent=badge;document.getElementById('archive-result').style.display='flex';
}

async function submitTicket(){
  const u=curUser();if(!u){showPage('auth');return;}
  const name=document.getElementById('s-name').value.trim();const desc=document.getElementById('s-desc').value.trim();const type=document.getElementById('s-type').value;const ver=document.getElementById('s-version').value.trim();
  const isEdit=!!editingId;
  let valid=true;
  const se=(id,show)=>{const e=document.getElementById(id);if(e)e.style.display=show?'block':'none';};
  if(!name){se('s-name-err',true);valid=false;}else se('s-name-err',false);
  if(!desc||desc.length<20){se('s-desc-err',true);valid=false;}else se('s-desc-err',false);
  if(!type){se('s-type-err',true);valid=false;}else se('s-type-err',false);
  if(!ver){se('s-version-err',true);valid=false;}else se('s-version-err',false);
  if(!submitTags.length){se('s-tags-err',true);valid=false;}else se('s-tags-err',false);
  if(!isEdit&&!archiveBlob&&!selFiles.length){se('s-files-err',true);valid=false;}else se('s-files-err',false);
  if(!valid)return;
  if(!isEdit&&selFiles.length&&!archiveBlob){showNotif('Дождитесь архивирования','warn');return;}
  const btn=document.getElementById('submit-btn');btn.disabled=true;btn.innerHTML=`<div class="spinner" style="margin:0;width:14px;height:14px"></div>`;
  try{
    let archiveUrl=null,archiveSize=null,archiveNameStr=null,archiveKey=null;
    if(archiveBlob){
      // Upload ZIP to GitHub repository via API
      const cfg=window.GH_CONFIG;
      if(!cfg||!cfg.owner||!cfg.repo||!cfg.token){
        throw new Error('GitHub Storage не настроен. Зайдите в Панель администратора → База данных и введите данные GitHub.');
      }
      showNotif('Загрузка архива на GitHub...','warn');
      const safeName=(name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_.-]/g,'')||'project')+'.zip';
      const ghPath=`archives/${u.uid}/${Date.now()}_${safeName}`;
      // Convert blob to base64
      const arrayBuf = await archiveBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      let binary='';
      for(let i=0;i<uint8.length;i+=8192)binary+=String.fromCharCode(...uint8.slice(i,i+8192));
      const base64=btoa(binary);
      // GitHub Contents API
      const ghRes = await fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${ghPath}`,
        {
          method:'PUT',
          headers:{
            'Authorization':`Bearer ${cfg.token}`,
            'Content-Type':'application/json',
            'Accept':'application/vnd.github+json',
            'X-GitHub-Api-Version':'2022-11-28',
          },
          body:JSON.stringify({
            message:`Upload archive: ${safeName}`,
            content:base64,
          }),
        }
      );
      if(!ghRes.ok){
        const err=await ghRes.json().catch(()=>({}));
        throw new Error('Ошибка GitHub API: '+(err.message||ghRes.status));
      }
      const ghData=await ghRes.json();
      archiveUrl=ghData.content.download_url;
      archiveSize=archiveBlob.size;
      archiveNameStr=safeName;
      archiveKey=ghPath;
    }
    const progData={
      name,description:desc,type,tags:submitTags,
      author:document.getElementById('s-author').value.trim()||u.nick||u.email,
      authorId:u.uid,version:ver,
      readme:document.getElementById('s-readme').value.trim(),
      requirements:document.getElementById('s-req').value.trim(),
      ...(archiveUrl&&{archiveUrl,archiveSize,archiveName:archiveNameStr,archiveKey}),
    };
    if(isEdit){
      // Check permission
      const origItem=window.CATALOG.find(i=>i.id===editingId)||window.PENDING.find(i=>i.id===editingId);
      if(origItem&&(origItem.authorId===u.uid||isAdmin())){
        await FB.updateDoc(FB.doc(FB.db,'programs',editingId),{...progData,updatedAt:FB.serverTimestamp()});
        showNotif(`«${name}» обновлена!`);
      }else{showNotif('Нет прав для редактирования','err');}
    }else{
      await FB.addDoc(FB.collection(FB.db,'programs'),{...progData,status:'pending',stars:0,likes:[],commentCount:0,submittedAt:FB.serverTimestamp(),addedAt:FB.serverTimestamp()});
      showNotif('Программа отправлена на модерацию!');
    }
    closeSubmitModal();
  }catch(e){showNotif('Ошибка: '+e.message,'err');}
  btn.disabled=false;btn.innerHTML=isEdit?`<span class="material-symbols-rounded">save</span>Сохранить`:`<span class="material-symbols-rounded">send</span>Отправить`;
}

function switchMyTab(t){document.getElementById('tab-liked').classList.toggle('active',t==='liked');document.getElementById('tab-added').classList.toggle('active',t==='added');document.getElementById('my-liked-grid').style.display=t==='liked'?'grid':'none';document.getElementById('my-added-grid').style.display=t==='added'?'grid':'none';}

function switchProfileTab(tab){
  const name=document.getElementById('s-name').value||'Название';const desc=document.getElementById('s-desc').value||'Описание';const type=document.getElementById('s-type').value||'CLI-программа';const ver=document.getElementById('s-version').value||'1.0.0';const author=document.getElementById('s-author').value||curUser()?.nick||'вы';
  const preview={id:'preview',name,description:desc,type,tags:submitTags.length?submitTags:['python'],stars:0,author,version:ver};
  document.getElementById('preview-card').innerHTML=renderCard(preview);document.getElementById('submit-preview').style.display='block';
}



// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  marked.setOptions({highlight:(c,l)=>l&&hljs.getLanguage(l)?hljs.highlight(c,{language:l}).value:hljs.highlightAuto(c).value,gfm:true,breaks:true});
  renderHeader('catalog');
  window.onAuthReady = async function() {
    await loadSettings();
    const fbUser = FB.auth.currentUser;
    if(fbUser && (!window.CURRENT_USER || window.CURRENT_USER.uid !== fbUser.uid)){
      await window.loadUserProfile(fbUser);
    }
    renderHeaderAuth();
    initPyLauncher();
    if(!catalogUnsubscribe){ catalogUnsubscribe = window.startCatalogListener(); }
    if(isAdmin()&&!pendingUnsubscribe){ pendingUnsubscribe = window.startPendingListener(); }
  };
  window.onCatalogUpdate = function(){
    applyFilters(); updateStats(); initTypeFilters(); initTagCloud();
    const hc = document.getElementById('header-count');
    if(hc) hc.textContent = window.CATALOG.length + ' программ';
    const ls=document.getElementById('loading-screen');
    if(ls&&!ls.classList.contains('hidden')){ls.classList.add('hidden');setTimeout(()=>ls.remove(),400);}
  };
  setTimeout(()=>{
    const ls=document.getElementById('loading-screen');
    if(ls&&!ls.classList.contains('hidden')){ls.classList.add('hidden');setTimeout(()=>ls.remove(),400);
      showNotif('Не удалось подключиться к Firebase. Проверьте правила Firestore и интернет-соединение.','err');
    }
  },8000);
});

// ══════════════════════════════════════════════════
function initPyLauncher(){
  const cfg=SITE_SETTINGS.pylauncher||{};
  const banner=document.getElementById('pylauncher-banner');
  const iconEl=document.getElementById('pylauncher-icon');
  const verEl=document.getElementById('pylauncher-ver');
  if(!banner)return;
  if(iconEl)iconEl.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 583 587" width="52" height="52"><g><path fill="#f9f9f9" d="M 74.5,11.5 C 98.4054,29.473 124.072,44.973 151.5,58C 173.75,67.8057 196.75,75.3057 220.5,80.5C 173.847,127.653 127.014,174.653 80,221.5C 67.5426,167.922 44.376,119.589 10.5,76.5C 21.1504,44.1838 42.4837,22.5172 74.5,11.5 Z"/></g><g><path fill="#f9f9f9" d="M 504.5,11.5 C 537.494,21.6594 559.494,43.1594 570.5,76C 536.738,119.359 513.572,167.859 501,221.5C 453.986,174.653 407.153,127.653 360.5,80.5C 414.153,68.6686 462.153,45.6686 504.5,11.5 Z"/></g><g><path fill="#f7f7f7" d="M 218.5,220.5 C 236.893,217.791 252.393,223.124 265,236.5C 274.381,250.212 277.048,265.212 273,281.5C 267.18,301.32 254.013,312.487 233.5,315C 218.19,316.208 202.857,316.708 187.5,316.5C 187.5,335.833 187.5,355.167 187.5,374.5C 177.167,374.5 166.833,374.5 156.5,374.5C 156.5,323.167 156.5,271.833 156.5,220.5C 177.167,220.5 197.833,220.5 218.5,220.5 Z"/></g><g><path fill="#f9f9f9" d="M 300.5,221.5 C 310.833,221.5 321.167,221.5 331.5,221.5C 331.168,264.003 331.501,306.337 332.5,348.5C 358.167,348.5 383.833,348.5 409.5,348.5C 409.5,357.167 409.5,365.833 409.5,374.5C 373.167,374.5 336.833,374.5 300.5,374.5C 300.5,323.5 300.5,272.5 300.5,221.5 Z"/></g><g><path fill="#f9f9f9" d="M 78.5,361.5 C 126.25,407.749 173.583,454.582 220.5,502C 166.739,514.634 118.239,537.801 75,571.5C 42.6328,560.633 21.1328,538.966 10.5,506.5C 44.6984,463.761 67.3651,415.427 78.5,361.5 Z"/></g><g><path fill="#f9f9f9" d="M 500.5,361.5 C 510.108,401.079 525.608,438.412 547,473.5C 554.848,484.677 562.681,495.844 570.5,507C 559.62,539.38 537.953,560.88 505.5,571.5C 462.591,537.549 414.257,514.549 360.5,502.5C 407.188,455.479 453.854,408.479 500.5,361.5 Z"/></g></svg>`;
  if(cfg.enabled&&cfg.downloadUrl){
    banner.style.display='block';
    if(verEl)verEl.textContent='v'+cfg.version+' · только для Windows';
  }else{
    banner.style.display='none';
  }
}
async function downloadPyLauncher(){
  const cfg=SITE_SETTINGS.pylauncher||{};
  if(!cfg.downloadUrl){showNotif('Ссылка на скачивание не настроена','err');return;}
  const btn=document.getElementById('pylauncher-dl-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="margin:0;width:16px;height:16px"></div>&nbsp;Загрузка...';}
  try{
    const resp=await fetch(cfg.downloadUrl);
    if(!resp.ok)throw new Error(''+resp.status);
    const blob=await resp.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=cfg.downloadUrl.split('/').pop()||'PyLauncher.zip';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    showNotif('PyLauncher скачан!');
  }catch(e){
    window.open(cfg.downloadUrl,'_blank');
    showNotif('Открывается в браузере','warn');
  }
  if(btn){btn.disabled=false;btn.innerHTML='<span class="material-symbols-rounded" style="font-size:18px">download</span>Скачать для Windows';}
}
async function savePyLauncherSettings(){
  const enabled=document.getElementById('pl-enabled')?.checked||false;
  const url=document.getElementById('pl-url')?.value.trim()||'';
  const version=document.getElementById('pl-ver')?.value.trim()||'1.0.0';
  SITE_SETTINGS.pylauncher={enabled,downloadUrl:url,version};
  await saveSettings();
  initPyLauncher();
  showNotif('Настройки PyLauncher сохранены!');
}

// ══════════════════════════════════════════════════