// =============================================
// Page: Favorites
// =============================================

import { getUser, getProfile } from '../auth.js';
import { escHtml, timeAgo, showToast } from '../ui.js';

export function render() {
  return `
  <div class="page">
    <h1 style="margin-bottom:2rem;">Избранное</h1>
    <div id="favorites-list">
      <div class="loading-overlay"><div class="spinner"></div></div>
    </div>
  </div>`;
}

export async function init() {
  const profile = getProfile();
  const favIds = profile?.favorites || [];
  const container = document.getElementById('favorites-list');
  if (!container) return;

  if (favIds.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⭐</div>
        <div class="empty-state__title">Избранное пусто</div>
        <p>Нажмите ★ на карточке проекта, чтобы добавить его сюда.</p>
        <a href="/catalog" data-link class="btn btn--primary" style="margin-top:1rem;">Перейти в каталог</a>
      </div>`;
    return;
  }

  try {
    const { db } = window.__firebase;
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const projects = (await Promise.all(
      favIds.map(id => getDoc(doc(db, 'projects', id)).then(s => s.exists() ? { id: s.id, ...s.data() } : null))
    )).filter(Boolean);

    if (projects.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⭐</div><div class="empty-state__title">Проекты не найдены</div></div>`;
      return;
    }

    container.innerHTML = `<div class="project-grid">${projects.map(p => projectCard(p)).join('')}</div>`;

    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); window.router.navigate('/project/' + el.dataset.nav); });
    });

    container.querySelectorAll('[data-unfav]').forEach(btn => {
      btn.addEventListener('click', () => removeFav(btn.dataset.unfav, btn));
    });
  } catch (e) {
    container.innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

function projectCard(p) {
  return `
  <div class="project-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
      <h3 class="project-card__title">
        <a href="#" data-nav="${p.id}" style="color:inherit;text-decoration:none;">${escHtml(p.name)}</a>
      </h3>
      <button class="project-card__star active" data-unfav="${p.id}" title="Убрать из избранного">★</button>
    </div>
    <p class="project-card__desc">${escHtml(p.description)}</p>
    <div class="project-card__meta">
      <span class="badge">${escHtml(p.type || 'Python')}</span>
      ${(p.tags||[]).slice(0,3).map(t=>`<span class="tag">${escHtml(t)}</span>`).join('')}
    </div>
    <div class="project-card__actions">
      <a href="#" data-nav="${p.id}" class="btn btn--ghost btn--sm">Подробнее</a>
      ${p.downloadUrl ? `<a href="${escHtml(p.downloadUrl)}" target="_blank" class="btn btn--primary btn--sm">↓ ZIP</a>` : ''}
    </div>
    <div style="font-size:.75rem;color:var(--text-muted);margin-top:.25rem;">${escHtml(p.authorNick||'Аноним')} · ${timeAgo(p.createdAt)}</div>
  </div>`;
}

async function removeFav(id, btn) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, arrayRemove, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const uid = getUser().uid;
    await Promise.all([
      updateDoc(doc(db, 'users', uid), { favorites: arrayRemove(id) }),
      updateDoc(doc(db, 'projects', id), { favorites: increment(-1) }),
    ]);
    btn.closest('.project-card')?.remove();
    showToast('Удалено из избранного', 'ok');
    // Check if list is now empty
    if (!document.querySelector('.project-card')) {
      document.getElementById('favorites-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⭐</div>
          <div class="empty-state__title">Избранное пусто</div>
          <a href="/catalog" data-link class="btn btn--primary" style="margin-top:1rem;">Перейти в каталог</a>
        </div>`;
    }
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}
