import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCshexKWFewBv7NmjJUX3o6DLLc-47jX0Y",
  authDomain: "takehomecalc-c86a7.firebaseapp.com",
  projectId: "takehomecalc-c86a7",
  storageBucket: "takehomecalc-c86a7.firebasestorage.app",
  messagingSenderId: "350118392468",
  appId: "1:350118392468:web:1186f627471bbb313eba81",
  measurementId: "G-P5QDTJW14G",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;

