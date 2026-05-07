// =============================================
// Page: Admin — Projects
// =============================================

import { adminSidebar } from './index.js';
import { escHtml, timeAgo, showToast, openModal, closeModal } from '../../ui.js';
import { getUser } from '../../auth.js';

export function render() {
  return `
  <div class="admin-layout">
    ${adminSidebar('projects')}
    <div class="admin-content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <h2>Проекты</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <select id="status-filter" style="width:auto;">
            <option value="">Все статусы</option>
            <option value="pending" selected>На модерации</option>
            <option value="approved">Одобрены</option>
            <option value="rejected">Отклонены</option>
          </select>
          <div class="search-bar">
            <span class="search-icon">⌕</span>
            <input type="search" id="proj-search" placeholder="Поиск…" style="width:200px;" />
          </div>
        </div>
      </div>
      <div id="admin-proj-list">
        <div class="loading-overlay"><div class="spinner spinner--sm"></div></div>
      </div>
    </div>
  </div>`;
}

let _projects = [];

export async function init() {
  await loadProjects();
  document.getElementById('status-filter')?.addEventListener('change', applyFilter);
  let timer;
  document.getElementById('proj-search')?.addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(applyFilter, 250);
  });
}

async function loadProjects() {
  try {
    const { db } = window.__firebase;
    const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc')));
    _projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilter();
  } catch (e) {
    document.getElementById('admin-proj-list').innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

function applyFilter() {
  const status = document.getElementById('status-filter')?.value || '';
  const search = (document.getElementById('proj-search')?.value || '').toLowerCase();
  const filtered = _projects.filter(p => {
    if (status && p.status !== status) return false;
    if (search && !(p.name||'').toLowerCase().includes(search) && !(p.authorNick||'').toLowerCase().includes(search)) return false;
    return true;
  });
  renderProjects(filtered);
}

function renderProjects(list) {
  const container = document.getElementById('admin-proj-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📭</div><div class="empty-state__title">Нет проектов</div></div>`;
    return;
  }

  container.innerHTML = list.map(p => `
  <div class="card" style="margin-bottom:.75rem;" id="aproject-${p.id}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.3rem;">
          <span class="status-pill status-pill--${p.status}">${statusLabel(p.status)}</span>
          <span style="font-family:var(--font-display);font-weight:700;">${escHtml(p.name)}</span>
          <span class="badge">${escHtml(p.type||'Python')}</span>
        </div>
        <p style="font-size:.83rem;color:var(--text-secondary);margin-bottom:.35rem;">${escHtml(p.description)}</p>
        <div style="font-size:.78rem;color:var(--text-muted);">
          Автор: ${escHtml(p.authorNick||'Аноним')} · ${timeAgo(p.createdAt)}
          · ⬇ ${p.downloads||0} · ★ ${p.favorites||0}
        </div>
        ${p.rejectReason ? `<div style="color:var(--error);font-size:.8rem;margin-top:.25rem;">Причина отклонения: ${escHtml(p.rejectReason)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:.35rem;flex-shrink:0;">
        <a href="/project/${p.id}" data-link class="btn btn--ghost btn--sm">Открыть</a>
        ${p.status === 'pending' ? `
          <button class="btn btn--primary btn--sm" data-approve="${p.id}">✓ Одобрить</button>
          <button class="btn btn--danger btn--sm" data-reject="${p.id}" data-name="${escHtml(p.name)}">✕ Отклонить</button>
        ` : ''}
        ${p.status === 'approved' ? `<button class="btn btn--warn btn--sm" data-unpublish="${p.id}">Снять с публикации</button>` : ''}
        <button class="btn btn--danger btn--sm" data-del-proj="${p.id}" data-pname="${escHtml(p.name)}">Удалить</button>
      </div>
    </div>
  </div>`).join('');

  container.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', () => moderateProject(btn.dataset.approve, 'approved')));
  container.querySelectorAll('[data-reject]').forEach(btn => btn.addEventListener('click', () => openRejectModal(btn.dataset.reject, btn.dataset.name)));
  container.querySelectorAll('[data-unpublish]').forEach(btn => btn.addEventListener('click', () => moderateProject(btn.dataset.unpublish, 'pending')));
  container.querySelectorAll('[data-del-proj]').forEach(btn => btn.addEventListener('click', () => confirmDelete(btn.dataset.delProj, btn.dataset.pname)));
}

async function moderateProject(id, status, rejectReason = null) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await updateDoc(doc(db, 'projects', id), {
      status,
      rejectReason: rejectReason || null,
      moderatedAt: serverTimestamp(),
      moderatedBy: getUser().uid,
    });
    const p = _projects.find(x => x.id === id);
    if (p) { p.status = status; p.rejectReason = rejectReason; }
    showToast(status === 'approved' ? 'Проект одобрен' : status === 'rejected' ? 'Проект отклонён' : 'Статус обновлён', 'ok');
    applyFilter();
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

function openRejectModal(id, name) {
  openModal(`
    <h3 style="margin-bottom:1rem;">Отклонить «${escHtml(name)}»</h3>
    <div class="form-group">
      <label for="rej-reason">Причина *</label>
      <textarea id="rej-reason" rows="3" placeholder="Опишите причину отклонения…" maxlength="500"></textarea>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn--ghost" id="cancel-rej">Отмена</button>
      <button class="btn btn--danger" id="confirm-rej">Отклонить</button>
    </div>`);
  document.getElementById('cancel-rej')?.addEventListener('click', closeModal);
  document.getElementById('confirm-rej')?.addEventListener('click', async () => {
    const reason = document.getElementById('rej-reason').value.trim();
    if (!reason) { showToast('Введите причину', 'warn'); return; }
    closeModal();
    await moderateProject(id, 'rejected', reason);
  });
}

function confirmDelete(id, name) {
  openModal(`
    <h3 style="margin-bottom:.75rem;">Удалить «${escHtml(name)}»?</h3>
    <p style="color:var(--text-muted);margin-bottom:1.5rem;">Это действие необратимо. Все комментарии к проекту также будут удалены.</p>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button class="btn btn--ghost" id="cancel-del-p">Отмена</button>
      <button class="btn btn--danger" id="confirm-del-p">Удалить</button>
    </div>`);
  document.getElementById('cancel-del-p')?.addEventListener('click', closeModal);
  document.getElementById('confirm-del-p')?.addEventListener('click', async () => {
    closeModal();
    try {
      const { db } = window.__firebase;
      const { doc, deleteDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const cq = query(collection(db, 'comments'), where('projectId', '==', id));
      const cSnap = await getDocs(cq);
      await Promise.all(cSnap.docs.map(d => deleteDoc(doc(db, 'comments', d.id))));
      await deleteDoc(doc(db, 'projects', id));
      _projects = _projects.filter(x => x.id !== id);
      showToast('Проект удалён', 'ok');
      applyFilter();
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
    }
  });
}

function statusLabel(s) {
  return { draft:'Черновик', pending:'На модерации', approved:'Одобрен', rejected:'Отклонён' }[s] || s;
}
