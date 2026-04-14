/**
🔥 FIREBASE CONFIGURATION (v10.8.0 MODULAR)
- Inicialización limpia y centralizada
- Exportación explícita de módulos Firestore
- Agregado serverTimestamp para futuras actualizaciones
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔑 CONFIGURACIÓN (TUS CLAVES REALES)
const firebaseConfig = {
    apiKey: "AIzaSyCDJzrS3WQLI_BU4lGn0fKFN4qnHVj10E0",
    authDomain: "wps-selector-db.firebaseapp.com",
    projectId: "wps-selector-db",
    storageBucket: "wps-selector-db.firebasestorage.app",
    messagingSenderId: "973070694308",
    appId: "1:973070694308:web:06834973b5a9e90583f331"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
// Inicializar Firestore
const db = getFirestore(app);

// Exportar TODO lo necesario para la app
export {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    orderBy,
    serverTimestamp
};