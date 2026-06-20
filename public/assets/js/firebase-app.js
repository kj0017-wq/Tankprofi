import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbD-FUKXpIlHqz19-l1YQvRQ719W7Rjzw",
  authDomain: "tankprofi.firebaseapp.com",
  projectId: "tankprofi",
  storageBucket: "tankprofi.firebasestorage.app",
  messagingSenderId: "157996476551",
  appId: "1:157996476551:web:27884b21d9dd3aab95f022",
};

window.tankprofiFirebaseApp = initializeApp(firebaseConfig);
