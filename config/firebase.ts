import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDMJAKh9Fy3gK6CJ8D-BNLBuaKvXCSu6JY',
  authDomain: 'control-de-gastos-0101.firebaseapp.com',
  projectId: 'control-de-gastos-0101',
  storageBucket: 'control-de-gastos-0101.firebasestorage.app',
  messagingSenderId: '510890693728',
  appId: '1:510890693728:web:8e848b37266b607d8ddf05',
  measurementId: 'G-4CR1E7WVX9',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { app, auth, db };
