/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Helper to safely strip newlines, carriage returns, or whitespace accidentally copied into env vars
const sanitize = (val: string | undefined, fallback: string): string => {
  const target = val || fallback;
  return target.replace(/[\r\n\t\s]/g, "").trim();
};

// Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: sanitize(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSy_MOCK_FIREBASE_API_KEY_DEMO"),
  authDomain: sanitize(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "socialcart-app.firebaseapp.com"),
  projectId: sanitize(import.meta.env.VITE_FIREBASE_PROJECT_ID, "socialcart-app"),
  storageBucket: sanitize(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "socialcart-app.firebasestorage.app"),
  messagingSenderId: sanitize(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "123456789012"),
  appId: sanitize(import.meta.env.VITE_FIREBASE_APP_ID, "1:123456789012:web:abcdef1234567890"),
  measurementId: sanitize(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-MOCKMEASURE")
};

// Initialize Firebase safely (avoiding duplicate initialization)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});
export const db = getFirestore(app);
export const storage = getStorage(app);
