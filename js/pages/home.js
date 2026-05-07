// =============================================
// Page: Home
// =============================================

import { escHtml, formatDate, timeAgo } from '../ui.js';

export async function render() {
  return `
  <div class="page page--wide" style="padding-top:0;">

    <!-- HERO -->
    <section class="hero">
      <p class="hero__eyebrow">⬡ Каталог Python проектов</p>
      <h1 class="hero__title">
        Открой, скачай,<br>
        <span class="line-accent">запусти</span>
      </h1>
      <p class="hero__desc">
        PyCatalog — место, где разработчики делятся Python проектами.
        Быстрый поиск, ZIP-архивы одной кнопкой, система комментариев и облачное хранение.
      </p>
      <div class="hero__actions">
        <a href="/catalog" data-link class="btn btn--primary btn--lg">Смотреть каталог</a>
        <a href="/add-project" data-link class="btn btn--ghost btn--lg">Добавить проект</a>
      </div>
      <div class="hero__stats" id="hero-stats">
        <div class="stat"><div class="stat__num" id="stat-projects">—</div><div class="stat__label">Проектов</div></div>
        <div class="stat"><div class="stat__num" id="stat-users">—</div><div class="stat__label">Авторов</div></div>
        <div class="stat"><div class="stat__num" id="stat-downloads">—</div><div class="stat__label">Скачиваний</div></div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="section page" style="padding-top:0;">
      <div class="section-header">
        <h2 class="section-title"><span class="accent-dot"></span>Возможности</h2>
      </div>
      <div class="features-grid">
        ${[
          ['⚡', 'Быстрый поиск', 'Фильтрация по типу, тегам и ключевым словам — результаты мгновенно.'],
          ['📦', 'Скачивание ZIP', 'Полный архив проекта одной кнопкой. Хранение на GitHub.'],
          ['⭐', 'Избранное', 'Отмечай понравившиеся проекты — доступны с любого устройства.'],
          ['💬', 'Комментарии', 'Обсуждай проекты, задавай вопросы прямо на странице.'],
          ['🛡️', 'Модерация', 'Каждый проект проходит проверку перед публикацией.'],
          ['☁️', 'Облачная база', 'Firebase Firestore — данные синхронизируются везде.'],
        ].map(([icon, title, desc]) => `
          <div class="feature-card">
            <div class="feature-card__icon">${icon}</div>
            <div class="feature-card__title">${title}</div>
            <p class="feature-card__desc">${desc}</p>
          </div>`).join('')}
      </div>
    </section>

    <!-- LATEST PROJECTS -->
    <section class="section page" style="padding-top:0;">
      <div class="section-header">
        <h2 class="section-title"><span class="accent-dot"></span>Последние проекты</h2>
        <a href="/catalog" data-link class="btn btn--ghost btn--sm">Все проекты →</a>
      </div>
      <div class="project-grid" id="latest-projects">
        ${[1,2,3,4,5,6].map(() => `
          <div class="card">
            <div class="skeleton" style="height:1.2rem;width:60%;margin-bottom:.75rem;"></div>
            <div class="skeleton" style="height:.85rem;width:100%;margin-bottom:.4rem;"></div>
            <div class="skeleton" style="height:.85rem;width:80%;margin-bottom:1rem;"></div>
            <div class="skeleton" style="height:1.8rem;width:40%;border-radius:99px;"></div>
          </div>`).join('')}
      </div>
    </section>

    <!-- PYLAUNCH BANNER -->
    <section class="page" style="padding-top:0;padding-bottom:3rem;">
      <div class="pylaunch-banner" id="pylaunch-banner">
        <div>
          <div class="badge badge--accent" style="margin-bottom:.75rem;">Рекомендуем</div>
          <h2 style="font-size:1.8rem;margin-bottom:.5rem;">PyLaunch</h2>
          <p id="pylaunch-desc" style="max-width:400px;margin-bottom:1.5rem;">
            Локальный менеджер Python проектов. Скачивай проекты из PyCatalog и запускай в один клик.
          </p>
          <a href="/pylaunch" data-link class="btn btn--primary">Узнать больше</a>
        </div>
        <div style="font-size:5rem;opacity:.15;user-select:none;">🐍</div>
      </div>
    </section>

  </div>`;
}

export async function init() {
  await loadStats();
  await loadLatestProjects();
}

async function loadStats() {
  try {
    const { db } = window.__firebase;
    const { collection, getCountFromServer, getDocs, query, where, limit } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const [pSnap, uSnap] = await Promise.all([
      getCountFromServer(query(collection(db, 'projects'), where('status', '==', 'approved'))),
      getCountFromServer(collection(db, 'users')),
    ]);

    document.getElementById('stat-projects').textContent = pSnap.data().count;
    document.getElementById('stat-users').textContent    = uSnap.data().count;

    // Total downloads from settings doc
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const s = await getDoc(doc(db, 'settings', 'stats'));
    document.getElementById('stat-downloads').textContent = s.exists() ? (s.data().totalDownloads || 0) : 0;
  } catch (e) {
    ['stat-projects','stat-users','stat-downloads'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }
}

async function loadLatestProjects() {
  try {
    const { db } = window.__firebase;
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(
      collection(db, 'projects'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    const snap = await getDocs(q);
    const container = document.getElementById('latest-projects');
    if (!container) return;

    if (snap.empty) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__title">Проектов пока нет</div>
        <p>Станьте первым — добавьте свой проект!</p>
      </div>`;
      return;
    }

    container.innerHTML = snap.docs.map(d => projectCard(d.id, d.data())).join('');
    container.querySelectorAll('.project-card-link').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        window.router.navigate('/project/' + el.dataset.id);
      });
    });
  } catch (e) {
    console.error('loadLatestProjects:', e);
  }
}

function projectCard(id, p) {
  return `
  <div class="project-card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;">
      <h3 class="project-card__title">
        <a href="/project/${id}" data-link class="project-card-link" data-id="${id}"
           style="color:inherit;text-decoration:none;">${escHtml(p.name)}</a>
      </h3>
      <button class="project-card__star ${p._isFav ? 'active' : ''}" data-fav="${id}" title="В избранное">★</button>
    </div>
    <p class="project-card__desc">${escHtml(p.description)}</p>
    <div class="project-card__meta">
      <span class="badge">${escHtml(p.type || 'Python')}</span>
      ${(p.tags || []).slice(0,3).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
    </div>
    <div class="project-card__actions">
      <a href="/project/${id}" data-link class="btn btn--ghost btn--sm project-card-link" data-id="${id}">Подробнее</a>
      ${p.downloadUrl ? `<a href="${escHtml(p.downloadUrl)}" target="_blank" class="btn btn--primary btn--sm" data-dl="${id}">↓ ZIP</a>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem;">
      <span style="color:var(--text-muted);font-size:.75rem;">${escHtml(p.authorNick || 'Аноним')}</span>
      <span style="color:var(--text-muted);font-size:.75rem;">·</span>
      <span style="color:var(--text-muted);font-size:.75rem;" title="${formatDate(p.createdAt)}">${timeAgo(p.createdAt)}</span>
    </div>
  </div>`;
}
