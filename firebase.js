import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPWI3b6HE-ZEmCbsITJuPr5FABjFxNTpQ",
  authDomain: "cha-iris.firebaseapp.com",
  projectId: "cha-iris",
  storageBucket: "cha-iris.firebasestorage.app",
  messagingSenderId: "723742289624",
  appId: "1:723742289624:web:be64a8c01992e566ed71ad",
  measurementId: "G-GSETWYHNFN",
  databaseURL: "https://cha-iris-default-rtdb.firebaseio.com" // URL padrão baseada no ID do seu projeto
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
