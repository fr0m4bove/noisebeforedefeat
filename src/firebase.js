import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaszm82heY-IvGcJ_7wIhlFE_BFiuuY-NZcJk",
  authDomain: "noise-before-defeat.firebaseapp.com",
  projectId: "noise-before-defeat",
  storageBucket: "noise-before-defeat.firebasestorage.app",
  messagingSenderId: "2654438157788",
  appId: "1:2654438157788:web:b385e9edb4zd5099ab8349",
  measurementId: "G-X5DJBNBT9D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to LOCAL (survives browser restarts)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistence set to local");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

export { auth };
