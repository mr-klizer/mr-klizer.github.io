// =============================================
// Page: About
// =============================================

export function render() {
  return `
  <div class="page page--narrow">
    <h1 style="margin-bottom:.5rem;">О проекте</h1>
    <p style="margin-bottom:2rem;">PyCatalog — открытый каталог Python проектов.</p>

    <div class="card" style="margin-bottom:1.25rem;">
      <h3 style="margin-bottom:.75rem;">🎯 Миссия</h3>
      <p>Мы создаём место, где Python-разработчики могут делиться своими проектами, получать обратную связь и находить вдохновение. Каждый проект проходит модерацию, чтобы гарантировать качество каталога.</p>
    </div>

    <div class="card" style="margin-bottom:1.25rem;">
      <h3 style="margin-bottom:.75rem;">⚙️ Технологии</h3>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        ${[
          ['Firebase', 'Аутентификация, база данных (Firestore), хранилище'],
          ['GitHub API', 'Хранение ZIP-архивов проектов в репозитории'],
          ['JSZip', 'Создание и распаковка архивов прямо в браузере'],
          ['Vanilla JS', 'SPA без тяжёлых фреймворков — быстро и просто'],
          ['GitHub Pages', 'Хостинг сайта'],
        ].map(([name, desc]) => `
          <div style="display:flex;gap:.75rem;align-items:flex-start;">
            <span class="badge badge--accent">${name}</span>
            <span style="font-size:.85rem;color:var(--text-secondary);">${desc}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:1.25rem;">
      <h3 style="margin-bottom:.75rem;">🛡️ Безопасность</h3>
      <p>Все данные хранятся в Firebase с правилами безопасности Firestore. GitHub-токен хранится только в защищённых настройках администратора и никогда не передаётся клиентам. Пароли управляются Firebase Authentication.</p>
    </div>

    <div class="card">
      <h3 style="margin-bottom:.75rem;">📬 Связь</h3>
      <p>Если у вас есть вопросы — создайте тикет в разделе <a href="/support" data-link>Поддержка</a>.</p>
    </div>
  </div>`;
}

export function init() {}
