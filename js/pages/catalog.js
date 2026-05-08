// =============================================
// Page: Catalog
// =============================================

import { APP_CONFIG } from '../config.js';
import { escHtml, timeAgo, formatDate, renderPagination, initPagination, showToast } from '../ui.js';
import { isLoggedIn, getProfile, getUser } from '../auth.js';

let _page = 1;
let _filters = { search: '', type: '', tags: [] };
let _allProjects = [];
let _filtered = [];
const PER_PAGE = APP_CONFIG.catalog.perPage;

export async function render() {
  return `
  <div class="catalog-layout page">
    <!-- SIDEBAR -->
    <aside class="catalog-sidebar card" style="padding:1.25rem;">
      <div class="sidebar-section">
        <h3>Тип проекта</h3>
        <div id="type-filters" style="display:flex;flex-direction:column;gap:.3rem;">
          <label style="text-transform:none;font-size:.85rem;cursor:pointer;color:var(--text-secondary);">
            <input type="radio" name="proj-type" value="" checked style="accent-color:var(--accent)"> Все
          </label>
          ${APP_CONFIG.catalog.projectTypes.map(t => `
            <label style="text-transform:none;font-size:.85rem;cursor:pointer;color:var(--text-secondary);">
              <input type="radio" name="proj-type" value="${escHtml(t)}" style="accent-color:var(--accent)"> ${escHtml(t)}
            </label>`).join('')}
        </div>
      </div>
      <div class="sidebar-section">
        <h3>Популярные теги</h3>
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;" id="tag-filters">
          ${APP_CONFIG.catalog.popularTags.map(t =>
            `<span class="tag" data-tag="${escHtml(t)}">${escHtml(t)}</span>`
          ).join('')}
        </div>
      </div>
      <button class="btn btn--ghost btn--sm btn--full" id="reset-filters">Сбросить фильтры</button>
    </aside>

    <!-- MAIN -->
    <main>
      <!-- Search -->
      <div class="search-bar" style="margin-bottom:1.25rem;">
        <span class="search-icon">⌕</span>
        <input type="search" id="catalog-search" placeholder="Поиск по названию, описанию…" autocomplete="off" />
      </div>

      <!-- Active tags -->
      <div id="active-tags" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem;"></div>

      <!-- Sort -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;">
        <span id="result-count" style="font-size:.85rem;color:var(--text-muted);font-family:var(--font-display);"></span>
        <select id="sort-select" style="width:auto;padding:.45rem .9rem;">
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="popular">Популярные</option>
          <option value="az">А → Я</option>
        </select>
      </div>

      <!-- Grid -->
      <div class="project-grid" id="catalog-grid">
        <div class="loading-overlay" style="grid-column:1/-1"><div class="spinner"></div></div>
      </div>

      <!-- Pagination -->
      <div id="pagination-container"></div>
    </main>
  </div>`;
}

export async function init() {
  await loadProjects();
  bindEvents();
}

async function loadProjects() {
  try {
    const { db } = window.__firebase;
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const q = query(
      collection(db, 'projects'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    // Check user favorites
    let favs = [];
    const prof = getProfile();
    if (prof) favs = prof.favorites || [];

    _allProjects = snap.docs.map(d => ({ id: d.id, ...d.data(), _isFav: favs.includes(d.id) }));
    applyFilters();
  } catch (e) {
    console.error(e);
    const grid = document.getElementById('catalog-grid');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state__icon">⚠</div><div class="empty-state__title">Ошибка загрузки</div><p>${e.message}</p></div>`;
  }
}

function applyFilters() {
  const search = _filters.search.toLowerCase();
  const type   = _filters.type;
  const tags   = _filters.tags;

  _filtered = _allProjects.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search) && !p.description?.toLowerCase().includes(search)) return false;
    if (type && p.type !== type) return false;
    if (tags.length && !tags.every(t => (p.tags || []).includes(t))) return false;
    return true;
  });

  // Sort
  const sort = document.getElementById('sort-select')?.value || 'newest';
  if (sort === 'newest') _filtered.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  if (sort === 'oldest') _filtered.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
  if (sort === 'popular') _filtered.sort((a,b) => (b.downloads||0) - (a.downloads||0));
  if (sort === 'az') _filtered.sort((a,b) => (a.name||'').localeCompare(b.name||''));

  _page = 1;
  renderPage();
}

function renderPage() {
  const grid = document.getElementById('catalog-grid');
  const pagContainer = document.getElementById('pagination-container');
  const countEl = document.getElementById('result-count');
  if (!grid) return;

  const total = _filtered.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const items = _filtered.slice((_page-1)*PER_PAGE, _page*PER_PAGE);

  if (countEl) countEl.textContent = `Найдено: ${total} проект${pluralRu(total)}`;

  if (total === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state__icon">🔍</div>
      <div class="empty-state__title">Проекты не найдены</div>
      <p>Попробуйте изменить фильтры</p>
    </div>`;
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  grid.innerHTML = items.map(p => projectCard(p)).join('');

  // Bind card events
  grid.querySelectorAll('[data-nav-project]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      window.router.navigate('/project/' + el.dataset.navProject);
    });
  });

  // Fav buttons
  grid.querySelectorAll('.project-card__star').forEach(btn => {
    btn.addEventListener('click', () => toggleFav(btn));
  });

  // Download count
  grid.querySelectorAll('[data-dl]').forEach(btn => {
    btn.addEventListener('click', () => incrementDownload(btn.dataset.dl));
  });

  // Pagination
  if (pagContainer) {
    pagContainer.innerHTML = renderPagination(_page, pages, p => { _page = p; renderPage(); window.scrollTo(0,0); });
    initPagination(pagContainer, p => { _page = p; renderPage(); window.scrollTo(0,0); });
  }
}

function projectCard(p) {
  return `
  <div class="project-card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;">
      <h3 class="project-card__title">
        <a href="#" data-nav-project="${p.id}" style="color:inherit;text-decoration:none;">${escHtml(p.name)}</a>
      </h3>
      <div style="display:flex;align-items:center;gap:.3rem;">
        <button class="project-card__star${p._isFav?' active':''}" data-fav-id="${p.id}" title="В избранное">★</button>
        <span class="project-card__star-count">${p.favorites||0}</span>
      </div>
    </div>
    <p class="project-card__desc">${escHtml(p.description)}</p>
    <div class="project-card__meta">
      <span class="badge">${escHtml(p.type||'Python')}</span>
      ${(p.tags||[]).slice(0,3).map(t=>`<span class="tag" data-tag="${escHtml(t)}">${escHtml(t)}</span>`).join('')}
    </div>
    <div class="project-card__actions">
      <a href="#" data-nav-project="${p.id}" class="btn btn--ghost btn--sm">Подробнее</a>
      ${p.downloadUrl ? `<a href="${escHtml(p.downloadUrl)}" target="_blank" class="btn btn--primary btn--sm" data-dl="${p.id}">↓ ZIP</a>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem;">
      <span style="color:var(--text-muted);font-size:.75rem;">${escHtml(p.authorNick||'Аноним')}</span>
      <span style="color:var(--text-muted);font-size:.75rem;">·</span>
      <span style="color:var(--text-muted);font-size:.75rem;">${timeAgo(p.createdAt)}</span>
      ${p.version ? `<span class="badge" style="font-size:.7rem;">v${escHtml(p.version)}</span>` : ''}
    </div>
  </div>`;
}

async function toggleFav(btn) {
  if (!isLoggedIn()) { showToast('Войдите, чтобы добавить в избранное', 'warn'); return; }
  const id = btn.dataset.favId;
  const isActive = btn.classList.contains('active');
  btn.classList.toggle('active');
  btn.classList.add('star-pop');
  btn.addEventListener('animationend', () => btn.classList.remove('star-pop'), { once: true });

  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, arrayUnion, arrayRemove, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const uid = getUser().uid;

    await Promise.all([
      updateDoc(doc(db, 'users', uid), {
        favorites: isActive ? arrayRemove(id) : arrayUnion(id)
      }),
      updateDoc(doc(db, 'projects', id), {
        favorites: increment(isActive ? -1 : 1)
      }),
    ]);

    // Update count display
    const countEl = btn.parentElement.querySelector('.project-card__star-count');
    if (countEl) countEl.textContent = Math.max(0, +(countEl.textContent||0) + (isActive ? -1 : 1));

    // Обновляем локально и в _profile (чтобы избранное работало без перезагрузки)
    const p = _allProjects.find(x => x.id === id);
    if (p) { p._isFav = !isActive; }
    const prof = getProfile();
    if (prof) {
      if (isActive) {
        prof.favorites = (prof.favorites || []).filter(x => x !== id);
      } else {
        prof.favorites = [...(prof.favorites || []), id];
      }
    }
  } catch (e) {
    btn.classList.toggle('active'); // revert
    showToast('Ошибка: ' + e.message, 'error');
  }
}

async function incrementDownload(id) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await updateDoc(doc(db, 'projects', id), { downloads: increment(1) });
  } catch {}
}

function bindEvents() {
  // Search
  const searchEl = document.getElementById('catalog-search');
  let searchTimer;
  searchEl?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      _filters.search = searchEl.value;
      applyFilters();
    }, 300);
  });

  // Type filter
  document.querySelectorAll('input[name="proj-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      _filters.type = radio.value;
      applyFilters();
    });
  });

  // Tag filters (sidebar)
  document.querySelectorAll('#tag-filters .tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const t = tag.dataset.tag;
      if (_filters.tags.includes(t)) {
        _filters.tags = _filters.tags.filter(x => x !== t);
        tag.style.background = '';
        tag.style.borderColor = '';
      } else {
        _filters.tags.push(t);
        tag.style.background = 'var(--accent-glow)';
        tag.style.borderColor = 'var(--accent)';
      }
      updateActiveTags();
      applyFilters();
    });
  });

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', applyFilters);

  // Reset
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    _filters = { search: '', type: '', tags: [] };
    if (searchEl) searchEl.value = '';
    document.querySelector('input[name="proj-type"][value=""]').checked = true;
    document.querySelectorAll('#tag-filters .tag').forEach(t => {
      t.style.background = '';
      t.style.borderColor = '';
    });
    updateActiveTags();
    applyFilters();
  });
}

function updateActiveTags() {
  const container = document.getElementById('active-tags');
  if (!container) return;
  container.innerHTML = _filters.tags.map(t => `
    <span class="tag" style="background:var(--accent-glow);border-color:var(--accent);">
      ${escHtml(t)} <span data-remove-tag="${escHtml(t)}" style="cursor:pointer;margin-left:.3rem;opacity:.7;">✕</span>
    </span>`).join('');
  container.querySelectorAll('[data-remove-tag]').forEach(el => {
    el.addEventListener('click', () => {
      const t = el.dataset.removeTag;
      _filters.tags = _filters.tags.filter(x => x !== t);
      const sidebarTag = document.querySelector(`#tag-filters .tag[data-tag="${t}"]`);
      if (sidebarTag) { sidebarTag.style.background = ''; sidebarTag.style.borderColor = ''; }
      updateActiveTags();
      applyFilters();
    });
  });
}

function pluralRu(n) {
  if (n % 10 === 1 && n % 100 !== 11) return '';
  if ([2,3,4].includes(n%10) && ![12,13,14].includes(n%100)) return 'а';
  return 'ов';
}
