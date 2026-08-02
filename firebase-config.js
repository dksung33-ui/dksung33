/* ==========================================================================
   Ten Maker - Firebase Integration (Google Auth, Anonymous Auth & Firestore)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Safely load Firebase Config from window variables, process.env, or fallback
const firebaseConfig = window.ENV_FIREBASE_CONFIG || {
  apiKey: typeof process !== 'undefined' && process.env?.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: typeof process !== 'undefined' && process.env?.VITE_FIREBASE_AUTH_DOMAIN || "ten-maker-app.firebaseapp.com",
  projectId: typeof process !== 'undefined' && process.env?.VITE_FIREBASE_PROJECT_ID || "ten-maker-app",
  storageBucket: typeof process !== 'undefined' && process.env?.VITE_FIREBASE_STORAGE_BUCKET || "ten-maker-app.appspot.com",
  messagingSenderId: typeof process !== 'undefined' && process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: typeof process !== 'undefined' && process.env?.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

let app = null;
let auth = null;
let db = null;
let isFirebaseReady = false;

try {
  // Try initializing Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseReady = true;
  console.log("🔥 Firebase initialized successfully.");
} catch (e) {
  console.warn("⚠️ Firebase fallback mode (Offline/Local storage active). Reason:", e.message);
}

// Global Auth State Container
export const currentUser = {
  uid: 'guest_' + Math.random().toString(36).substr(2, 6),
  displayName: '익명 용사',
  photoURL: null,
  isAnonymous: true
};

// Listen to Auth State Changes
export function initAuthListener(onUserChanged) {
  if (isFirebaseReady && auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser.uid = user.uid;
        currentUser.displayName = user.displayName || (user.isAnonymous ? '익명 용사' : '학생');
        currentUser.photoURL = user.photoURL;
        currentUser.isAnonymous = user.isAnonymous;
      } else {
        currentUser.uid = 'guest_' + Math.random().toString(36).substr(2, 6);
        currentUser.displayName = '익명 용사';
        currentUser.photoURL = null;
        currentUser.isAnonymous = true;
      }
      if (onUserChanged) onUserChanged(currentUser);
    });
  } else {
    if (onUserChanged) onUserChanged(currentUser);
  }
}

// Google Login
export async function loginWithGoogle() {
  if (!isFirebaseReady || !auth) {
    throw new Error("Firebase 설정이 올바르지 않습니다. (기본 익명 모드로 구동 중)");
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// Anonymous Guest Login
export async function loginAnonymously() {
  if (isFirebaseReady && auth) {
    const result = await signInAnonymously(auth);
    return result.user;
  } else {
    // Local fallback
    currentUser.uid = 'guest_' + Math.floor(Math.random() * 10000);
    currentUser.displayName = '익명 용사';
    return currentUser;
  }
}

// Logout
export async function logoutUser() {
  if (isFirebaseReady && auth && !currentUser.isAnonymous) {
    await firebaseSignOut(auth);
  }
  currentUser.uid = 'guest_' + Math.random().toString(36).substr(2, 6);
  currentUser.displayName = '익명 용사';
  currentUser.photoURL = null;
  currentUser.isAnonymous = true;
}

// Save Boss Challenge Record to Firestore & LocalStorage
export async function saveBossRecord(record) {
  // Format record data
  const entry = {
    userId: currentUser.uid,
    userName: currentUser.displayName || record.userName || '익명 용사',
    photoURL: currentUser.photoURL || null,
    score: record.score, // e.g. 10 or 9 (out of 10)
    timeSeconds: parseFloat(record.timeSeconds.toFixed(2)), // e.g. 18.45s
    goldCount: record.goldCount,
    miniGameClears: record.miniGameClears,
    createdAt: new Date().toISOString()
  };

  // 1. Always save to LocalStorage for offline reliability
  let localLeaderboard = JSON.parse(localStorage.getItem('ten_maker_hof') || '[]');
  localLeaderboard.push(entry);
  localStorage.setItem('ten_maker_hof', JSON.stringify(localLeaderboard));

  // 2. Save to Firestore if available
  if (isFirebaseReady && db) {
    try {
      await addDoc(collection(db, "hall_of_fame"), {
        ...entry,
        createdAt: serverTimestamp()
      });
      console.log("☁️ Record saved to Firestore leaderboard");
    } catch (e) {
      console.warn("Could not sync to Firestore:", e);
    }
  }

  return entry;
}

// Fetch Hall of Fame Records with Priority Sorting
export async function fetchHallOfFame() {
  let records = [];

  if (isFirebaseReady && db) {
    try {
      const q = query(collection(db, "hall_of_fame"), limit(50));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        records.push(doc.data());
      });
    } catch (e) {
      console.warn("Firestore fetch failed, fallback to local:", e);
    }
  }

  // Fallback / Merge with LocalStorage
  if (records.length === 0) {
    records = JSON.parse(localStorage.getItem('ten_maker_hof') || '[]');
  }

  // ⭐️ Sort Algorithm:
  // 1st Priority: score (10 questions matched > 9 matched > ...)
  // 2nd Priority: timeSeconds (shorter time is better)
  // 3rd Priority: goldCount (higher gold is better)
  records.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first (10 > 9)
    }
    if (a.timeSeconds !== b.timeSeconds) {
      return a.timeSeconds - b.timeSeconds; // Shorter time first
    }
    return b.goldCount - a.goldCount; // Higher gold first
  });

  return records;
}
