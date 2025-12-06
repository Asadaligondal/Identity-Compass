import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase config
// Get this from Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: "AIzaSyB7CTNc1HJvmbkzg4CuMqWEXaETsbWewEA",
  authDomain: "identity-compass-79f6a.firebaseapp.com",
  projectId: "identity-compass-79f6a",
  storageBucket: "identity-compass-79f6a.firebasestorage.app",
  messagingSenderId: "388774577142",
  appId: "1:388774577142:web:b3b90e900181bc49aefdd7",
  measurementId: "G-4NY2KPT0XM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
