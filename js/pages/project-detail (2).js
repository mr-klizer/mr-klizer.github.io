// =============================================
// Page: Project Detail
// =============================================

import { escHtml, timeAgo, formatDate, showToast, openModal, closeModal } from '../ui.js';
import { isLoggedIn, getUser, getProfile, isAdmin, refreshProfile } from '../auth.js';

let _project = null;
let _projectId = null;

export async function render(params) {
  _projectId = params.id;
  return `
  <div class="page">
    <div style="margin-bottom:1.5rem;">
      <a href="/catalog" data-link class="btn btn--ghost btn--sm">← Каталог</a>
    </div>
    <div id="project-detail-root">
      <div class="loading-overlay"><div class="spinner"></div></div>
    </div>
  </div>`;
}

export async function init(params) {
  _projectId = params.id;
  await loadProject();
}

async function loadProject() {
  try {
    const { db } = window.__firebase;
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'projects', _projectId));

    if (!snap.exists()) {
      document.getElementById('project-detail-root').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__title">Проект не найден</div>
        </div>`;
      return;
    }

    _project = { id: snap.id, ...snap.data() };

    // Check if project is visible
    if (_project.status !== 'approved' && !isAdmin()) {
      const user = getUser();
      if (!user || user.uid !== _project.authorUid) {
        document.getElementById('project-detail-root').innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">🔒</div>
            <div class="empty-state__title">Проект на модерации</div>
            <p>Этот проект ещё не прошёл проверку</p>
          </div>`;
        return;
      }
    }

    // Check if user has favorited
    const profile = getProfile();
    _project._isFav = profile?.favorites?.includes(_projectId) || false;

    renderProject();
    loadComments();
  } catch (e) {
    console.error(e);
    document.getElementById('project-detail-root').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠</div>
        <div class="empty-state__title">Ошибка загрузки</div>
        <p>${e.message}</p>
      </div>`;
  }
}

function renderProject() {
  const p = _project;
  const root = document.getElementById('project-detail-root');
  if (!root) return;

  root.innerHTML = `
  <div class="project-detail-layout">
    <!-- MAIN CONTENT -->
    <div>
      <!-- Header -->
      <div style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div>
            <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem;">
              <span class="badge">${escHtml(p.type || 'Python')}</span>
              <span class="status-pill status-pill--${p.status}">${statusLabel(p.status)}</span>
              ${p.version ? `<span class="badge">v${escHtml(p.version)}</span>` : ''}
            </div>
            <h1 style="font-size:2rem;margin-bottom:.5rem;">${escHtml(p.name)}</h1>
            <div style="display:flex;align-items:center;gap:.75rem;color:var(--text-muted);font-size:.85rem;flex-wrap:wrap;">
              <span>Автор: <strong style="color:var(--accent);">${escHtml(p.authorNick || 'Аноним')}</strong></span>
              <span>·</span>
              <span title="${formatDate(p.createdAt)}">${timeAgo(p.createdAt)}</span>
              <span>·</span>
              <span>⬇ ${p.downloads || 0} скачиваний</span>
            </div>
          </div>
          <!-- Admin controls -->
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            ${(isLoggedIn() && (getUser()?.uid === p.authorUid || isAdmin())) ? `
              <button class="btn btn--ghost btn--sm" id="btn-edit-project">✏️ Редактировать</button>
            ` : ''}
            ${isAdmin() ? `
              ${p.status === 'pending' ? `
                <button class="btn btn--primary btn--sm" id="btn-approve">✓ Одобрить</button>
                <button class="btn btn--danger btn--sm" id="btn-reject">✕ Отклонить</button>
              ` : ''}
              <button class="btn btn--danger btn--sm" id="btn-delete-project">🗑 Удалить</button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="card" style="margin-bottom:1.25rem;">
        <h3 style="margin-bottom:.75rem;">Описание</h3>
        <p style="line-height:1.7;">${escHtml(p.description)}</p>
      </div>

      <!-- Tags -->
      ${(p.tags || []).length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem;">
        ${p.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
      </div>` : ''}

      <!-- README -->
      ${p.readme ? `
      <div class="card" style="margin-bottom:1.25rem;">
        <h3 style="margin-bottom:.75rem;">README</h3>
        <pre style="white-space:pre-wrap;word-break:break-word;font-size:.85rem;line-height:1.7;background:none;border:none;padding:0;color:var(--text-secondary);">${escHtml(p.readme)}</pre>
      </div>` : ''}

      <!-- Requirements -->
      ${p.requirements ? `
      <div class="card" style="margin-bottom:1.25rem;">
        <h3 style="margin-bottom:.75rem;">requirements.txt</h3>
        <pre style="font-size:.85rem;line-height:1.6;background:var(--code-bg);border:1px solid var(--border);padding:1rem;border-radius:var(--r-md);">${escHtml(p.requirements)}</pre>
      </div>` : ''}

      <!-- COMMENTS -->
      <div class="card" style="margin-bottom:1.25rem;">
        <h3 style="margin-bottom:1rem;">Комментарии</h3>

        ${isLoggedIn() ? `
        <div style="margin-bottom:1.25rem;">
          <textarea id="comment-input" rows="3" placeholder="Напишите комментарий…" maxlength="1000"></textarea>
          <div style="margin-top:.5rem;text-align:right;">
            <button class="btn btn--primary btn--sm" id="submit-comment">Отправить</button>
          </div>
        </div>` : `
        <p style="margin-bottom:1rem;font-size:.85rem;color:var(--text-muted);">
          <a href="/login" data-link>Войдите</a>, чтобы оставить комментарий
        </p>`}

        <div id="comments-list">
          <div class="loading-overlay" style="padding:2rem;"><div class="spinner spinner--sm"></div></div>
        </div>
      </div>
    </div>

    <!-- SIDEBAR -->
    <div>
      <div class="project-detail-sidebar-card">
        <!-- Download -->
        ${p.downloadUrl ? `
        <a href="${escHtml(p.downloadUrl)}" target="_blank" class="btn btn--primary btn--full" id="download-btn" style="margin-bottom:1rem;">
          ↓ Скачать ZIP
        </a>` : `<p style="text-align:center;color:var(--text-muted);font-size:.85rem;margin-bottom:1rem;">Архив недоступен</p>`}

        <!-- Favorite -->
        <button class="btn btn--ghost btn--full${_project._isFav ? ' active' : ''}" id="fav-btn" style="margin-bottom:1.25rem;">
          ${_project._isFav ? '★ В избранном' : '☆ В избранное'}
        </button>

        <!-- Stats -->
        <div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.25rem;">
          <div style="display:flex;justify-content:space-between;font-size:.85rem;">
            <span style="color:var(--text-muted);">Скачиваний</span>
            <strong>${p.downloads || 0}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.85rem;">
            <span style="color:var(--text-muted);">В избранном</span>
            <strong>${p.favorites || 0}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.85rem;">
            <span style="color:var(--text-muted);">Добавлен</span>
            <strong>${formatDate(p.createdAt)}</strong>
          </div>
          ${p.updatedAt ? `
          <div style="display:flex;justify-content:space-between;font-size:.85rem;">
            <span style="color:var(--text-muted);">Обновлён</span>
            <strong>${formatDate(p.updatedAt)}</strong>
          </div>` : ''}
        </div>

        <!-- GitHub link -->
        ${p.githubUrl ? `
        <a href="${escHtml(p.githubUrl)}" target="_blank" class="btn btn--ghost btn--full" style="margin-bottom:.75rem;">
          ⎇ GitHub репозиторий
        </a>` : ''}

        <!-- Author info -->
        <div style="border-top:1px solid var(--border);padding-top:1rem;margin-top:.25rem;">
          <p style="font-size:.78rem;color:var(--text-muted);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">Автор</p>
          <div style="display:flex;align-items:center;gap:.6rem;">
            <div class="avatar">${(p.authorNick || 'A')[0].toUpperCase()}</div>
            <span style="font-family:var(--font-display);font-weight:700;">${escHtml(p.authorNick || 'Аноним')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  // Bind events
  bindProjectEvents();
}

function bindProjectEvents() {
  // Download tracking
  document.getElementById('download-btn')?.addEventListener('click', async () => {
    try {
      const { db } = window.__firebase;
      const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      await updateDoc(doc(db, 'projects', _projectId), { downloads: increment(1) });
    } catch {}
  });

  // Favorite
  document.getElementById('fav-btn')?.addEventListener('click', toggleFav);

  // Comments
  document.getElementById('submit-comment')?.addEventListener('click', submitComment);

  // Admin: approve / reject / delete
  document.getElementById('btn-approve')?.addEventListener('click', () => moderateProject('approved'));
  document.getElementById('btn-reject')?.addEventListener('click', () => {
    openModal(`
      <h3 style="margin-bottom:1rem;">Причина отклонения</h3>
      <textarea id="reject-reason" rows="3" placeholder="Опишите причину…" class="w-full"></textarea>
      <div style="display:flex;gap:.75rem;margin-top:1rem;justify-content:flex-end;">
        <button class="btn btn--ghost" id="cancel-reject">Отмена</button>
        <button class="btn btn--danger" id="confirm-reject">Отклонить</button>
      </div>`);
    document.getElementById('cancel-reject')?.addEventListener('click', closeModal);
    document.getElementById('confirm-reject')?.addEventListener('click', async () => {
      const reason = document.getElementById('reject-reason').value.trim();
      closeModal();
      await moderateProject('rejected', reason);
    });
  });
  document.getElementById('btn-delete-project')?.addEventListener('click', () => {
    openModal(`
      <h3 style="margin-bottom:.75rem;">Удалить проект?</h3>
      <p style="margin-bottom:1.5rem;color:var(--text-muted);">Это действие необратимо.</p>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;">
        <button class="btn btn--ghost" id="cancel-del">Отмена</button>
        <button class="btn btn--danger" id="confirm-del">Удалить</button>
      </div>`);
    document.getElementById('cancel-del')?.addEventListener('click', closeModal);
    document.getElementById('confirm-del')?.addEventListener('click', deleteProject);
  });

  // Edit project (author or admin)
  document.getElementById('btn-edit-project')?.addEventListener('click', () => openEditModal());
}

async function toggleFav() {
  if (!isLoggedIn()) { showToast('Войдите в аккаунт', 'warn'); return; }
  const btn = document.getElementById('fav-btn');
  const isActive = _project._isFav;
  _project._isFav = !isActive;

  btn.textContent = _project._isFav ? '★ В избранном' : '☆ В избранное';

  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, arrayUnion, arrayRemove, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const uid = getUser().uid;
    await Promise.all([
      updateDoc(doc(db, 'users', uid), { favorites: isActive ? arrayRemove(_projectId) : arrayUnion(_projectId) }),
      updateDoc(doc(db, 'projects', _projectId), { favorites: increment(isActive ? -1 : 1) }),
    ]);
    // Обновляем профиль в памяти — страница избранного сразу увидит изменения
    await refreshProfile();
  } catch (e) {
    _project._isFav = isActive;
    btn.textContent = isActive ? '★ В избранном' : '☆ В избранное';
    showToast('Ошибка: ' + e.message, 'error');
  }
}

async function loadComments() {
  const list = document.getElementById('comments-list');
  if (!list) return;
  try {
    const { db } = window.__firebase;
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const q = query(
      collection(db, 'comments'),
      where('projectId', '==', _projectId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:.88rem;">Комментариев пока нет. Будьте первым!</p>`;
      return;
    }

    const user = getUser();
    list.innerHTML = snap.docs.map(d => {
      const c = d.data();
      const canDelete = (user && (user.uid === c.authorUid || isAdmin()));
      const roleTag = c.authorRole === 'super_admin'
        ? `<span class="badge badge--error" style="font-size:.68rem;">👑 Гл. Админ</span>`
        : c.authorRole === 'admin'
        ? `<span class="badge badge--warn" style="font-size:.68rem;">🛡️ Админ</span>`
        : '';
      return `
      <div class="comment" id="comment-${d.id}">
        <div class="comment__header">
          <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
            <div class="avatar" style="width:28px;height:28px;font-size:.75rem;">${(c.authorNick||'A')[0].toUpperCase()}</div>
            <span class="comment__author">${escHtml(c.authorNick || 'Аноним')}</span>
            ${roleTag}
            <span class="comment__date">${timeAgo(c.createdAt)}</span>
          </div>
          ${canDelete ? `<button class="btn-icon" data-del-comment="${d.id}" title="Удалить" style="font-size:.8rem;">✕</button>` : ''}
        </div>
        <div class="comment__body">${escHtml(c.text)}</div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-del-comment]').forEach(btn => {
      btn.addEventListener('click', () => deleteComment(btn.dataset.delComment));
    });
  } catch (e) {
    list.innerHTML = `<p style="color:var(--error);">Ошибка загрузки: ${e.message}</p>`;
  }
}

async function submitComment() {
  const textarea = document.getElementById('comment-input');
  const text = textarea?.value.trim();
  if (!text) { showToast('Введите текст комментария', 'warn'); return; }
  if (text.length > 1000) { showToast('Максимум 1000 символов', 'warn'); return; }

  const btn = document.getElementById('submit-comment');
  btn.disabled = true;
  btn.textContent = 'Отправка…';

  try {
    const { db } = window.__firebase;
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const profile = getProfile();
    await addDoc(collection(db, 'comments'), {
      projectId:  _projectId,
      authorUid:  getUser().uid,
      authorNick: profile?.nick || profile?.login || 'Аноним',
      authorRole: profile?.role || 'user',
      text,
      createdAt: serverTimestamp(),
    });
    textarea.value = '';
    showToast('Комментарий добавлен', 'ok');
    await loadComments();
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить';
  }
}

async function deleteComment(commentId) {
  try {
    const { db } = window.__firebase;
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await deleteDoc(doc(db, 'comments', commentId));
    document.getElementById('comment-' + commentId)?.remove();
    showToast('Комментарий удалён', 'ok');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

async function moderateProject(status, rejectReason = '') {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await updateDoc(doc(db, 'projects', _projectId), {
      status,
      rejectReason: rejectReason || null,
      moderatedAt: serverTimestamp(),
      moderatedBy: getUser().uid,
    });
    _project.status = status;
    showToast(status === 'approved' ? 'Проект одобрен!' : 'Проект отклонён', status === 'approved' ? 'ok' : 'warn');
    renderProject();
    loadComments();
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

async function deleteProject() {
  closeModal();
  try {
    const { db } = window.__firebase;
    const { doc, deleteDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    // Delete all comments
    const cq = query(collection(db, 'comments'), where('projectId', '==', _projectId));
    const cSnap = await getDocs(cq);
    await Promise.all(cSnap.docs.map(d => deleteDoc(doc(db, 'comments', d.id))));

    // Delete project
    await deleteDoc(doc(db, 'projects', _projectId));

    showToast('Проект удалён', 'ok');
    window.router.navigate('/catalog');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

function statusLabel(s) {
  return { draft: 'Черновик', pending: 'На модерации', approved: 'Одобрен', rejected: 'Отклонён' }[s] || s;
}

async function openEditModal() {
  const p = _project;
  const { APP_CONFIG } = await import('../config.js');
  openModal(`
    <h3 style="margin-bottom:1.25rem;">Редактировать проект</h3>
    <div class="form-group">
      <label for="edit-name">Название</label>
      <input type="text" id="edit-name" value="${escHtml(p.name)}" maxlength="80" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="edit-version">Версия</label>
        <input type="text" id="edit-version" value="${escHtml(p.version||'')}" maxlength="20" />
      </div>
      <div class="form-group">
        <label for="edit-type">Тип</label>
        <select id="edit-type">
          ${APP_CONFIG.catalog.projectTypes.map(t =>
            `<option value="${escHtml(t)}" ${p.type===t?'selected':''}>${escHtml(t)}</option>`
          ).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="edit-desc">Описание</label>
      <textarea id="edit-desc" rows="3" maxlength="500">${escHtml(p.description)}</textarea>
    </div>
    <div class="form-group">
      <label for="edit-tags">Теги (через запятую)</label>
      <input type="text" id="edit-tags" value="${escHtml((p.tags||[]).join(', '))}" maxlength="300" />
    </div>
    <div class="form-group">
      <label for="edit-github">Ссылка GitHub</label>
      <input type="url" id="edit-github" value="${escHtml(p.githubUrl||'')}" />
    </div>
    <div class="form-group">
      <label for="edit-readme">README</label>
      <textarea id="edit-readme" rows="6">${escHtml(p.readme||'')}</textarea>
    </div>
    <div class="form-group">
      <label for="edit-requirements">requirements.txt</label>
      <textarea id="edit-requirements" rows="4">${escHtml(p.requirements||'')}</textarea>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn--ghost" id="cancel-edit">Отмена</button>
      <button class="btn btn--primary" id="save-edit">Сохранить</button>
    </div>
  `, { wide: true });

  document.getElementById('cancel-edit')?.addEventListener('click', closeModal);
  document.getElementById('save-edit')?.addEventListener('click', async () => {
    const name = document.getElementById('edit-name').value.trim();
    const desc = document.getElementById('edit-desc').value.trim();
    if (!name || !desc) { showToast('Название и описание обязательны', 'warn'); return; }

    const tags = document.getElementById('edit-tags').value
      .split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 10);

    const btn = document.getElementById('save-edit');
    btn.disabled = true; btn.textContent = 'Сохранение…';

    try {
      const { db } = window.__firebase;
      const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const updates = {
        name,
        description: desc,
        type:         document.getElementById('edit-type').value,
        version:      document.getElementById('edit-version').value.trim(),
        tags,
        githubUrl:    document.getElementById('edit-github').value.trim(),
        readme:       document.getElementById('edit-readme').value,
        requirements: document.getElementById('edit-requirements').value,
        updatedAt:    serverTimestamp(),
      };
      await updateDoc(doc(db, 'projects', _projectId), updates);
      Object.assign(_project, updates);
      closeModal();
      showToast('Проект обновлён!', 'ok');
      renderProject();
      loadComments();
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = 'Сохранить';
    }
  });
}
