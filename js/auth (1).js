// =============================================
// PyCatalog — Auth Module
// =============================================

import { ROLES } from './config.js';
import { showToast } from './ui.js';

let _user = null;
let _profile = null;
const _listeners = [];

export function getUser()    { return _user; }
export function getProfile() { return _profile; }
export function isLoggedIn() { return !!_user; }
export function isAdmin()    { return _profile?.role === ROLES.ADMIN || _profile?.role === ROLES.SUPER_ADMIN; }
export function isSuperAdmin() { return _profile?.role === ROLES.SUPER_ADMIN; }

// Принудительно перезагружает профиль из Firestore (нужно после изменения favorites)
export async function refreshProfile() {
  if (!_user) return null;
  const { db } = await getFirebase();
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDoc(doc(db, 'users', _user.uid));
  if (snap.exists()) {
    _profile = snap.data();
    _notify();
  }
  return _profile;
}

export function onAuthChange(fn) {
  _listeners.push(fn);
  if (_profile !== undefined) fn(_user, _profile);
}
function _notify() { _listeners.forEach(fn => fn(_user, _profile)); }

// ── Wait for Firebase ──
async function getFirebase() {
  if (window.__firebase) return window.__firebase;
  return new Promise(r => window.addEventListener('firebase-ready', () => r(window.__firebase), { once: true }));
}

// ── Init Auth Listener ──
export async function initAuth() {
  const { auth, db } = await getFirebase();
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { doc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      _user = firebaseUser;
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          _profile = snap.data();
          // Update last seen
          updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastSeen: serverTimestamp()
          }).catch(() => {});
        } else {
          _profile = null;
        }
      } catch (e) {
        _profile = null;
      }
    } else {
      _user = null;
      _profile = null;
    }
    updateHeaderUI();
    _notify();
  });
}

// ── Register ──
export async function register({ login, nick, email, password }) {
  const { auth, db } = await getFirebase();
  const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { doc, setDoc, query, collection, where, getDocs, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  // Check login uniqueness
  const q = query(collection(db, 'users'), where('login', '==', login.toLowerCase()));
  const existing = await getDocs(q);
  if (!existing.empty) throw new Error('Этот логин уже занят');

  // Check email uniqueness (Firebase will also check but let's give a nicer message)
  const q2 = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const existing2 = await getDocs(q2);
  if (!existing2.empty) throw new Error('Этот email уже зарегистрирован');

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, 'users', uid), {
    uid,
    login: login.toLowerCase(),
    nick,
    email: email.toLowerCase(),
    role: ROLES.USER,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    favorites: [],
    banned: false,
    banReason: null,
    banUntil: null,
  });

  return cred;
}

// ── Login (by email or login) ──
export async function login({ identifier, password }) {
  const { auth, db } = await getFirebase();
  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  let email = identifier;

  // If not an email, look up by login
  if (!identifier.includes('@')) {
    const q = query(collection(db, 'users'), where('login', '==', identifier.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Пользователь с таким логином не найден');
    email = snap.docs[0].data().email;
  }

  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Check ban
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.banned) {
      const until = data.banUntil ? new Date(data.banUntil.seconds * 1000) : null;
      if (!until || until > new Date()) {
        await logout();
        const reason = data.banReason || 'Нарушение правил';
        const untilStr = until ? ` до ${until.toLocaleDateString('ru')}` : ' навсегда';
        throw new Error(`Ваш аккаунт заблокирован${untilStr}.\nПричина: ${reason}`);
      }
    }
  }

  return cred;
}

// ── Logout ──
export async function logout() {
  const { auth } = await getFirebase();
  const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  await signOut(auth);
}

// ── Forgot Password ──
export async function sendPasswordReset(email) {
  const { auth, db } = await getFirebase();
  const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

  // Verify email exists
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Email не найден в системе');

  await sendPasswordResetEmail(auth, email, {
    url: window.location.origin + '/login',
  });
}

// ── Update Header UI based on auth state ──
function updateHeaderUI() {
  const authArea  = document.getElementById('auth-area');
  const userMenu  = document.getElementById('user-menu');
  const nickEl    = document.getElementById('user-nick-display');
  const avatarEl  = document.getElementById('user-avatar-display');
  const adminLinks = document.getElementById('admin-links');
  const mobileAuth = document.getElementById('mobile-auth');

  if (!authArea) return;

  if (_user && _profile) {
    authArea.style.display  = 'none';
    userMenu.style.display  = 'block';
    if (mobileAuth) mobileAuth.style.display = 'none';
    if (nickEl) nickEl.textContent = _profile.nick || _profile.login;
    if (avatarEl) avatarEl.textContent = (_profile.nick || _profile.login || 'U')[0].toUpperCase();
    if (adminLinks) adminLinks.style.display = isAdmin() ? 'block' : 'none';
  } else {
    authArea.style.display  = 'flex';
    userMenu.style.display  = 'none';
    if (mobileAuth) mobileAuth.style.display = 'flex';
    if (adminLinks) adminLinks.style.display = 'none';
  }
}

// ── Logout button ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await logout();
    showToast('Вы вышли из аккаунта', 'ok');
    window.router?.navigate('/');
  });
});
