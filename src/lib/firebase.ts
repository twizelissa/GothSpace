import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app;
if (!firebaseConfig.apiKey) {
  console.warn(
    'Firebase API Key is missing. Please configure VITE_FIREBASE_API_KEY and other environment variables in your .env file.'
  );
  // Use a valid format firebase config to prevent crash during import/initialization
  const placeholderConfig = {
    apiKey: 'AIzaSyBPvA-vmHndjgFpTEYEz6kLDjyzYwzxRVg',
    authDomain: 'inzira-elissa.firebaseapp.com',
    projectId: 'inzira-elissa',
    storageBucket: 'inzira-elissa.appspot.com',
    messagingSenderId: '613232005184',
    appId: '1:613232005184:web:ddd7be568e78848e560fa5',
  };
  app = getApps().length === 0 ? initializeApp(placeholderConfig) : getApp();
} else {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
