/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import appletConfig from "../../firebase-applet-config.json";

// User's custom Firebase environment variables (configured on Vercel / .env)
const userEnvConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

// Check if user has defined their own Firebase API credentials (e.g. in Vercel)
const hasUserCustomConfig = Boolean(userEnvConfig.apiKey && userEnvConfig.projectId);

export const activeFirebaseConfig = hasUserCustomConfig
  ? {
      apiKey: userEnvConfig.apiKey,
      authDomain: userEnvConfig.authDomain || `${userEnvConfig.projectId}.firebaseapp.com`,
      projectId: userEnvConfig.projectId,
      storageBucket: userEnvConfig.storageBucket || `${userEnvConfig.projectId}.firebasestorage.app`,
      messagingSenderId: userEnvConfig.messagingSenderId || "",
      appId: userEnvConfig.appId || "",
      measurementId: userEnvConfig.measurementId || "",
    }
  : appletConfig;

// Initialize Firebase with the user's designated project
export const app = !getApps().length ? initializeApp(activeFirebaseConfig) : getApp();

// Target database ID: if using user's custom project, use their custom database ID or default
const customDbId = hasUserCustomConfig
  ? userEnvConfig.firestoreDatabaseId || undefined
  : (appletConfig as any).firestoreDatabaseId;

let firestoreDb;
try {
  firestoreDb = customDbId
    ? initializeFirestore(app, { experimentalForceLongPolling: true }, customDbId)
    : initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  firestoreDb = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Validate connection to Firestore on initial boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Structured Firestore error handling conforming to platform specifications
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
