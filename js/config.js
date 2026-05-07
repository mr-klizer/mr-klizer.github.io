// =============================================
// PyCatalog — Config (loaded from Firestore settings)
// =============================================

export const APP_CONFIG = {
  name: 'PyCatalog',
  version: '1.0.0',
  // GitHub settings - loaded dynamically from Firestore by super-admin
  github: {
    owner: '',      // set via admin panel
    repo: '',       // set via admin panel
    branch: 'main',
    // Token stored server-side in Firestore (encrypted), never exposed here
  },
  // PyLaunch ad settings - loaded from Firestore
  pylaunch: {
    enabled: true,
    downloadUrl: '#',
    description: 'Локальный менеджер Python проектов',
    version: '1.0.0',
  },
  // Catalog settings
  catalog: {
    perPage: 12,
    projectTypes: [
      'Утилита', 'Библиотека', 'Веб-приложение', 'Бот',
      'Игра', 'Скрипт', 'API', 'ML/AI', 'Инструмент разработчика', 'Другое'
    ],
    popularTags: [
      'python3', 'asyncio', 'tkinter', 'flask', 'django', 'fastapi',
      'telegram', 'discord', 'automation', 'cli', 'gui', 'data',
      'machine-learning', 'parser', 'api', 'database', 'crypto',
      'image', 'video', 'audio'
    ],
  },
};

// User roles
export const ROLES = {
  USER:        'user',
  ADMIN:       'admin',
  SUPER_ADMIN: 'super_admin',
};

// Project statuses
export const PROJECT_STATUS = {
  DRAFT:    'draft',
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Ticket statuses
export const TICKET_STATUS = {
  OPEN:   'open',
  CLOSED: 'closed',
};

// Routes
export const ROUTES = {
  HOME:        '/',
  CATALOG:     '/catalog',
  PROJECT:     '/project',   // + /:id
  ADD_PROJECT: '/add-project',
  LOGIN:       '/login',
  REGISTER:    '/register',
  FORGOT:      '/forgot-password',
  PROFILE:     '/profile',
  MY_PROJECTS: '/my-projects',
  FAVORITES:   '/favorites',
  SUPPORT:     '/support',
  ABOUT:       '/about',
  PYLAUNCH:    '/pylaunch',
  ADMIN:       '/admin',
  ADMIN_USERS:    '/admin/users',
  ADMIN_PROJECTS: '/admin/projects',
  ADMIN_TICKETS:  '/admin/tickets',
  ADMIN_SETTINGS: '/admin/settings',
};

// Load dynamic settings from Firestore
export async function loadAppSettings() {
  try {
    await new Promise(r => {
      if (window.__firebase) { r(); return; }
      window.addEventListener('firebase-ready', r, { once: true });
    });
    const { db } = window.__firebase;
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.github)   Object.assign(APP_CONFIG.github, data.github);
      if (data.pylaunch) Object.assign(APP_CONFIG.pylaunch, data.pylaunch);
      if (data.catalog)  Object.assign(APP_CONFIG.catalog, data.catalog);
    }
  } catch (e) {
    console.warn('Could not load app settings:', e.message);
  }
}
