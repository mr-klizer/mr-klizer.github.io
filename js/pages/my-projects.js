// =============================================
// Page: My Projects
// =============================================

import { getUser } from '../auth.js';
import { escHtml, timeAgo, formatDate, showToast, openModal, closeModal } from '../ui.js';

export function render() {
  return `
  <div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
      <h1>Мои проекты</h1>
      <a href="/add-project" data-link class="btn btn--primary">+ Добавить проект</a>
    </div>
    <div id="my-projects-list">
      <div class="loading-overlay"><div class="spinner"></div></div>
    </div>
  </div>`;
}

export async function init() {
  const user = getUser();
  if (!user) return;

  try {
    const { db } = window.__firebase;
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const q = query(
      collection(db, 'projects'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const container = document.getElementById('my-projects-list');
    if (!container) return;

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <div class="empty-state__title">Нет проектов</div>
          <p>Добавьте свой первый проект!</p>
          <a href="/add-project" data-link class="btn btn--primary" style="margin-top:1rem;">+ Добавить проект</a>
        </div>`;
      return;
    }

    container.innerHTML = snap.docs.map(d => {
      const p = { id: d.id, ...d.data() };
      return `
      <div class="card" style="margin-bottom:1rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem;flex-wrap:wrap;">
            <h3 style="font-size:1rem;">${escHtml(p.name)}</h3>
            <span class="status-pill status-pill--${p.status}">${statusLabel(p.status)}</span>
            ${p.version ? `<span class="badge" style="font-size:.7rem;">v${escHtml(p.version)}</span>` : ''}
          </div>
          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:.5rem;">${escHtml(p.description)}</p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <span class="badge">${escHtml(p.type||'Python')}</span>
            ${(p.tags||[]).slice(0,4).map(t=>`<span class="tag" style="font-size:.72rem;">${escHtml(t)}</span>`).join('')}
          </div>
          ${p.rejectReason ? `<p style="color:var(--error);font-size:.83rem;margin-top:.5rem;">Причина отклонения: ${escHtml(p.rejectReason)}</p>` : ''}
          <div style="color:var(--text-muted);font-size:.78rem;margin-top:.5rem;">
            ⬇ ${p.downloads||0} · ★ ${p.favorites||0} · ${timeAgo(p.createdAt)}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0;">
          <a href="/project/${p.id}" data-link class="btn btn--ghost btn--sm">Открыть</a>
          <button class="btn btn--danger btn--sm" data-del="${p.id}" data-name="${escHtml(p.name)}">Удалить</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => confirmDelete(btn.dataset.del, btn.dataset.name));
    });
  } catch (e) {
    document.getElementById('my-projects-list').innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

function confirmDelete(id, name) {
  openModal(`
    <h3 style="margin-bottom:.75rem;">Удалить «${escHtml(name)}»?</h3>
    <p style="margin-bottom:1.5rem;color:var(--text-muted);">Это действие необратимо. Файл на GitHub также будет удалён.</p>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;">
      <button class="btn btn--ghost" id="cancel-del">Отмена</button>
      <button class="btn btn--danger" id="confirm-del">Удалить</button>
    </div>`);
  document.getElementById('cancel-del')?.addEventListener('click', closeModal);
  document.getElementById('confirm-del')?.addEventListener('click', () => deleteProject(id));
}

async function deleteProject(id) {
  closeModal();
  try {
    const { db } = window.__firebase;
    const { doc, getDoc, deleteDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    // Get project to find GitHub path
    const pSnap = await getDoc(doc(db, 'projects', id));
    if (pSnap.exists() && pSnap.data().githubPath) {
      // Try to delete from GitHub
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'app'));
        if (settingsSnap.exists()) {
          const { github: gh } = settingsSnap.data();
          if (gh?.owner && gh?.repo && gh?.token) {
            const { githubRequest } = await import('../ui.js');
            // Get current SHA of file
            const fileInfo = await githubRequest('GET', `/repos/${gh.owner}/${gh.repo}/contents/${pSnap.data().githubPath}`, null, gh.token).catch(()=>null);
            if (fileInfo?.sha) {
              await githubRequest('DELETE', `/repos/${gh.owner}/${gh.repo}/contents/${pSnap.data().githubPath}`, {
                message: `Delete project ${id}`,
                sha: fileInfo.sha,
                branch: gh.branch || 'main',
              }, gh.token).catch(()=>{});
            }
          }
        }
      } catch {}
    }

    // Delete comments
    const cq = query(collection(db, 'comments'), where('projectId', '==', id));
    const cSnap = await getDocs(cq);
    await Promise.all(cSnap.docs.map(d => deleteDoc(doc(db, 'comments', d.id))));

    // Delete project doc
    await deleteDoc(doc(db, 'projects', id));

    showToast('Проект удалён', 'ok');
    // Re-render
    document.getElementById(`proj-${id}`)?.remove();
    await init();
  } catch (e) {
    showToast('Ошибка удаления: ' + e.message, 'error');
  }
}

function statusLabel(s) {
  return { draft:'Черновик', pending:'На модерации', approved:'Опубликован', rejected:'Отклонён' }[s] || s;
}
