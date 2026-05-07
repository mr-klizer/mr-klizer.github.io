// =============================================
// PyCatalog — Main Entry Point
// =============================================

import { initAuth } from './auth.js';
import { router } from './router.js';
import { initTheme, toggleTheme, initBurger, initUserDropdown, initRipples } from './ui.js';
import { loadAppSettings } from './config.js';

async function main() {
  // 1. Apply theme immediately
  initTheme();

  // 2. Init UI chrome
  initBurger();
  initUserDropdown();

  // Theme toggle button
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // 3. Load Firebase + auth
  await initAuth();

  // 4. Load dynamic settings from Firestore
  loadAppSettings(); // non-blocking

  // 5. Start router (reads current hash)
  router.start();

  // 6. Add ripple to any initial buttons
  setTimeout(initRipples, 100);
}

// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const footer = document.querySelector('.site-footer');
  if (!footer) {
    const f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML = `© ${new Date().getFullYear()} PyCatalog · 
      <a href="/about" data-link>О проекте</a> · 
      <a href="/support" data-link>Поддержка</a>`;
    document.body.appendChild(f);
  }
});

main().catch(console.error);
