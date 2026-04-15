/* ============================================================================
   🔥 FIREBASE CONFIGURATION - v4.2 (CORREGIDO)
   ============================================================================
   Descripción: Configuración e inicialización de Firebase para WPS Selector Pro
   Proyecto: wps-selector-db-490f2
   Última actualización: 2025
   
   ⚠️ IMPORTANTE: Este archivo usa módulos ES6. No cambiar los imports.
   ============================================================================ */

// ── Imports desde CDN de Firebase (versión 10.7.1) ──
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    increment,
    collection  // ← AGREGADO: Necesario para ads-manager.js
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Configuración de tu proyecto Firebase ──
const firebaseConfig = {
    apiKey: "AIzaSyCtmTJxhO49aqVtrS0MA_-dUO1UF3smF50",
    authDomain: "wps-selector-db-490f2.firebaseapp.com",
    projectId: "wps-selector-db-490f2",
    storageBucket: "wps-selector-db-490f
