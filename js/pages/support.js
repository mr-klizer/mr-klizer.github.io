// =============================================
// Page: Support (Tickets)
// =============================================

import { getUser, getProfile } from '../auth.js';
import { escHtml, timeAgo, showToast, openModal, closeModal } from '../ui.js';

export function render() {
  return `
  <div class="page page--narrow">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 style="margin-bottom:.25rem;">Поддержка</h1>
        <p style="color:var(--text-muted);font-size:.9rem;">Задайте вопрос администраторам</p>
      </div>
      <button class="btn btn--primary" id="new-ticket-btn">+ Новый тикет</button>
    </div>
    <div id="tickets-list">
      <div class="loading-overlay"><div class="spinner"></div></div>
    </div>
  </div>`;
}

export async function init() {
  document.getElementById('new-ticket-btn')?.addEventListener('click', openNewTicketModal);
  await loadTickets();
}

async function loadTickets() {
  const container = document.getElementById('tickets-list');
  if (!container) return;
  try {
    const { db } = window.__firebase;
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const uid = getUser().uid;
    const q = query(
      collection(db, 'tickets'),
      where('authorUid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🎫</div>
          <div class="empty-state__title">Тикетов нет</div>
          <p>Создайте тикет, если у вас есть вопрос или проблема.</p>
        </div>`;
      return;
    }

    container.innerHTML = snap.docs.map(d => {
      const t = { id: d.id, ...d.data() };
      return `
      <div class="ticket ${t.status}" data-ticket="${t.id}" style="margin-bottom:.75rem;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;flex-wrap:wrap;">
              <span class="status-pill status-pill--${t.status === 'open' ? 'approved' : 'draft'}">
                ${t.status === 'open' ? 'Открыт' : 'Закрыт'}
              </span>
              <span style="font-family:var(--font-display);font-size:.85rem;font-weight:700;">${escHtml(t.subject)}</span>
            </div>
            <p style="font-size:.83rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(t.message)}</p>
            <span style="font-size:.75rem;color:var(--text-muted);">${timeAgo(t.createdAt)}</span>
            ${t.hasNewReply ? `<span class="badge badge--accent" style="margin-left:.5rem;">Новый ответ</span>` : ''}
          </div>
          <button class="btn btn--ghost btn--sm" data-open-ticket="${t.id}">Открыть</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-open-ticket]').forEach(btn => {
      btn.addEventListener('click', () => openTicket(btn.dataset.openTicket));
    });
  } catch (e) {
    container.innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

function openNewTicketModal() {
  openModal(`
    <h3 style="margin-bottom:1.25rem;">Новый тикет</h3>
    <div class="form-group">
      <label for="ticket-subject">Тема *</label>
      <input type="text" id="ticket-subject" placeholder="Кратко опишите проблему…" maxlength="100" />
    </div>
    <div class="form-group">
      <label for="ticket-message">Сообщение *</label>
      <textarea id="ticket-message" rows="5" placeholder="Подробно опишите ваш вопрос…" maxlength="2000"></textarea>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn--ghost" id="cancel-ticket">Отмена</button>
      <button class="btn btn--primary" id="submit-ticket">Отправить</button>
    </div>`);

  document.getElementById('cancel-ticket')?.addEventListener('click', closeModal);
  document.getElementById('submit-ticket')?.addEventListener('click', submitTicket);
}

async function submitTicket() {
  const subject = document.getElementById('ticket-subject').value.trim();
  const message = document.getElementById('ticket-message').value.trim();
  if (!subject) { showToast('Введите тему', 'warn'); return; }
  if (!message) { showToast('Введите сообщение', 'warn'); return; }

  const btn = document.getElementById('submit-ticket');
  btn.disabled = true; btn.textContent = 'Отправка…';

  try {
    const { db } = window.__firebase;
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const profile = getProfile();
    await addDoc(collection(db, 'tickets'), {
      subject,
      message,
      authorUid:   getUser().uid,
      authorLogin: profile?.login || '',
      authorNick:  profile?.nick || profile?.login || 'Аноним',
      status:      'open',
      replies:     [],
      hasNewReply: false,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
    closeModal();
    showToast('Тикет создан! Ожидайте ответа.', 'ok');
    await loadTickets();
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Отправить';
  }
}

async function openTicket(ticketId) {
  try {
    const { db } = window.__firebase;
    const { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'tickets', ticketId));
    if (!snap.exists()) return;
    const t = { id: snap.id, ...snap.data() };

    // Mark as read
    if (t.hasNewReply) {
      await updateDoc(doc(db, 'tickets', ticketId), { hasNewReply: false });
    }

    const isOpen = t.status === 'open';

    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
        <h3 style="margin:0;">${escHtml(t.subject)}</h3>
        <span class="status-pill status-pill--${isOpen ? 'approved' : 'draft'}">${isOpen ? 'Открыт' : 'Закрыт'}</span>
      </div>

      <div class="card--elevated" style="padding:1rem;border-radius:var(--r-md);margin-bottom:1rem;border:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;">
          <span style="font-family:var(--font-display);font-weight:700;font-size:.85rem;color:var(--accent);">${escHtml(t.authorNick)}</span>
          <span style="color:var(--text-muted);font-size:.75rem;">${timeAgo(t.createdAt)}</span>
        </div>
        <p style="font-size:.88rem;line-height:1.6;white-space:pre-wrap;">${escHtml(t.message)}</p>
      </div>

      <div id="ticket-replies" style="margin-bottom:1rem;">
        ${(t.replies || []).map(r => `
          <div style="padding:.75rem 1rem;border-radius:var(--r-md);margin-bottom:.5rem;border:1px solid var(--border);
               background:${r.isAdmin ? 'var(--accent-soft)' : 'var(--bg-elevated)'};">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;">
              ${r.isAdmin ? `<span class="badge badge--accent">Администратор</span>` : ''}
              <span style="font-family:var(--font-display);font-weight:700;font-size:.83rem;">${escHtml(r.authorNick)}</span>
              <span style="color:var(--text-muted);font-size:.73rem;">${r.createdAt ? timeAgo(r.createdAt) : ''}</span>
            </div>
            <p style="font-size:.86rem;line-height:1.6;white-space:pre-wrap;">${escHtml(r.text)}</p>
          </div>`).join('') || '<p style="color:var(--text-muted);font-size:.85rem;">Ответов пока нет.</p>'}
      </div>

      ${isOpen ? `
      <textarea id="reply-input" rows="3" placeholder="Ваш ответ…" maxlength="1000" style="margin-bottom:.75rem;"></textarea>
      <div style="display:flex;gap:.5rem;justify-content:space-between;flex-wrap:wrap;">
        <button class="btn btn--danger btn--sm" id="close-ticket-btn">Закрыть тикет</button>
        <div style="display:flex;gap:.5rem;">
          <button class="btn btn--ghost btn--sm" id="cancel-reply">Закрыть окно</button>
          <button class="btn btn--primary btn--sm" id="send-reply-btn">Ответить</button>
        </div>
      </div>` : `
      <div style="text-align:center;margin-top:.5rem;">
        <button class="btn btn--ghost btn--sm" id="cancel-reply">Закрыть окно</button>
      </div>`}
    `, { wide: false });

    document.getElementById('cancel-reply')?.addEventListener('click', closeModal);

    document.getElementById('send-reply-btn')?.addEventListener('click', async () => {
      const text = document.getElementById('reply-input').value.trim();
      if (!text) { showToast('Введите сообщение', 'warn'); return; }
      const profile = getProfile();
      try {
        const { doc: firestoreDoc, updateDoc, arrayUnion, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await updateDoc(firestoreDoc(db, 'tickets', ticketId), {
          replies: arrayUnion({
            text,
            authorUid:  getUser().uid,
            authorNick: profile?.nick || profile?.login || 'Аноним',
            isAdmin:    false,
            createdAt:  new Date().toISOString(),
          }),
          updatedAt: serverTimestamp(),
        });
        closeModal();
        showToast('Ответ отправлен', 'ok');
        await loadTickets();
      } catch (e) {
        showToast('Ошибка: ' + e.message, 'error');
      }
    });

    document.getElementById('close-ticket-btn')?.addEventListener('click', async () => {
      try {
        const { doc: firestoreDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await updateDoc(firestoreDoc(db, 'tickets', ticketId), { status: 'closed', updatedAt: serverTimestamp() });
        closeModal();
        showToast('Тикет закрыт', 'ok');
        await loadTickets();
      } catch (e) {
        showToast('Ошибка: ' + e.message, 'error');
      }
    });
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}
