// =============================================
// PyCatalog — SPA Router (Hash-based for GitHub Pages)
// =============================================

import { ROUTES } from './config.js';
import { isLoggedIn, isAdmin, isSuperAdmin, getProfile } from './auth.js';

// Pages (lazy-loaded)
const pages = {
  [ROUTES.HOME]:        () => import('./pages/home.js'),
  [ROUTES.CATALOG]:     () => import('./pages/catalog.js'),
  [ROUTES.LOGIN]:       () => import('./pages/login.js'),
  [ROUTES.REGISTER]:    () => import('./pages/register.js'),
  [ROUTES.FORGOT]:      () => import('./pages/forgot.js'),
  [ROUTES.PROFILE]:     () => import('./pages/profile.js'),
  [ROUTES.MY_PROJECTS]: () => import('./pages/my-projects.js'),
  [ROUTES.FAVORITES]:   () => import('./pages/favorites.js'),
  [ROUTES.SUPPORT]:     () => import('./pages/support.js'),
  [ROUTES.ABOUT]:       () => import('./pages/about.js'),
  [ROUTES.PYLAUNCH]:    () => import('./pages/pylaunch.js'),
  [ROUTES.ADD_PROJECT]: () => import('./pages/add-project.js'),
  // Project detail: /project/:id
  '/project':           () => import('./pages/project-detail.js'),
  // Admin
  [ROUTES.ADMIN]:           () => import('./pages/admin/index.js'),
  [ROUTES.ADMIN_USERS]:     () => import('./pages/admin/users.js'),
  [ROUTES.ADMIN_PROJECTS]:  () => import('./pages/admin/projects.js'),
  [ROUTES.ADMIN_TICKETS]:   () => import('./pages/admin/tickets.js'),
  [ROUTES.ADMIN_SETTINGS]:  () => import('./pages/admin/settings.js'),
};

// Routes that require login
const AUTH_REQUIRED = [
  ROUTES.PROFILE, ROUTES.MY_PROJECTS, ROUTES.FAVORITES,
  ROUTES.SUPPORT, ROUTES.ADD_PROJECT,
];

// Routes that require admin
const ADMIN_REQUIRED = [
  ROUTES.ADMIN, ROUTES.ADMIN_USERS, ROUTES.ADMIN_PROJECTS,
  ROUTES.ADMIN_TICKETS, ROUTES.ADMIN_SETTINGS,
];

class Router {
  constructor() {
    this.app = document.getElementById('app');
    this.current = null;

    window.addEventListener('hashchange', () => this._handle());
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-link]');
      if (a) {
        e.preventDefault();
        this.navigate(a.getAttribute('href'));
      }
    });
  }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  getPath() {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    return hash;
  }

  async _handle() {
    const fullPath = this.getPath();
    let path = fullPath;
    let params = {};

    // Match /project/:id
    const projectMatch = fullPath.match(/^\/project\/(.+)$/);
    if (projectMatch) {
      path = '/project';
      params.id = projectMatch[1];
    }

    // Match /admin sub-pages
    const adminMatch = fullPath.match(/^(\/admin\/[a-z-]+)/);
    if (adminMatch) path = adminMatch[1];

    // Auth guard
    if (AUTH_REQUIRED.includes(fullPath) && !isLoggedIn()) {
      this.navigate(ROUTES.LOGIN);
      return;
    }

    // Admin guard
    if (ADMIN_REQUIRED.some(r => fullPath.startsWith(r)) && !isAdmin()) {
      this.navigate(ROUTES.HOME);
      return;
    }

    // Settings guard (super admin only)
    if (fullPath === ROUTES.ADMIN_SETTINGS && !isSuperAdmin()) {
      this.navigate(ROUTES.ADMIN);
      return;
    }

    // Redirect logged-in users from auth pages
    if (isLoggedIn() && [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT].includes(fullPath)) {
      this.navigate(ROUTES.HOME);
      return;
    }

    const loader = pages[path];
    if (!loader) {
      this._render404();
      return;
    }

    // Show loading
    this.app.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

    try {
      const mod = await loader();
      this.current = path;
      this._updateActiveLinks(fullPath);
      const html = await mod.render(params);
      this.app.innerHTML = html;
      mod.init && mod.init(params);
    } catch (e) {
      console.error('Router error:', e);
      this._renderError(e);
    }
  }

  _updateActiveLinks(path) {
    document.querySelectorAll('[data-link]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === path);
    });
  }

  _render404() {
    this.app.innerHTML = `
      <div class="page page--narrow" style="text-align:center;padding-top:5rem;">
        <div style="font-size:5rem;margin-bottom:1rem;">404</div>
        <h1 style="margin-bottom:.5rem;">Страница не найдена</h1>
        <p style="margin-bottom:2rem;">Запрошенная страница не существует.</p>
        <a href="/" data-link class="btn btn--primary">На главную</a>
      </div>`;
  }

  _renderError(e) {
    this.app.innerHTML = `
      <div class="page page--narrow" style="text-align:center;padding-top:5rem;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠</div>
        <h2 style="margin-bottom:.5rem;">Ошибка загрузки</h2>
        <p style="margin-bottom:2rem;">${e.message}</p>
        <a href="/" data-link class="btn btn--ghost">На главную</a>
      </div>`;
  }

  start() {
    this._handle();
  }
}

export const router = new Router();
window.router = router;
