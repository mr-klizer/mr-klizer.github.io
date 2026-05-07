// =============================================
// PyCatalog — UI Utilities
// =============================================

// ── TOAST ──
export function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { ok: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ── MODAL ──
const modalOverlay = () => document.getElementById('modal-overlay');
const modalContent = () => document.getElementById('modal-content');
const modalBox     = () => document.getElementById('modal-box');

export function openModal(html, opts = {}) {
  const overlay = modalOverlay();
  const content = modalContent();
  if (!overlay || !content) return;

  content.innerHTML = html;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (opts.wide) modalBox().style.maxWidth = '780px';
  else modalBox().style.maxWidth = '580px';
}

export function closeModal() {
  const overlay = modalOverlay();
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  const content = modalContent();
  if (content) content.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
});

// ── THEME ──
export function initTheme() {
  const saved = localStorage.getItem('py-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('py-theme', next);
}

// ── BURGER MENU ──
export function initBurger() {
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobile-nav');
  burger?.addEventListener('click', () => {
    mobileNav?.classList.toggle('open');
  });
}

// ── USER DROPDOWN ──
export function initUserDropdown() {
  const btn = document.getElementById('user-avatar-btn');
  const dropdown = document.getElementById('user-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
}

// ── RIPPLE EFFECT ──
export function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
    `;
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

// Apply ripple to all .btn elements
export function initRipples() {
  document.querySelectorAll('.btn').forEach(addRipple);
}

// ── FORMAT DATE ──
export function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'только что';
  if (mins < 60)  return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days} дн. назад`;
  return formatDate(ts);
}

// ── ESCAPE HTML ──
export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── VALIDATE ──
export function validateLogin(v) {
  if (!v) return 'Введите логин';
  if (v.length < 3) return 'Минимум 3 символа';
  if (v.length > 32) return 'Максимум 32 символа';
  if (!/^[a-z0-9_.-]+$/.test(v)) return 'Только латинские буквы, цифры, _ . -';
  return null;
}
export function validateNick(v) {
  if (!v) return 'Введите ник';
  if (v.length < 2) return 'Минимум 2 символа';
  if (v.length > 40) return 'Максимум 40 символов';
  return null;
}
export function validateEmail(v) {
  if (!v) return 'Введите email';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Некорректный email';
  return null;
}
export function validatePassword(v) {
  if (!v) return 'Введите пароль';
  if (v.length < 6) return 'Минимум 6 символов';
  return null;
}

export function showFieldError(inputId, msg) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('input-error');
  let err = input.parentElement.querySelector('.field-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'field-error';
    input.parentElement.appendChild(err);
  }
  err.textContent = msg;
}

export function clearFieldErrors(formEl) {
  formEl?.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  formEl?.querySelectorAll('.field-error').forEach(el => el.remove());
}

// ── PAGINATION ──
export function renderPagination(current, total, onPage) {
  if (total <= 1) return '';
  let html = '<div class="pagination">';
  if (current > 1) html += `<button class="page-btn" data-page="${current-1}">‹</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      html += `<button class="page-btn${i===current?' active':''}" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      html += `<span style="color:var(--text-muted);padding:0 .25rem">…</span>`;
    }
  }
  if (current < total) html += `<button class="page-btn" data-page="${current+1}">›</button>`;
  html += '</div>';
  return html;
}

export function initPagination(container, onPage) {
  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => onPage(+btn.dataset.page));
  });
}

// ── GITHUB API ──
export async function githubRequest(method, path, body, token) {
  // Token comes from Firestore settings, never from client-side bundle
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// Upload file to GitHub repo (base64)
export async function uploadToGitHub({ owner, repo, branch, path, content, message, token, sha }) {
  return githubRequest('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
    ...(sha ? { sha } : {}),
  }, token);
}

// Upload binary (ArrayBuffer) as base64 to GitHub
export async function uploadBinaryToGitHub({ owner, repo, branch, path, arrayBuffer, message, token, sha }) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const base64 = btoa(binary);
  return githubRequest('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
    message,
    content: base64,
    branch,
    ...(sha ? { sha } : {}),
  }, token);
}

// ── ZIP helper ──
export async function createZip(files) {
  // files: [{name, content: ArrayBuffer | string | Blob}]
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.content);
  }
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
