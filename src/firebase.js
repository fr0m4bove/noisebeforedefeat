// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBR2ReY-IvGoJ_7uxDLfE_RF1uuYrNZoJk",
  authDomain: "noise-before-defeat.firebaseapp.com",
  projectId: "noise-before-defeat",
  storageBucket: "noise-before-defeat.firebasestorage.app",
  messagingSenderId: "265443815788",
  appId: "1:265443815788:web:b385e9edb02d5099ab0349",
  measurementId: "G-X5DJBN8T9D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Google Sign In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Email/Password Sign Up
export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Email/Password Sign In
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Sign Out
export const signOut = async () => {
  try {
    await auth.signOut();
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export { auth };
