// =============================================
// Page: Register
// =============================================

import { register } from '../auth.js';
import { showToast, validateLogin, validateNick, validateEmail, validatePassword, clearFieldErrors } from '../ui.js';

export function render() {
  return `
  <div class="auth-page">
    <div class="auth-box">
      <div class="auth-logo">
        <span style="font-size:2rem;color:var(--accent);">⬡</span>
      </div>
      <h1 class="auth-title">Регистрация</h1>
      <p class="auth-subtitle">Создайте аккаунт и делитесь проектами</p>

      <form id="reg-form" autocomplete="on" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="reg-login">Логин</label>
            <input type="text" id="reg-login" name="username" autocomplete="username"
                   placeholder="my_login" required minlength="3" maxlength="32"
                   pattern="[a-z0-9_.\-]+" />
            <p class="field-error" id="login-hint" style="color:var(--text-muted);margin-top:.2rem;">
              Только a-z, 0-9, _ . -
            </p>
          </div>
          <div class="form-group">
            <label for="reg-nick">Ник (отображаемое имя)</label>
            <input type="text" id="reg-nick" name="nickname" autocomplete="nickname"
                   placeholder="MyCoolNick" required minlength="2" maxlength="40" />
          </div>
        </div>

        <div class="form-group">
          <label for="reg-email">Email</label>
          <input type="email" id="reg-email" name="email" autocomplete="email"
                 placeholder="you@example.com" required />
        </div>

        <div class="form-group">
          <label for="reg-password">Пароль</label>
          <input type="password" id="reg-password" name="new-password" autocomplete="new-password"
                 placeholder="Минимум 6 символов" required minlength="6" />
        </div>

        <div class="form-group">
          <label for="reg-confirm">Подтверждение пароля</label>
          <input type="password" id="reg-confirm" name="new-password" autocomplete="new-password"
                 placeholder="Повторите пароль" required minlength="6" />
        </div>

        <button type="submit" class="btn btn--primary btn--full" id="reg-btn">
          Создать аккаунт
        </button>
      </form>

      <p style="text-align:center;font-size:.85rem;font-family:var(--font-display);color:var(--text-muted);margin-top:1.5rem;">
        Уже есть аккаунт? <a href="/login" data-link style="color:var(--accent);">Войти</a>
      </p>
    </div>
  </div>`;
}

export function init() {
  const form = document.getElementById('reg-form');
  const btn  = document.getElementById('reg-btn');

  // Real-time login validation
  document.getElementById('reg-login')?.addEventListener('input', e => {
    const v = e.target.value;
    const hint = document.getElementById('login-hint');
    if (!hint) return;
    if (v && !/^[a-z0-9_.\-]+$/.test(v)) {
      hint.style.color = 'var(--error)';
      hint.textContent = 'Недопустимые символы';
    } else {
      hint.style.color = 'var(--text-muted)';
      hint.textContent = 'Только a-z, 0-9, _ . -';
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const loginVal    = document.getElementById('reg-login').value.trim();
    const nickVal     = document.getElementById('reg-nick').value.trim();
    const emailVal    = document.getElementById('reg-email').value.trim();
    const passVal     = document.getElementById('reg-password').value;
    const confirmVal  = document.getElementById('reg-confirm').value;

    let hasError = false;
    const loginErr = validateLogin(loginVal);
    if (loginErr)   { addErr('reg-login', loginErr);    hasError = true; }
    const nickErr  = validateNick(nickVal);
    if (nickErr)    { addErr('reg-nick', nickErr);      hasError = true; }
    const emailErr = validateEmail(emailVal);
    if (emailErr)   { addErr('reg-email', emailErr);    hasError = true; }
    const passErr  = validatePassword(passVal);
    if (passErr)    { addErr('reg-password', passErr);  hasError = true; }
    if (passVal !== confirmVal) { addErr('reg-confirm', 'Пароли не совпадают'); hasError = true; }
    if (hasError) return;

    btn.disabled = true;
    btn.textContent = 'Регистрация…';

    try {
      await register({ login: loginVal, nick: nickVal, email: emailVal, password: passVal });
      showToast('Аккаунт создан! Добро пожаловать!', 'ok');
      window.router.navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Создать аккаунт';
    }
  });
}

function addErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('input-error');
  const existing = el.parentElement.querySelector('.field-error');
  if (existing && existing.id !== 'login-hint') { existing.textContent = msg; return; }
  const p = document.createElement('p');
  p.className = 'field-error';
  p.textContent = msg;
  el.parentElement.appendChild(p);
}
