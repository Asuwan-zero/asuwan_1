// ===== FIREBASE CONFIG =====
// ใช้ร่วมกันทุกหน้า: index.html, admin.html, order.html

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, get, onValue, update, remove, query, orderByChild }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSTm0xna4g6OPEvuBhJ2p1uv2aa7Nng1k",
  authDomain: "my-cafe-5ec3a.firebaseapp.com",
  databaseURL: "https://my-cafe-5ec3a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-cafe-5ec3a",
  storageBucket: "my-cafe-5ec3a.firebasestorage.app",
  messagingSenderId: "998377299162",
  appId: "1:998377299162:web:5b3118c34cf1ba31c219e3",
  measurementId: "G-J1YLE7H8NX"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

export { db, ref, push, set, get, onValue, update, remove, query, orderByChild };