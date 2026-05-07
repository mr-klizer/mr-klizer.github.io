// =============================================
// Page: Admin — Dashboard
// =============================================

import { isAdmin, isSuperAdmin } from '../../auth.js';
import { escHtml, formatDate, timeAgo } from '../../ui.js';

export function render() {
  return `
  <div class="admin-layout">
    ${adminSidebar('dashboard')}
    <div class="admin-content">
      <h2 style="margin-bottom:1.5rem;">Панель администратора</h2>
      <div id="admin-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-bottom:2rem;">
        ${['Проекты','Пользователи','Тикеты','На модерации'].map(label => `
          <div class="card" style="text-align:center;padding:1.25rem;">
            <div class="stat__num" id="stat-${label.toLowerCase().replace(' ','-')}">—</div>
            <div class="stat__label">${label}</div>
          </div>`).join('')}
      </div>

      <h3 style="margin-bottom:1rem;">Последние проекты на модерации</h3>
      <div id="pending-list">
        <div class="loading-overlay" style="padding:2rem;"><div class="spinner spinner--sm"></div></div>
      </div>
    </div>
  </div>`;
}

export async function init() {
  await loadStats();
  await loadPending();
}

async function loadStats() {
  try {
    const { db } = window.__firebase;
    const { collection, getCountFromServer, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const [projects, users, tickets, pending] = await Promise.all([
      getCountFromServer(collection(db, 'projects')),
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'tickets')),
      getCountFromServer(query(collection(db, 'projects'), where('status', '==', 'pending'))),
    ]);
    document.getElementById('stat-проекты').textContent = projects.data().count;
    document.getElementById('stat-пользователи').textContent = users.data().count;
    document.getElementById('stat-тикеты').textContent = tickets.data().count;
    document.getElementById('stat-на-модерации').textContent = pending.data().count;
  } catch (e) { console.error(e); }
}

async function loadPending() {
  const container = document.getElementById('pending-list');
  if (!container) return;
  try {
    const { db } = window.__firebase;
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const q = query(
      collection(db, 'projects'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
      limit(10)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      container.innerHTML = `<p style="color:var(--text-muted);">Нет проектов на модерации ✓</p>`;
      return;
    }
    container.innerHTML = snap.docs.map(d => {
      const p = d.data();
      return `
      <div class="card" style="margin-bottom:.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div>
          <span style="font-family:var(--font-display);font-weight:700;">${escHtml(p.name)}</span>
          <span style="color:var(--text-muted);font-size:.83rem;margin-left:.5rem;">от ${escHtml(p.authorNick)}</span>
          <span style="color:var(--text-muted);font-size:.75rem;margin-left:.5rem;">${timeAgo(p.createdAt)}</span>
        </div>
        <a href="/project/${d.id}" data-link class="btn btn--ghost btn--sm">Проверить →</a>
      </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

export function adminSidebar(active) {
  const superAdmin = isSuperAdmin();
  return `
  <aside class="admin-sidebar">
    <div style="padding:0 1.25rem 1rem;border-bottom:1px solid var(--border);margin-bottom:.5rem;">
      <div style="font-family:var(--font-display);font-size:1rem;font-weight:800;color:var(--accent);">Admin Panel</div>
    </div>

    <div class="admin-sidebar-title">Управление</div>
    <a href="/admin" data-link class="admin-nav-link ${active==='dashboard'?'active':''}">📊 Обзор</a>
    <a href="/admin/projects" data-link class="admin-nav-link ${active==='projects'?'active':''}">📦 Проекты</a>
    <a href="/admin/users" data-link class="admin-nav-link ${active==='users'?'active':''}">👤 Пользователи</a>
    <a href="/admin/tickets" data-link class="admin-nav-link ${active==='tickets'?'active':''}">🎫 Тикеты</a>

    ${superAdmin ? `
    <div class="admin-sidebar-title">Главный Админ</div>
    <a href="/admin/settings" data-link class="admin-nav-link ${active==='settings'?'active':''}">⚙️ Настройки</a>
    ` : ''}

    <div style="padding:1.25rem;margin-top:auto;border-top:1px solid var(--border);">
      <a href="/" data-link class="btn btn--ghost btn--sm btn--full">← На сайт</a>
    </div>
  </aside>`;
}
