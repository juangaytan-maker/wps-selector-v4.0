/* ============================================================================
   🔥 FIREBASE CONFIGURATION - v4.2 (FINAL - TODAS LAS EXPORTACIONES)
   ============================================================================
   Descripción: Configuración completa de Firebase con TODAS las exportaciones
   Proyecto: wps-selector-db-490f2
   Última actualización: 2025
   ============================================================================ */

// ── Imports desde CDN de Firebase (versión 10.7.1) ──
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    getDocs,
    setDoc, 
    updateDoc, 
    increment,
    collection,
    query,
    where,
    addDoc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Configuración de tu proyecto Firebase ──
const firebaseConfig = {
    apiKey: "AIzaSyCtmTJxhO49aqVtrS0MA_-dUO1UF3smF50",
    authDomain: "wps-selector-db-490f2.firebaseapp.com",
    projectId: "wps-selector-db-490f2",
    storageBucket: "wps-selector-db-490f2.firebasestorage.app",
    messagingSenderId: "831276563180",
    appId: "1:831276563180:web:526724a2a4b5e3c16203c9"
};

// ── Inicializar Firebase ──
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Exportar TODO lo que pueda necesitar la app ──
export { 
    db, 
    doc, 
    getDoc, 
    getDocs,
    setDoc, 
    updateDoc, 
    increment,
    collection,
    query,
    where,
    addDoc,
    onSnapshot
};
