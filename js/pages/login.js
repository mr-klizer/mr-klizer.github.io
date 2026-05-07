// =============================================
// Page: Login
// =============================================

import { login } from '../auth.js';
import { showToast, clearFieldErrors } from '../ui.js';

export function render() {
  return `
  <div class="auth-page">
    <div class="auth-box">
      <div class="auth-logo">
        <span style="font-size:2rem;color:var(--accent);">⬡</span>
      </div>
      <h1 class="auth-title">Добро пожаловать</h1>
      <p class="auth-subtitle">Войдите в свой аккаунт PyCatalog</p>

      <form id="login-form" autocomplete="on" novalidate>
        <div class="form-group">
          <label for="identifier">Логин или Email</label>
          <input type="text" id="identifier" name="username" autocomplete="username"
                 placeholder="your_login или email@example.com" required />
        </div>
        <div class="form-group">
          <label for="password">Пароль</label>
          <input type="password" id="password" name="current-password" autocomplete="current-password"
                 placeholder="••••••••" required />
        </div>

        <button type="submit" class="btn btn--primary btn--full" id="login-btn">
          Войти
        </button>
      </form>

      <div style="text-align:center;margin-top:1.5rem;display:flex;flex-direction:column;gap:.5rem;">
        <a href="/forgot-password" data-link style="font-size:.84rem;font-family:var(--font-display);color:var(--text-muted);">
          Забыли пароль?
        </a>
        <p style="font-size:.85rem;font-family:var(--font-display);color:var(--text-muted);">
          Нет аккаунта? <a href="/register" data-link style="color:var(--accent);">Зарегистрируйтесь</a>
        </p>
      </div>
    </div>
  </div>`;
}

export function init() {
  const form = document.getElementById('login-form');
  const btn  = document.getElementById('login-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const identifier = document.getElementById('identifier').value.trim();
    const password   = document.getElementById('password').value;

    if (!identifier) { showFieldErr('identifier', 'Введите логин или email'); return; }
    if (!password)   { showFieldErr('password', 'Введите пароль'); return; }

    btn.disabled = true;
    btn.textContent = 'Вход…';

    try {
      await login({ identifier, password });
      showToast('Добро пожаловать!', 'ok');
      window.router.navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  });
}

function showFieldErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('input-error');
  const p = document.createElement('p');
  p.className = 'field-error';
  p.textContent = msg;
  el.parentElement.appendChild(p);
}
