/* ============================================================================
   🔑 PRO SYSTEM & LICENSE VALIDATION - v4.2 (MAINTAINABLE EDITION)
   ============================================================================
   Descripción: Módulo de validación PRO, licencias y gestión de UI
   Última actualización: 2025
   Autor: Juan Gaytán
   
   📋 ÍNDICE DE SECCIONES:
   ────────────────────────────────────────────────────────────────────────
   01. 📦 IMPORTS & DEPENDENCIAS (Firebase)
   02. 📱 IDENTIFICACIÓN DE DISPOSITIVO (localStorage)
   03. 🔄 ESTADO GLOBAL DE LA APLICACIÓN
   04. 🎨 ACTUALIZACIÓN DE INTERFAZ (UI FREE/PRO)
   05. 🔑 CLAVE MAESTRA (ADMINISTRADOR)
   06. ✅ VALIDACIÓN DE LICENCIA (Firebase + MasterKey)
   07. 🔓 DESACTIVAR / CERRAR SESIÓN [⚠️ ZONA CRÍTICA]
   08. 📞 CONTACTAR DESARROLLADOR (WhatsApp)
   09. 🚀 INICIALIZACIÓN DEL SISTEMA
   10. 🌐 EXPORTACIONES & FUNCIONES GLOBALES
   ============================================================================ */

// ============================================================================
// 01. 📦 IMPORTS & DEPENDENCIAS
// ============================================================================
// 💡 Funciones de Firebase necesarias para validación de licencias
// 🔧 Si cambias la estructura de Firestore, actualiza estas importaciones
import { db, doc, getDoc, updateDoc } from './firebase-config.js';


// ============================================================================
// 02. 📱 IDENTIFICACIÓN DE DISPOSITIVO
// ============================================================================
// 💡 Genera un ID único para el dispositivo y lo guarda en localStorage
// 🔧 Para cambiar el prefijo: editar 'DEV-' en la línea 32
// ⚠️ NO modificar la lógica de generación sin actualizar admin.js
function getDeviceId() {
    let deviceId = localStorage.getItem('wps_device_id');
    
    if (!deviceId) {
        // Generar nuevo ID único: DEV-XXXXXX (8 caracteres alfanuméricos)
        deviceId = 'DEV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem('wps_device_id', deviceId);
    }
    
    return deviceId;
}


// ============================================================================
// 03. 🔄 ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================================
// 💡 Variable que controla si el usuario tiene acceso PRO
// 🔧 Se actualiza al activar/desactivar licencia
// ⚠️ NO cambiar directamente. Usar activatePro() o deactivatePro()
let isProUser = localStorage.getItem('wps_pro_active') === 'true';


// ============================================================================
// 04. 🎨 ACTUALIZACIÓN DE INTERFAZ (UI FREE/PRO)
// ============================================================================
// 💡 Sincroniza el estado PRO con todos los elementos visuales de la app
// 🔧 Para agregar nuevos elementos UI: duplicar bloque if/else y actualizar selector
// ⚠️ ZONA CRÍTICA: Los IDs deben coincidir con index.html
export function updateProUI() {
    // ── Selectores de elementos DOM (IDs de index.html) ──
    const headerBadge = document.getElementById('header-badge');
    const resultBadge = document.getElementById('res-badge');
    const proNotActiveDiv = document.getElementById('pro-not-active');
    const proActiveDiv = document.getElementById('pro-active');
    const activeCodeDisplay = document.getElementById('active-license-code');
    const activationCard = document.querySelector('.activation-card');
    const deviceDisplay = document.getElementById('user-device-id');
    const appFooter = document.getElementById('app-footer');
    const body = document.body;

    // Actualizar ID de dispositivo en pantalla
    if (deviceDisplay) deviceDisplay.textContent = getDeviceId();

    // ── ESTADO: PRO ACTIVO ──
    if (isProUser) {
        // Badge del header
        if (headerBadge) { 
            headerBadge.textContent = 'PRO'; 
            headerBadge.style.color = 'var(--warning)'; 
        }
        // Badge de resultados
        if (resultBadge) { 
            resultBadge.textContent = 'PRO'; 
            resultBadge.classList.add('pro'); 
        }
        // Pantalla de activación
        if (proNotActiveDiv) proNotActiveDiv.style.display = 'none';
        if (proActiveDiv) proActiveDiv.style.display = 'block';
        if (activationCard) activationCard.classList.add('pro-active');

        // Mostrar código de licencia activada
        const savedCode = localStorage.getItem('wps_license_code');
        if (activeCodeDisplay && savedCode) activeCodeDisplay.textContent = savedCode;
        
        // 📢 Ocultar footer de anuncios (clase CSS)
        if (appFooter) appFooter.classList.add('pro-hidden');
        // Ajustar padding del body para layout sin footer
        if (body) body.classList.add('pro-active');
        
    // ── ESTADO: FREE ACTIVO ──
    } else {
        // Badge del header
        if (headerBadge) { 
            headerBadge.textContent = 'FREE'; 
            headerBadge.style.color = 'var(--success)'; 
        }
        // Badge de resultados
        if (resultBadge) { 
            resultBadge.textContent = 'AWS D1.1'; 
            resultBadge.classList.remove('pro'); 
        }
        // Pantalla de activación
        if (proNotActiveDiv) proNotActiveDiv.style.display = 'block';
        if (proActiveDiv) proActiveDiv.style.display = 'none';
        if (activationCard) activationCard.classList.remove('pro-active');

        // 📢 Mostrar footer de anuncios
        if (appFooter) appFooter.classList.remove('pro-hidden');
        // Restaurar padding del body
        if (body) body.classList.remove('pro-active');
    }
}


// ============================================================================
// 05. 🔑 CLAVE MAESTRA (ADMINISTRADOR)
// ============================================================================
// ⚠️ ZONA CRÍTICA DE SEGURIDAD
// 💡 Clave de activación directa para el desarrollador
// 🔧 Cambia este valor en producción por uno más seguro
// 🚫 NO compartir este código con usuarios finales
const MASTER_KEY = "GTN-MASTER-1306-90";


// ============================================================================
// 06. ✅ VALIDACIÓN DE LICENCIA
// ============================================================================
// 💡 Valida códigos PRO vía Firebase o MasterKey
// 🔧 Para agregar nuevas reglas de validación: editar dentro del try/catch
// ⚠️ Los mensajes de error se muestran en #activation-status (index.html)
export async function activatePro(licenseCode) {
    // Validación básica de entrada
    if (!licenseCode) return { success: false, message: 'Ingresa un código.' };
    const cleanCode = licenseCode.trim().toUpperCase();

    // ── 🚀 PRIORIDAD 1: Clave Maestra (activación inmediata) ──
    if (cleanCode === MASTER_KEY) {
        localStorage.setItem('wps_pro_active', 'true');
        localStorage.setItem('wps_license_code', cleanCode);
        isProUser = true;
        updateProUI();
        return { success: true, message: '👑 ¡Bienvenido, Administrador!' };
    }

    // ── 🔥 PRIORIDAD 2: Validación con Firebase ──
    const currentDevice = getDeviceId();
    
    try {
        const docRef = doc(db, 'licenses', cleanCode);
        const docSnap = await getDoc(docRef);

        // Caso: Código no existe en Firestore
        if (!docSnap.exists()) return { success: false, message: '❌ Código no encontrado.' };
        
        const data = docSnap.data();
        
        // Caso: Licencia inactiva o caducada
        if (data.status !== 'active') return { success: false, message: '❌ Licencia inactiva o caducada.' };
        
        // Caso: Licencia ya asignada a otro dispositivo
        if (data.assignedDeviceId && data.assignedDeviceId !== currentDevice) {
            return { success: false, message: '❌ Licencia ya asignada a otro dispositivo.' };
        }

        // Primera activación: asignar dispositivo actual
        if (!data.assignedDeviceId) {
            await updateDoc(docRef, { assignedDeviceId: currentDevice });
        }

        // ✅ Activación exitosa: actualizar localStorage y UI
        localStorage.setItem('wps_pro_active', 'true');
        localStorage.setItem('wps_license_code', cleanCode);
        isProUser = true;
        updateProUI();
        return { success: true, message: '✅ ¡Bienvenido a WPS PRO!' };

    } catch (error) {
        console.error('Error activando PRO:', error);
        return { success: false, message: '❌ Error de conexión. Verifica internet.' };
    }
}


// ============================================================================
// 07. 🔓 DESACTIVAR / CERRAR SESIÓN [⚠️ ZONA CRÍTICA]
// ============================================================================
// 💡 Funciones para cerrar sesión PRO y mostrar modal de confirmación
// ⚠️ IMPORTANTE: Las funciones exportadas deben exponerse a window para onclick
// 🔧 Para cambiar el comportamiento: editar confirmLogout()
// ============================================================================

// Muestra el modal de confirmación de logout
export function deactivatePro() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
}

// Ejecuta el logout real: limpia localStorage y recarga
export function confirmLogout() {
    closeLogoutModal();
    localStorage.removeItem('wps_pro_active');
    localStorage.removeItem('wps_license_code');
    isProUser = false;
    updateProUI();
    location.reload();
}

// Cierra el modal de logout sin hacer cambios
export function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}

// ── 🌐 EXPOSICIÓN GLOBAL PARA HTML (onclick) ──
// ⚠️ ESTAS LÍNEAS SON CRÍTICAS: Sin ellas, los onclick del HTML no funcionan
window.confirmLogout = confirmLogout;
window.closeLogoutModal = closeLogoutModal;
window.deactivatePro = deactivatePro; // 👈 CORRECCIÓN: Agregar esta línea para solucionar ReferenceError


// ============================================================================
// 08. 📞 CONTACTAR DESARROLLADOR (WhatsApp)
// ============================================================================
// 💡 Abre WhatsApp con mensaje prellenado incluyendo el ID del dispositivo
// 🔧 Para cambiar el número: editar '528141434957' por tu número con código de país
export function contactDeveloper() {
    const deviceId = getDeviceId();
    const message = encodeURIComponent(`Hola, quiero activar WPS PRO. Mi ID de dispositivo es: ${deviceId}`);
    window.open(`https://wa.me/528141434957?text=${message}`, '_blank');
}


// ============================================================================
// 09. 🚀 INICIALIZACIÓN DEL SISTEMA
// ============================================================================
// 💡 Función principal que se llama desde app.js al cargar la página
// 🔧 Para agregar inicializaciones adicionales: editar dentro de esta función
export function initProSystem() {
    updateProUI();
}


// ============================================================================
// 10. 🌐 EXPORTACIONES & FUNCIONES GLOBALES
// ============================================================================
// 💡 Resumen de lo que este módulo expone para otros archivos
// 
// 📤 EXPORTADAS (para import en app.js):
//   • updateProUI()      → Sincroniza estado visual FREE/PRO
//   • activatePro(code)  → Valida y activa licencia (async)
//   • deactivatePro()    → Muestra modal de logout
//   • contactDeveloper() → Abre WhatsApp de soporte
//   • initProSystem()    → Inicializa el módulo al cargar
//
// 🌐 GLOBALES (para onclick en HTML):
//   • window.confirmLogout    → Ejecuta logout real
//   • window.closeLogoutModal → Cierra modal sin cambios
//   • window.deactivatePro    → Inicia proceso de logout
//
// 🔒 PRIVADAS (solo uso interno):
//   • getDeviceId()  → Genera/obtiene ID único del dispositivo
//   • MASTER_KEY     → Clave maestra de administrador
// ============================================================================
