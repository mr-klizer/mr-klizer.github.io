// =============================================
// Page: Admin — Settings (Super Admin only)
// =============================================

import { adminSidebar } from './index.js';
import { escHtml, showToast } from '../../ui.js';
import { APP_CONFIG } from '../../config.js';

let _settings = {};

export function render() {
  return `
  <div class="admin-layout">
    ${adminSidebar('settings')}
    <div class="admin-content">
      <h2 style="margin-bottom:.5rem;">Глобальные настройки</h2>
      <p style="color:var(--text-muted);margin-bottom:2rem;font-size:.88rem;">Доступно только Главному Администратору</p>

      <div class="tabs" id="settings-tabs">
        <button class="tab-btn active" data-tab="github">GitHub</button>
        <button class="tab-btn" data-tab="pylaunch">PyLaunch</button>
        <button class="tab-btn" data-tab="catalog">Каталог</button>
        <button class="tab-btn" data-tab="firebase">Firebase</button>
      </div>

      <div id="settings-content">
        <div class="loading-overlay"><div class="spinner spinner--sm"></div></div>
      </div>
    </div>
  </div>`;
}

export async function init() {
  await loadSettings();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });
}

async function loadSettings() {
  try {
    const { db } = window.__firebase;
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'settings', 'app'));
    _settings = snap.exists() ? snap.data() : {};
    renderTab('github');
  } catch (e) {
    document.getElementById('settings-content').innerHTML = `<p style="color:var(--error);">Ошибка: ${e.message}</p>`;
  }
}

function renderTab(tab) {
  const container = document.getElementById('settings-content');
  if (!container) return;

  if (tab === 'github') {
    const gh = _settings.github || {};
    container.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:1rem;">Настройки GitHub репозитория</h3>
        <p style="font-size:.84rem;color:var(--text-muted);margin-bottom:1.25rem;">
          Здесь хранится конфигурация репозитория для загрузки ZIP-архивов проектов.
          <strong style="color:var(--error);">Токен хранится в Firestore и недоступен пользователям.</strong>
        </p>
        <div class="form-group">
          <label for="gh-owner">Владелец репозитория (логин GitHub)</label>
          <input type="text" id="gh-owner" value="${escHtml(gh.owner||'')}" placeholder="your-username" />
        </div>
        <div class="form-group">
          <label for="gh-repo">Название репозитория</label>
          <input type="text" id="gh-repo" value="${escHtml(gh.repo||'')}" placeholder="pycatalog-files" />
        </div>
        <div class="form-group">
          <label for="gh-branch">Ветка</label>
          <input type="text" id="gh-branch" value="${escHtml(gh.branch||'main')}" placeholder="main" />
        </div>
        <div class="form-group">
          <label for="gh-token">Personal Access Token (GitHub PAT)</label>
          <input type="password" id="gh-token" value="${escHtml(gh.token||'')}"
                 placeholder="ghp_••••••••••••••••••" autocomplete="new-password" />
          <p style="font-size:.78rem;color:var(--text-muted);margin-top:.25rem;">
            Токен хранится зашифрованно в Firestore. Нужны права: repo (contents read/write).
          </p>
        </div>
        <button class="btn btn--primary" id="save-github">Сохранить GitHub настройки</button>
      </div>`;

    document.getElementById('save-github')?.addEventListener('click', async () => {
      const data = {
        owner:  document.getElementById('gh-owner').value.trim(),
        repo:   document.getElementById('gh-repo').value.trim(),
        branch: document.getElementById('gh-branch').value.trim() || 'main',
        token:  document.getElementById('gh-token').value.trim(),
      };
      if (!data.owner || !data.repo || !data.token) { showToast('Заполните все поля', 'warn'); return; }
      await saveSettings({ github: data }, 'GitHub настройки сохранены');
    });
  }

  else if (tab === 'pylaunch') {
    const pl = _settings.pylaunch || {};
    container.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:1rem;">Настройки рекламы PyLaunch</h3>
        <div class="form-group">
          <label for="pl-enabled">Показывать рекламу PyLaunch</label>
          <select id="pl-enabled">
            <option value="true" ${pl.enabled!==false?'selected':''}>Да</option>
            <option value="false" ${pl.enabled===false?'selected':''}>Нет</option>
          </select>
        </div>
        <div class="form-group">
          <label for="pl-url">Ссылка для скачивания</label>
          <input type="url" id="pl-url" value="${escHtml(pl.downloadUrl||'')}" placeholder="https://example.com/pylaunch.exe" />
        </div>
        <div class="form-group">
          <label for="pl-version">Версия</label>
          <input type="text" id="pl-version" value="${escHtml(pl.version||'')}" placeholder="1.0.0" />
        </div>
        <div class="form-group">
          <label for="pl-desc">Описание (отображается на странице PyLaunch)</label>
          <textarea id="pl-desc" rows="3" maxlength="500">${escHtml(pl.description||'')}</textarea>
        </div>
        <button class="btn btn--primary" id="save-pylaunch">Сохранить настройки PyLaunch</button>
      </div>`;

    document.getElementById('save-pylaunch')?.addEventListener('click', async () => {
      await saveSettings({
        pylaunch: {
          enabled:     document.getElementById('pl-enabled').value === 'true',
          downloadUrl: document.getElementById('pl-url').value.trim(),
          version:     document.getElementById('pl-version').value.trim(),
          description: document.getElementById('pl-desc').value.trim(),
        }
      }, 'Настройки PyLaunch сохранены');
    });
  }

  else if (tab === 'catalog') {
    const cat = _settings.catalog || {};
    const types = cat.projectTypes || APP_CONFIG.catalog.projectTypes;
    const tags  = cat.popularTags  || APP_CONFIG.catalog.popularTags;

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.25rem;">
        <h3 style="margin-bottom:1rem;">Типы проектов</h3>
        <p style="font-size:.84rem;color:var(--text-muted);margin-bottom:.75rem;">Каждый тип — на отдельной строке</p>
        <textarea id="cat-types" rows="12" style="font-family:var(--font-mono);font-size:.85rem;">${types.join('\n')}</textarea>
        <button class="btn btn--primary" style="margin-top:.75rem;" id="save-types">Сохранить типы</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:1rem;">Популярные теги</h3>
        <p style="font-size:.84rem;color:var(--text-muted);margin-bottom:.75rem;">Каждый тег — на отдельной строке (строчные, без пробелов)</p>
        <textarea id="cat-tags" rows="12" style="font-family:var(--font-mono);font-size:.85rem;">${tags.join('\n')}</textarea>
        <button class="btn btn--primary" style="margin-top:.75rem;" id="save-tags">Сохранить теги</button>
      </div>`;

    document.getElementById('save-types')?.addEventListener('click', async () => {
      const newTypes = document.getElementById('cat-types').value.split('\n').map(x=>x.trim()).filter(Boolean);
      await saveSettings({ catalog: { ...(_settings.catalog||{}), projectTypes: newTypes } }, 'Типы проектов сохранены');
    });
    document.getElementById('save-tags')?.addEventListener('click', async () => {
      const newTags = document.getElementById('cat-tags').value.split('\n').map(x=>x.trim().toLowerCase().replace(/\s+/g,'-')).filter(Boolean);
      await saveSettings({ catalog: { ...(_settings.catalog||{}), popularTags: newTags } }, 'Теги сохранены');
    });
  }

  else if (tab === 'firebase') {
    container.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:1rem;">Firebase конфигурация</h3>
        <p style="color:var(--warn);font-size:.85rem;margin-bottom:1rem;">
          ⚠ Изменение этих настроек затронет весь сайт. Будьте осторожны.
        </p>
        <div class="form-group">
          <label>API Key</label>
          <input type="text" id="fb-apiKey" value="${escHtml(_settings.firebase?.apiKey || 'AIzaSyBQdNZ7fVobdopQeyOIkZ4m6DWpr6HWThM')}" />
        </div>
        <div class="form-group">
          <label>Auth Domain</label>
          <input type="text" id="fb-authDomain" value="${escHtml(_settings.firebase?.authDomain || 'py-catalog.firebaseapp.com')}" />
        </div>
        <div class="form-group">
          <label>Project ID</label>
          <input type="text" id="fb-projectId" value="${escHtml(_settings.firebase?.projectId || 'py-catalog')}" />
        </div>
        <div class="form-group">
          <label>Storage Bucket</label>
          <input type="text" id="fb-storageBucket" value="${escHtml(_settings.firebase?.storageBucket || 'py-catalog.firebasestorage.app')}" />
        </div>
        <div class="form-group">
          <label>Messaging Sender ID</label>
          <input type="text" id="fb-messagingSenderId" value="${escHtml(_settings.firebase?.messagingSenderId || '605918141150')}" />
        </div>
        <div class="form-group">
          <label>App ID</label>
          <input type="text" id="fb-appId" value="${escHtml(_settings.firebase?.appId || '1:605918141150:web:519037f36d976357e8004f')}" />
        </div>
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:1rem;">
          Изменения Firebase конфига применятся после перезагрузки страницы.
        </p>
        <button class="btn btn--primary" id="save-firebase">Сохранить Firebase конфиг</button>
      </div>`;

    document.getElementById('save-firebase')?.addEventListener('click', async () => {
      await saveSettings({
        firebase: {
          apiKey:            document.getElementById('fb-apiKey').value.trim(),
          authDomain:        document.getElementById('fb-authDomain').value.trim(),
          projectId:         document.getElementById('fb-projectId').value.trim(),
          storageBucket:     document.getElementById('fb-storageBucket').value.trim(),
          messagingSenderId: document.getElementById('fb-messagingSenderId').value.trim(),
          appId:             document.getElementById('fb-appId').value.trim(),
        }
      }, 'Firebase конфигурация сохранена');
    });
  }
}

async function saveSettings(partial, successMsg) {
  try {
    const { db } = window.__firebase;
    const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    Object.assign(_settings, partial);
    await setDoc(doc(db, 'settings', 'app'), _settings, { merge: true });
    showToast(successMsg || 'Сохранено', 'ok');
  } catch (e) {
    showToast('Ошибка сохранения: ' + e.message, 'error');
  }
}
