// =============================================
// Page: Add Project
// =============================================

import { APP_CONFIG } from '../config.js';
import { showToast, escHtml, uploadBinaryToGitHub, createZip } from '../ui.js';
import { getUser, getProfile } from '../auth.js';

let _uploadedFiles = []; // {name, arrayBuffer}
let _selectedTags = [];

export function render() {
  return `
  <div class="page page--narrow">
    <div style="margin-bottom:2rem;">
      <a href="/my-projects" data-link class="btn btn--ghost btn--sm">← Мои проекты</a>
    </div>
    <h1 style="margin-bottom:.5rem;">Добавить проект</h1>
    <p style="margin-bottom:2rem;">После отправки проект попадёт на модерацию.</p>

    <form id="add-project-form" novalidate>
      <!-- FILES -->
      <div class="card" style="margin-bottom:1.5rem;">
        <h3 style="margin-bottom:1rem;">1. Файлы проекта</h3>
        <div class="drop-zone" id="drop-zone">
          <div class="drop-zone__icon">📁</div>
          <div class="drop-zone__text">Перетащите файлы / папку / архив сюда</div>
          <p style="font-size:.8rem;margin-top:.5rem;">или</p>
          <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:.75rem;">
            <button type="button" class="btn btn--ghost btn--sm" id="pick-files">Выбрать файлы</button>
            <button type="button" class="btn btn--ghost btn--sm" id="pick-folder">Выбрать папку</button>
            <button type="button" class="btn btn--ghost btn--sm" id="pick-archive">Загрузить архив ZIP</button>
          </div>
          <input type="file" id="input-files"   multiple style="display:none" />
          <input type="file" id="input-folder"  multiple webkitdirectory style="display:none" />
          <input type="file" id="input-archive" accept=".zip" style="display:none" />
        </div>
        <div id="file-list" style="margin-top:1rem;"></div>
      </div>

      <!-- INFO -->
      <div class="card" style="margin-bottom:1.5rem;">
        <h3 style="margin-bottom:1rem;">2. Информация о проекте</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="proj-name">Название *</label>
            <input type="text" id="proj-name" placeholder="MyCoolTool" maxlength="80" required />
          </div>
          <div class="form-group">
            <label for="proj-version">Версия</label>
            <input type="text" id="proj-version" placeholder="1.0.0" maxlength="20" />
          </div>
        </div>
        <div class="form-group">
          <label for="proj-desc">Описание *</label>
          <textarea id="proj-desc" rows="3" placeholder="Краткое описание проекта…" maxlength="500" required></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="proj-type">Тип проекта *</label>
            <select id="proj-type" required>
              <option value="">— Выберите тип —</option>
              ${APP_CONFIG.catalog.projectTypes.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="proj-github">Ссылка на GitHub (необязательно)</label>
            <input type="url" id="proj-github" placeholder="https://github.com/user/repo" />
          </div>
        </div>
        <div class="form-group">
          <label>Теги (выберите до 10)</label>
          <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem;" id="tag-selector">
            ${APP_CONFIG.catalog.popularTags.map(t =>
              `<span class="tag tag-pick" data-tag="${escHtml(t)}">${escHtml(t)}</span>`
            ).join('')}
          </div>
          <input type="text" id="custom-tag" placeholder="Добавить свой тег → Enter" maxlength="30" />
        </div>
        <div id="selected-tags-display" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem;"></div>
      </div>

      <!-- README -->
      <div class="card" style="margin-bottom:1.5rem;">
        <h3 style="margin-bottom:1rem;">3. README (необязательно)</h3>
        <textarea id="proj-readme" rows="8" placeholder="# My Project&#10;&#10;Описание, инструкция по запуску…"></textarea>
      </div>

      <!-- REQUIREMENTS -->
      <div class="card" style="margin-bottom:2rem;">
        <h3 style="margin-bottom:.5rem;">4. requirements.txt (необязательно)</h3>
        <p style="font-size:.84rem;color:var(--text-muted);margin-bottom:.75rem;">Список зависимостей проекта</p>
        <textarea id="proj-requirements" rows="5" placeholder="requests&#10;pillow&#10;numpy>=1.21"></textarea>
      </div>

      <!-- PROGRESS -->
      <div id="upload-progress" style="display:none;margin-bottom:1.5rem;">
        <p style="font-family:var(--font-display);font-size:.85rem;margin-bottom:.5rem;" id="progress-label">Создание архива…</p>
        <div class="progress-bar"><div class="progress-bar__fill" id="progress-fill" style="width:0%"></div></div>
      </div>

      <button type="submit" class="btn btn--primary btn--lg btn--full" id="submit-btn">
        Отправить на модерацию
      </button>
    </form>
  </div>`;
}

export function init() {
  bindFileInputs();
  bindTagSelector();
  bindForm();
}

// ── FILE HANDLING ──
function bindFileInputs() {
  const zone    = document.getElementById('drop-zone');
  const inputF  = document.getElementById('input-files');
  const inputD  = document.getElementById('input-folder');
  const inputA  = document.getElementById('input-archive');

  document.getElementById('pick-files')?.addEventListener('click', () => inputF.click());
  document.getElementById('pick-folder')?.addEventListener('click', () => inputD.click());
  document.getElementById('pick-archive')?.addEventListener('click', () => inputA.click());

  inputF?.addEventListener('change', e => handleFiles(e.target.files));
  inputD?.addEventListener('change', e => handleFiles(e.target.files));
  inputA?.addEventListener('change', e => handleArchive(e.target.files[0]));

  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone?.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length === 1 && files[0].name.endsWith('.zip')) handleArchive(files[0]);
    else handleFiles(files);
  });
}

async function handleFiles(fileList) {
  _uploadedFiles = [];
  for (const f of fileList) {
    const buf = await f.arrayBuffer();
    _uploadedFiles.push({ name: f.webkitRelativePath || f.name, arrayBuffer: buf });
  }
  renderFileList();
}

async function handleArchive(zipFile) {
  if (!zipFile) return;
  try {
    showToast('Распаковка архива…', 'info', 2000);
    const buf = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    _uploadedFiles = [];
    await Promise.all(
      Object.entries(zip.files).map(async ([name, file]) => {
        if (!file.dir) {
          const ab = await file.async('arraybuffer');
          _uploadedFiles.push({ name, arrayBuffer: ab });
        }
      })
    );
    renderFileList();
  } catch (e) {
    showToast('Ошибка распаковки: ' + e.message, 'error');
  }
}

function renderFileList() {
  const container = document.getElementById('file-list');
  if (!container) return;
  if (_uploadedFiles.length === 0) { container.innerHTML = ''; return; }
  const total = _uploadedFiles.reduce((s, f) => s + (f.arrayBuffer.byteLength || 0), 0);
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
      <span style="font-family:var(--font-display);font-size:.85rem;font-weight:700;">
        Файлов: ${_uploadedFiles.length} · ${formatBytes(total)}
      </span>
      <button type="button" class="btn btn--ghost btn--sm" id="clear-files">Очистить</button>
    </div>
    <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:.3rem;">
      ${_uploadedFiles.slice(0,50).map(f => `
        <div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.3rem .5rem;background:var(--bg-elevated);border-radius:var(--r-sm);">
          <span style="color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(f.name)}</span>
          <span style="color:var(--text-muted);flex-shrink:0;margin-left:.5rem;">${formatBytes(f.arrayBuffer.byteLength)}</span>
        </div>`).join('')}
      ${_uploadedFiles.length > 50 ? `<p style="font-size:.78rem;color:var(--text-muted);text-align:center;">…и ещё ${_uploadedFiles.length-50} файл(ов)</p>` : ''}
    </div>`;
  document.getElementById('clear-files')?.addEventListener('click', () => {
    _uploadedFiles = [];
    container.innerHTML = '';
  });
}

// ── TAG SELECTOR ──
function bindTagSelector() {
  document.querySelectorAll('.tag-pick').forEach(tag => {
    tag.addEventListener('click', () => toggleTag(tag.dataset.tag));
  });

  document.getElementById('custom-tag')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9а-яё\-_]/gi, '').slice(0,30);
      if (val) { toggleTag(val); e.target.value = ''; }
    }
  });
}

function toggleTag(tag) {
  if (_selectedTags.includes(tag)) {
    _selectedTags = _selectedTags.filter(t => t !== tag);
  } else {
    if (_selectedTags.length >= 10) { showToast('Максимум 10 тегов', 'warn'); return; }
    _selectedTags.push(tag);
  }
  renderSelectedTags();

  // Highlight in selector
  document.querySelectorAll('.tag-pick').forEach(el => {
    el.style.background = _selectedTags.includes(el.dataset.tag) ? 'var(--accent-glow)' : '';
    el.style.borderColor = _selectedTags.includes(el.dataset.tag) ? 'var(--accent)' : '';
  });
}

function renderSelectedTags() {
  const el = document.getElementById('selected-tags-display');
  if (!el) return;
  if (_selectedTags.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = '<span style="font-family:var(--font-display);font-size:.78rem;color:var(--text-muted);margin-right:.3rem;">Выбрано:</span>' +
    _selectedTags.map(t =>
      `<span class="tag" style="background:var(--accent-glow);border-color:var(--accent);">
        ${escHtml(t)} <span data-rm="${escHtml(t)}" style="cursor:pointer;margin-left:.3rem;">✕</span>
      </span>`).join('');
  el.querySelectorAll('[data-rm]').forEach(x => x.addEventListener('click', () => toggleTag(x.dataset.rm)));
}

// ── FORM SUBMIT ──
function bindForm() {
  document.getElementById('add-project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name    = document.getElementById('proj-name').value.trim();
    const desc    = document.getElementById('proj-desc').value.trim();
    const type    = document.getElementById('proj-type').value;
    const version = document.getElementById('proj-version').value.trim();
    const github  = document.getElementById('proj-github').value.trim();
    const readme  = document.getElementById('proj-readme').value;
    const reqs    = document.getElementById('proj-requirements').value;

    if (!name) { showToast('Введите название', 'warn'); return; }
    if (!desc) { showToast('Введите описание', 'warn'); return; }
    if (!type) { showToast('Выберите тип проекта', 'warn'); return; }
    if (_uploadedFiles.length === 0) { showToast('Добавьте файлы проекта', 'warn'); return; }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    setProgress(true, 'Создание ZIP-архива…', 20);

    try {
      // 1. Build ZIP
      const filesToZip = [..._uploadedFiles];
      if (readme)  filesToZip.push({ name: 'README.md', arrayBuffer: new TextEncoder().encode(readme).buffer });
      if (reqs)    filesToZip.push({ name: 'requirements.txt', arrayBuffer: new TextEncoder().encode(reqs).buffer });

      const zipBuf = await createZip(filesToZip);
      setProgress(true, 'Загрузка на GitHub…', 50);

      // 2. Get GitHub settings from Firestore
      const { db } = window.__firebase;
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const settingsSnap = await getDoc(doc(db, 'settings', 'app'));
      if (!settingsSnap.exists()) throw new Error('GitHub не настроен. Обратитесь к администратору.');
      const { github: ghCfg } = settingsSnap.data();
      if (!ghCfg?.owner || !ghCfg?.repo || !ghCfg?.token) throw new Error('GitHub не настроен. Обратитесь к администратору.');

      // 3. Upload to GitHub
      const user = getUser();
      const profile = getProfile();
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g,'-').slice(0,40);
      const path = `projects/${user.uid}/${slug}-${Date.now()}.zip`;

      const ghResult = await uploadBinaryToGitHub({
        owner: ghCfg.owner,
        repo:  ghCfg.repo,
        branch: ghCfg.branch || 'main',
        path,
        arrayBuffer: zipBuf,
        message: `Add project: ${name}`,
        token: ghCfg.token,
      });
      setProgress(true, 'Сохранение в базу данных…', 80);

      // 4. Save to Firestore
      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const downloadUrl = ghResult?.content?.download_url || `https://raw.githubusercontent.com/${ghCfg.owner}/${ghCfg.repo}/${ghCfg.branch||'main'}/${path}`;

      await addDoc(collection(db, 'projects'), {
        name,
        description: desc,
        type,
        version,
        tags: _selectedTags,
        githubUrl: github,
        authorUid: user.uid,
        authorLogin: profile?.login || '',
        authorNick: profile?.nick || profile?.login || 'Аноним',
        readme,
        requirements: reqs,
        downloadUrl,
        githubPath: path,
        status: 'pending',
        favorites: 0,
        downloads: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setProgress(true, 'Готово!', 100);
      setTimeout(() => {
        showToast('Проект отправлен на модерацию!', 'ok', 5000);
        window.router.navigate('/my-projects');
      }, 600);

    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
      btn.disabled = false;
      setProgress(false);
    }
  });
}

function setProgress(show, label = '', pct = 0) {
  const el = document.getElementById('upload-progress');
  const lbl = document.getElementById('progress-label');
  const fill = document.getElementById('progress-fill');
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
  if (lbl) lbl.textContent = label;
  if (fill) fill.style.width = pct + '%';
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}
