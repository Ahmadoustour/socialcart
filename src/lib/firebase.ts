/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC5EEduQB--mCsEGVKS7touK1EYnotLhek",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "socialcart-f818e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "socialcart-f818e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "socialcart-f818e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "971744960264",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:971744960264:web:9ef9f03741715944dc96bd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-R87ZHKP97L"
};

// Initialize Firebase safely (avoiding duplicate initialization)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
