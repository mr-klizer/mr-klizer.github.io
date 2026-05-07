// =============================================
// Page: Profile
// =============================================

import { getUser, getProfile } from '../auth.js';
import { showToast, escHtml, formatDate, validateNick } from '../ui.js';

export function render() {
  const p = getProfile();
  if (!p) return `<div class="page"><p>Загрузка…</p></div>`;
  return `
  <div class="page page--narrow">
    <h1 style="margin-bottom:2rem;">Мой профиль</h1>
    <div class="card" style="margin-bottom:1.5rem;">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
        <div class="avatar" style="width:56px;height:56px;font-size:1.4rem;">${(p.nick||p.login||'U')[0].toUpperCase()}</div>
        <div>
          <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;">${escHtml(p.nick||p.login)}</div>
          <div style="color:var(--text-muted);font-size:.85rem;">@${escHtml(p.login)}</div>
          <div class="badge badge--${p.role==='super_admin'?'error':p.role==='admin'?'warn':'accent'}" style="margin-top:.3rem;">
            ${p.role==='super_admin'?'Главный Администратор':p.role==='admin'?'Администратор':'Пользователь'}
          </div>
        </div>
      </div>

      <form id="profile-form" novalidate>
        <div class="form-group">
          <label for="edit-nick">Отображаемое имя (ник)</label>
          <input type="text" id="edit-nick" value="${escHtml(p.nick||'')}" maxlength="40" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" value="${escHtml(p.email||'')}" disabled style="opacity:.6;cursor:not-allowed;" />
          <p style="font-size:.78rem;color:var(--text-muted);margin-top:.25rem;">Email нельзя изменить</p>
        </div>
        <div class="form-group">
          <label>Логин</label>
          <input type="text" value="${escHtml(p.login||'')}" disabled style="opacity:.6;cursor:not-allowed;" />
        </div>
        <div class="form-group">
          <label>Аккаунт создан</label>
          <input type="text" value="${formatDate(p.createdAt)}" disabled style="opacity:.6;cursor:not-allowed;" />
        </div>
        <button type="submit" class="btn btn--primary" id="save-profile-btn">Сохранить</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-bottom:1rem;">Смена пароля</h3>
      <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1rem;">
        Ссылка для смены пароля будет отправлена на ваш email.
      </p>
      <button class="btn btn--ghost" id="send-reset-btn">Отправить ссылку для смены пароля</button>
    </div>
  </div>`;
}

export function init() {
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = document.getElementById('edit-nick').value.trim();
    const err = validateNick(nick);
    if (err) { showToast(err, 'warn'); return; }

    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true; btn.textContent = 'Сохранение…';

    try {
      const { db } = window.__firebase;
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      await updateDoc(doc(db, 'users', getUser().uid), { nick });
      showToast('Профиль обновлён', 'ok');
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Сохранить';
    }
  });

  document.getElementById('send-reset-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('send-reset-btn');
    btn.disabled = true;
    try {
      const { sendPasswordReset } = await import('../auth.js');
      await sendPasswordReset(getProfile().email);
      showToast('Ссылка отправлена на почту', 'ok');
    } catch (e) {
      showToast('Ошибка: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}
