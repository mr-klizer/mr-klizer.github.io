// =============================================
// Page: PyLaunch
// =============================================

import { APP_CONFIG } from '../config.js';

export async function render() {
  // Load latest settings from Firestore
  let cfg = { ...APP_CONFIG.pylaunch };
  try {
    const { db } = window.__firebase;
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists() && snap.data().pylaunch) Object.assign(cfg, snap.data().pylaunch);
  } catch {}

  return `
  <div class="page">
    <!-- Hero -->
    <div class="pylaunch-banner" style="margin-bottom:3rem;flex-direction:column;text-align:center;padding:4rem 2rem;">
      <img src="assets/pylaunch-logo.svg" class="pylaunch-logo pylaunch-logo--hero" alt="PyLaunch" />
      <div class="badge badge--accent" style="margin:0 auto 1rem;">Рекомендуем</div>
      <h1 style="font-size:3rem;margin-bottom:1rem;">PyLaunch</h1>
      <p style="max-width:560px;margin:0 auto 2rem;font-size:1.05rem;">
        ${cfg.description || 'Локальный менеджер Python проектов. Скачивай, управляй и запускай Python-проекты в один клик.'}
      </p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        ${cfg.downloadUrl && cfg.downloadUrl !== '#'
          ? `<a href="${cfg.downloadUrl}" class="btn btn--primary btn--lg" target="_blank">⬇ Скачать PyLaunch${cfg.version ? ' v' + cfg.version : ''}</a>`
          : `<button class="btn btn--primary btn--lg" disabled>Скоро доступно</button>`}
        <a href="/catalog" data-link class="btn btn--ghost btn--lg">Смотреть каталог проектов</a>
      </div>
    </div>

    <!-- Features -->
    <div class="page" style="padding-top:0;">
      <h2 style="text-align:center;margin-bottom:2rem;">Что умеет PyLaunch?</h2>
      <div class="features-grid">
        ${[
          ['📦', 'Установка одним кликом', 'Скачивает проект из PyCatalog и устанавливает зависимости автоматически.'],
          ['▶️', 'Быстрый запуск', 'Запускает Python-проекты без терминала и настроек.'],
          ['🔄', 'Управление версиями', 'Следит за обновлениями и уведомляет о новых версиях.'],
          ['📋', 'Список проектов', 'Удобный список всех установленных проектов с быстрым доступом.'],
          ['🔧', 'Настройка среды', 'Автоматически создаёт виртуальные окружения (venv).'],
          ['💻', 'Локальная работа', 'Всё хранится на вашем компьютере — никаких облаков.'],
        ].map(([icon, title, desc]) => `
          <div class="feature-card">
            <div class="feature-card__icon">${icon}</div>
            <div class="feature-card__title">${title}</div>
            <p class="feature-card__desc">${desc}</p>
          </div>`).join('')}
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:3rem 1rem;">
      <h2 style="margin-bottom:1rem;">Готовы попробовать?</h2>
      <p style="color:var(--text-muted);margin-bottom:2rem;">Скачайте PyLaunch бесплатно и начните запускать Python-проекты уже сегодня.</p>
      ${cfg.downloadUrl && cfg.downloadUrl !== '#'
        ? `<a href="${cfg.downloadUrl}" class="btn btn--primary btn--lg" target="_blank">⬇ Скачать PyLaunch</a>`
        : `<p style="color:var(--text-muted);font-style:italic;">Загрузка будет доступна скоро. Следите за обновлениями!</p>`}
    </div>
  </div>`;
}

export function init() {}
