// =============================================
// Page: Forgot Password
// =============================================

import { sendPasswordReset } from '../auth.js';
import { showToast, validateEmail } from '../ui.js';

export function render() {
  return `
  <div class="auth-page">
    <div class="auth-box">
      <div class="auth-logo">
        <span style="font-size:2rem;color:var(--accent);">⬡</span>
      </div>
      <h1 class="auth-title">Сброс пароля</h1>
      <p class="auth-subtitle">Введите email — мы отправим ссылку для сброса пароля</p>

      <form id="forgot-form" novalidate>
        <div class="form-group">
          <label for="forgot-email">Email</label>
          <input type="email" id="forgot-email" name="email" autocomplete="email"
                 placeholder="you@example.com" required />
        </div>
        <button type="submit" class="btn btn--primary btn--full" id="forgot-btn">
          Отправить ссылку
        </button>
      </form>

      <p style="text-align:center;font-size:.85rem;font-family:var(--font-display);color:var(--text-muted);margin-top:1.5rem;">
        <a href="/login" data-link style="color:var(--accent);">← Назад к входу</a>
      </p>
    </div>
  </div>`;
}

export function init() {
  const form = document.getElementById('forgot-form');
  const btn  = document.getElementById('forgot-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const err = validateEmail(email);
    if (err) { showToast(err, 'warn'); return; }

    btn.disabled = true;
    btn.textContent = 'Отправка…';

    try {
      await sendPasswordReset(email);
      showToast('Ссылка отправлена! Проверьте почту.', 'ok', 5000);
      btn.textContent = 'Отправлено ✓';
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Отправить ссылку';
    }
  });
}
