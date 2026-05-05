
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, sendPasswordResetEmail,
         updateEmail, updatePassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, enableNetwork, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
         collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
         arrayUnion, arrayRemove, increment, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ══════════════════════════════════════════════════
// !! ЗАМЕНИ ЭТОТ БЛОК СВОИМИ ДАННЫМИ ИЗ FIREBASE !!
// ══════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyBQdNZ7fVobdopQeyOIkZ4m6DWpr6HWThM",
  authDomain:        "py-catalog.firebaseapp.com",
  projectId:         "py-catalog",
  storageBucket:     "py-catalog.firebasestorage.app",
  messagingSenderId: "605918141150",
  appId:             "1:605918141150:web:519037f36d976357e8004f"
};
// ══════════════════════════════════════════════════

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
// Принудительно включаем сеть Firestore (после создания db)
enableNetwork(db).catch(()=>{});
// GitHub Storage config — задаётся суперадмином в панели
// Хранит архивы в отдельном GitHub репозитории через API
window.GH_CONFIG = JSON.parse(localStorage.getItem('pycat_gh_config')||'{}');
// GH_CONFIG = { owner, repo, token }

// ── Expose to global scope for non-module functions ──
window.loadUserProfile = loadUserProfile;
window.FB = { auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateEmail, updatePassword,
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch };

// ── Auth state listener ──
async function loadUserProfile(user, attempt=1) {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      window.CURRENT_USER = { uid: user.uid, email: user.email, ...snap.data() };
    } else {
      window.CURRENT_USER = { uid: user.uid, email: user.email };
    }
  } catch(e) {
    if (e.code === 'unavailable' && attempt <= 4) {
      // Firestore offline — retry with exponential backoff
      await new Promise(r => setTimeout(r, attempt * 800));
      return loadUserProfile(user, attempt + 1);
    }
    // After retries or other error — use basic auth data without Firestore
    console.warn('Firestore unavailable, using auth-only profile:', e.message);
    window.CURRENT_USER = { uid: user.uid, email: user.email };
  }
}
onAuthStateChanged(auth, async user => {
  if (user) {
    await loadUserProfile(user);
  } else {
    window.CURRENT_USER = null;
  }
  if (typeof window.onAuthReady === 'function') window.onAuthReady();
});

// ── Real-time catalog listener ──
window.startCatalogListener = function() {
  // Без orderBy — сортировка на клиенте, не нужен составной индекс Firestore
  const q = query(collection(db, 'programs'), where('status','==','approved'));
  return onSnapshot(q, snap => {
    // Сортируем на клиенте по звёздам (не нужен индекс Firestore)
    window.CATALOG = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.stars||0) - (a.stars||0));
    if (typeof window.onCatalogUpdate === 'function') window.onCatalogUpdate();
  });
};

// ── Real-time pending listener (admin) ──
window.startPendingListener = function() {
  // Без orderBy — не нужен составной индекс
  const q = query(collection(db, 'programs'), where('status','in',['pending','rejected']));
  return onSnapshot(q, snap => {
    window.PENDING = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (typeof window.onPendingUpdate === 'function') window.onPendingUpdate();
  });
};

window.firebaseReady = true;
