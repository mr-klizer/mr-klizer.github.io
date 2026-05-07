// =============================================
// Page: Admin — Users
// =============================================

import { adminSidebar } from './index.js';
import { getUser, isSuperAdmin } from '../../auth.js';
import { escHtml, formatDate, showToast, openModal, closeModal } from '../../ui.js';

export function render() {
  return `
  <div class="admin-layout">
    ${adminSidebar('users')}
    <div class="admin-content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <h2>Пользователи</h2>
        <div class="search-bar" style="max-width:300px;">
          <span class="search-icon">⌕</span>
          <input type="search" id="user-search" placeholder="Поиск по логину, нику…" />
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Создан</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            <tr><td colspan="6" style="text-align:center;padding:2rem;">
              <div class="spinner spinner--sm" style="margin:0 auto;"></div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

let _users = [];

export async function init() {
  await loadUsers();

  let timer;
  document.getElementById('user-search')?.addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => renderUsers(e.target.value.toLowerCase()), 250);
  });
}

async function loadUsers() {
  try {
    const { db } = window.__firebase;
    const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    _users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUsers('');
  } catch (e) {
    document.getElementById('users-tbody').innerHTML = `<tr><td colspan="6" style="color:var(--error);">Ошибка: ${e.message}</td></tr>`;
  }
}

function renderUsers(filter) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const me = getUser().uid;
  const superAdmin = isSuperAdmin();

  const filtered = filter
    ? _users.filter(u => (u.login||'').includes(filter) || (u.nick||'').toLowerCase().includes(filter) || (u.email||'').includes(filter))
    : _users;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Нет пользователей</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isBanned = u.banned && (!u.banUntil || new Date(u.banUntil?.seconds * 1000) > new Date());
    const isMe = u.id === me;
    const roleLabel = { super_admin: '👑 Гл. Админ', admin: '🛡️ Админ', user: '👤 Пользователь' }[u.role] || u.role;

    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem;">
          <div class="avatar" style="width:30px;height:30px;font-size:.78rem;">${(u.nick||u.login||'U')[0].toUpperCase()}</div>
          <div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:.88rem;">${escHtml(u.nick||u.login)}</div>
            <div style="color:var(--text-muted);font-size:.76rem;">@${escHtml(u.login)}</div>
          </div>
        </div>
      </td>
      <td style="font-size:.83rem;">${escHtml(u.email)}</td>
      <td><span class="badge ${u.role==='super_admin'?'badge--error':u.role==='admin'?'badge--warn':'badge--accent'}">${roleLabel}</span></td>
      <td>
        ${isBanned
          ? `<span class="badge badge--error">Заблокирован${u.banUntil ? ' до ' + new Date(u.banUntil.seconds*1000).toLocaleDateString('ru') : ' навсегда'}</span>`
          : `<span class="badge badge--ok">Активен</span>`}
      </td>
      <td style="font-size:.8rem;color:var(--text-muted);">${formatDate(u.createdAt)}</td>
      <td>
        ${isMe || u.role === 'super_admin' ? '<span style="color:var(--text-muted);font-size:.8rem;">—</span>' : `
        <div style="display:flex;gap:.35rem;flex-wrap:wrap;">
          ${isBanned
            ? `<button class="btn btn--ghost btn--sm" data-unban="${u.id}">Разблокировать</button>`
            : `<button class="btn btn--warn btn--sm" data-ban="${u.id}" data-name="${escHtml(u.nick||u.login)}">Заблокировать</button>`}
          ${superAdmin && u.role !== 'super_admin' ? `
            <button class="btn btn--ghost btn--sm" data-role="${u.id}" data-current="${u.role}" data-name="${escHtml(u.nick||u.login)}">Роль</button>
          ` : ''}
        </div>`}
      </td>
    </tr>`;
  }).join('');

  // Bind events
  tbody.querySelectorAll('[data-ban]').forEach(btn => {
    btn.addEventListener('click', () => openBanModal(btn.dataset.ban, btn.dataset.name));
  });
  tbody.querySelectorAll('[data-unban]').forEach(btn => {
    btn.addEventListener('click', () => unbanUser(btn.dataset.unban));
  });
  tbody.querySelectorAll('[data-role]').forEach(btn => {
    btn.addEventListener('click', () => openRoleModal(btn.dataset.role, btn.dataset.current, btn.dataset.name));
  });
}

function openBanModal(uid, name) {
  openModal(`
    <h3 style="margin-bottom:1rem;">Заблокировать «${escHtml(name)}»</h3>
    <div class="form-group">
      <label for="ban-reason">Причина *</label>
      <input type="text" id="ban-reason" placeholder="Нарушение правил…" maxlength="200" />
    </div>
    <div class="form-group">
      <label for="ban-duration">Срок блокировки</label>
      <select id="ban-duration">
        <option value="1">1 день</option>
        <option value="3">3 дня</option>
        <option value="7">7 дней</option>
        <option value="30">30 дней</option>
        <option value="365">1 год</option>
        <option value="0">Навсегда</option>
      </select>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn--ghost" id="cancel-ban">Отмена</button>
      <button class="btn btn--danger" id="confirm-ban">Заблокировать</button>
    </div>`);

  document.getElementById('cancel-ban')?.addEventListener('click', closeModal);
  document.getElementById('confirm-ban')?.addEventListener('click', async () => {
    const reason = document.getElementById('ban-reason').value.trim();
    const days = +document.getElementById('ban-duration').value;
    if (!reason) { showToast('Введите причину', 'warn'); return; }
    await banUser(uid, reason, days);
  });
}

async function banUser(uid, reason, days) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const banUntil = days > 0
      ? Timestamp.fromDate(new Date(Date.now() + days * 86400000))
      : null;
    await updateDoc(doc(db, 'users', uid), {
      banned: true,
      banReason: reason,
      banUntil,
      bannedAt: Timestamp.now(),
    });
    const u = _users.find(x => x.id === uid);
    if (u) { u.banned = true; u.banReason = reason; u.banUntil = banUntil; }
    closeModal();
    showToast('Пользователь заблокирован', 'warn');
    renderUsers(document.getElementById('user-search')?.value.toLowerCase() || '');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

async function unbanUser(uid) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await updateDoc(doc(db, 'users', uid), { banned: false, banReason: null, banUntil: null });
    const u = _users.find(x => x.id === uid);
    if (u) { u.banned = false; u.banReason = null; u.banUntil = null; }
    showToast('Пользователь разблокирован', 'ok');
    renderUsers(document.getElementById('user-search')?.value.toLowerCase() || '');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

function openRoleModal(uid, currentRole, name) {
  openModal(`
    <h3 style="margin-bottom:1rem;">Изменить роль «${escHtml(name)}»</h3>
    <div class="form-group">
      <label for="new-role">Новая роль</label>
      <select id="new-role">
        <option value="user" ${currentRole==='user'?'selected':''}>👤 Пользователь</option>
        <option value="admin" ${currentRole==='admin'?'selected':''}>🛡️ Администратор</option>
      </select>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn--ghost" id="cancel-role">Отмена</button>
      <button class="btn btn--primary" id="confirm-role">Сохранить</button>
    </div>`);

  document.getElementById('cancel-role')?.addEventListener('click', closeModal);
  document.getElementById('confirm-role')?.addEventListener('click', async () => {
    const newRole = document.getElementById('new-role').value;
    try {
      const { db } = window.__firebase;
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      const u = _users.find(x => x.id === uid);
      if (u) u.role = newRole;
      closeModal();
      showToast('Роль изменена', 'ok');
      renderUsers(document.getElementById('user-search')?.value.toLowerCase() || '');
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
    }
  });
}
