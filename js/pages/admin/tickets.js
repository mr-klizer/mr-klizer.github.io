// =============================================
// Page: Admin — Tickets
// =============================================

import { adminSidebar } from './index.js';
import { escHtml, timeAgo, showToast, openModal, closeModal } from '../../ui.js';
import { getUser, getProfile } from '../../auth.js';

export function render() {
  return `
  <div class="admin-layout">
    ${adminSidebar('tickets')}
    <div class="admin-content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <h2>Тикеты поддержки</h2>
        <select id="ticket-status-filter" style="width:auto;">
          <option value="open">Открытые</option>
          <option value="closed">Закрытые</option>
          <option value="">Все</option>
        </select>
      </div>
      <div id="admin-tickets-list">
        <div class="loading-overlay"><div class="spinner spinner--sm"></div></div>
      </div>
    </div>
  </div>`;
}

let _tickets = [];

export async function init() {
  await loadTickets();
  document.getElementById('ticket-status-filter')?.addEventListener('change', renderTickets);
}

async function loadTickets() {
  try {
    const { db } = window.__firebase;
    const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(query(collection(db, 'tickets'), orderBy('updatedAt', 'desc')));
    _tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTickets();
  } catch (e) {
    document.getElementById('admin-tickets-list').innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

function renderTickets() {
  const container = document.getElementById('admin-tickets-list');
  if (!container) return;
  const statusFilter = document.getElementById('ticket-status-filter')?.value;
  const filtered = statusFilter ? _tickets.filter(t => t.status === statusFilter) : _tickets;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🎫</div><div class="empty-state__title">Нет тикетов</div></div>`;
    return;
  }

  container.innerHTML = filtered.map(t => `
  <div class="ticket ${t.status}" style="margin-bottom:.75rem;cursor:pointer;" data-open="${t.id}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;flex-wrap:wrap;">
          <span class="status-pill status-pill--${t.status === 'open' ? 'approved' : 'draft'}">${t.status === 'open' ? 'Открыт' : 'Закрыт'}</span>
          <span style="font-family:var(--font-display);font-weight:700;font-size:.9rem;">${escHtml(t.subject)}</span>
          ${t.hasNewReply ? `<span class="badge badge--accent">Новый ответ</span>` : ''}
        </div>
        <div style="font-size:.8rem;color:var(--text-muted);">
          От: <strong>${escHtml(t.authorNick||t.authorLogin)}</strong> · ${timeAgo(t.updatedAt||t.createdAt)}
          · ${(t.replies||[]).length} ответов
        </div>
      </div>
      <button class="btn btn--ghost btn--sm" data-open="${t.id}">Открыть</button>
    </div>
  </div>`).join('');

  container.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => openTicket(el.dataset.open));
  });
}

async function openTicket(ticketId) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const isOpen = t.status === 'open';

  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
      <h3 style="margin:0;">${escHtml(t.subject)}</h3>
      <div style="display:flex;gap:.5rem;align-items:center;">
        <span class="status-pill status-pill--${isOpen?'approved':'draft'}">${isOpen?'Открыт':'Закрыт'}</span>
        <span style="font-size:.8rem;color:var(--text-muted);">от ${escHtml(t.authorNick||t.authorLogin)}</span>
      </div>
    </div>

    <!-- Original message -->
    <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-md);padding:1rem;margin-bottom:1rem;">
      <p style="font-size:.86rem;line-height:1.6;white-space:pre-wrap;">${escHtml(t.message)}</p>
    </div>

    <!-- Replies -->
    <div id="admin-ticket-replies" style="margin-bottom:1rem;max-height:300px;overflow-y:auto;">
      ${(t.replies||[]).map(r => `
        <div style="padding:.75rem 1rem;border-radius:var(--r-md);margin-bottom:.5rem;border:1px solid var(--border);
             background:${r.isAdmin ? 'var(--accent-soft)' : 'var(--bg-elevated)'};">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;">
            ${r.isAdmin ? `<span class="badge badge--accent">Администратор</span>` : ''}
            <span style="font-family:var(--font-display);font-weight:700;font-size:.83rem;">${escHtml(r.authorNick)}</span>
            <span style="color:var(--text-muted);font-size:.72rem;">${r.createdAt ? new Date(r.createdAt).toLocaleString('ru') : ''}</span>
          </div>
          <p style="font-size:.86rem;line-height:1.6;white-space:pre-wrap;">${escHtml(r.text)}</p>
        </div>`).join('') || '<p style="color:var(--text-muted);font-size:.85rem;">Ответов нет.</p>'}
    </div>

    ${isOpen ? `
    <textarea id="admin-reply-input" rows="3" placeholder="Ваш ответ…" maxlength="2000" style="margin-bottom:.75rem;"></textarea>
    <div style="display:flex;gap:.5rem;justify-content:space-between;flex-wrap:wrap;">
      <button class="btn btn--warn btn--sm" id="admin-close-ticket">Закрыть тикет</button>
      <div style="display:flex;gap:.5rem;">
        <button class="btn btn--ghost btn--sm" id="admin-cancel-reply">Закрыть окно</button>
        <button class="btn btn--primary btn--sm" id="admin-send-reply">Ответить</button>
      </div>
    </div>` : `
    <div style="display:flex;gap:.5rem;justify-content:space-between;flex-wrap:wrap;">
      <button class="btn btn--primary btn--sm" id="admin-reopen-ticket">Переоткрыть</button>
      <button class="btn btn--ghost btn--sm" id="admin-cancel-reply">Закрыть окно</button>
    </div>`}
  `, { wide: false });

  document.getElementById('admin-cancel-reply')?.addEventListener('click', closeModal);

  document.getElementById('admin-send-reply')?.addEventListener('click', async () => {
    const text = document.getElementById('admin-reply-input').value.trim();
    if (!text) { showToast('Введите ответ', 'warn'); return; }
    await replyToTicket(ticketId, text);
  });

  document.getElementById('admin-close-ticket')?.addEventListener('click', async () => {
    await setTicketStatus(ticketId, 'closed');
  });

  document.getElementById('admin-reopen-ticket')?.addEventListener('click', async () => {
    await setTicketStatus(ticketId, 'open');
  });
}

async function replyToTicket(ticketId, text) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, arrayUnion, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const profile = getProfile();
    const reply = {
      text,
      authorUid:  getUser().uid,
      authorNick: profile?.nick || profile?.login || 'Администратор',
      isAdmin:    true,
      createdAt:  new Date().toISOString(),
    };
    await updateDoc(doc(db, 'tickets', ticketId), {
      replies:    arrayUnion(reply),
      hasNewReply: true,
      updatedAt:  serverTimestamp(),
    });
    const t = _tickets.find(x => x.id === ticketId);
    if (t) { t.replies = [...(t.replies||[]), reply]; t.hasNewReply = true; }
    closeModal();
    showToast('Ответ отправлен', 'ok');
    renderTickets();
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

async function setTicketStatus(ticketId, status) {
  try {
    const { db } = window.__firebase;
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await updateDoc(doc(db, 'tickets', ticketId), { status, updatedAt: serverTimestamp() });
    const t = _tickets.find(x => x.id === ticketId);
    if (t) t.status = status;
    closeModal();
    showToast(status === 'closed' ? 'Тикет закрыт' : 'Тикет переоткрыт', 'ok');
    renderTickets();
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}
