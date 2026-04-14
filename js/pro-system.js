/**
🔑 PRO SYSTEM & LICENSE VALIDATION (v4.0 - AUDITADO)
Maneja: ID dispositivo, validación Firebase/MasterKey, UI PRO, Footer, Logout
*/
import { db, doc, getDoc, updateDoc } from './firebase-config.js';

// =========================================
// 📱 IDENTIFICACIÓN DEL DISPOSITIVO
// =========================================
function getDeviceId() {
    let deviceId = localStorage.getItem('wps_device_id');
    if (!deviceId) {
        deviceId = 'DEV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem('wps_device_id', deviceId);
    }
    return deviceId;
}

// =========================================
// 🔄 ESTADO DE LA APLICACIÓN
// =========================================
let isProUser = localStorage.getItem('wps_pro_active') === 'true';

// =========================================
// 🎨 ACTUALIZACIÓN DE INTERFAZ (UI)
// =========================================
export function updateProUI() {
    const headerBadge = document.getElementById('header-badge');
    const resultBadge = document.getElementById('res-badge');
    const proNotActiveDiv = document.getElementById('pro-not-active');
    const proActiveDiv = document.getElementById('pro-active');
    const activeCodeDisplay = document.getElementById('active-license-code');
    const activationCard = document.querySelector('.activation-card');
    const deviceDisplay = document.getElementById('user-device-id');
    const appFooter = document.getElementById('app-footer');
    const body = document.body;

    if (deviceDisplay) deviceDisplay.textContent = getDeviceId();

    if (isProUser) {
        // UI PRO Activa
        if (headerBadge) { headerBadge.textContent = 'PRO'; headerBadge.style.color = 'var(--warning)'; }
        if (resultBadge) { resultBadge.textContent = 'PRO'; resultBadge.classList.add('pro'); }
        if (proNotActiveDiv) proNotActiveDiv.style.display = 'none';
        if (proActiveDiv) proActiveDiv.style.display = 'block';
        if (activationCard) activationCard.classList.add('pro-active');

        const savedCode = localStorage.getItem('wps_license_code');
        if (activeCodeDisplay && savedCode) activeCodeDisplay.textContent = savedCode;
        // 📢 Ocultar footer de anuncios vía clase CSS
        if (appFooter) appFooter.classList.add('pro-hidden');
        if (body) body.classList.add('pro-active'); // Ajusta padding inferior automáticamente
    } else {
        // UI FREE Activa
        if (headerBadge) { headerBadge.textContent = 'FREE'; headerBadge.style.color = 'var(--success)'; }
        if (resultBadge) { resultBadge.textContent = 'AWS D1.1'; resultBadge.classList.remove('pro'); }
        if (proNotActiveDiv) proNotActiveDiv.style.display = 'block';
        if (proActiveDiv) proActiveDiv.style.display = 'none';
        if (activationCard) activationCard.classList.remove('pro-active');

        // 📢 Mostrar footer de anuncios
        if (appFooter) appFooter.classList.remove('pro-hidden');
        if (body) body.classList.remove('pro-active');
    }
}

// =========================================
// 🔑 CLAVE MAESTRA (ADMINISTRADOR)
// =========================================
const MASTER_KEY = "GTN-MASTER-1306-90"; // 🔐 Cambia esto en producción si es necesario

// =========================================
// ✅ VALIDACIÓN DE LICENCIA
// =========================================
export async function activatePro(licenseCode) {
    if (!licenseCode) return { success: false, message: 'Ingresa un código.' };
    const cleanCode = licenseCode.trim().toUpperCase();

    // 🚀 Clave Maestra (Prioridad máxima)
    if (cleanCode === MASTER_KEY) {
        localStorage.setItem('wps_pro_active', 'true');
        localStorage.setItem('wps_license_code', cleanCode);
        isProUser = true;
        updateProUI();
        return { success: true, message: '👑 ¡Bienvenido, Administrador!' };
    }

    // 🔥 Validación con Firebase
    const currentDevice = getDeviceId();
    try {
        const docRef = doc(db, 'licenses', cleanCode);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return { success: false, message: '❌ Código no encontrado.' };
        
        const data = docSnap.data();
        if (data.status !== 'active') return { success: false, message: '❌ Licencia inactiva o caducada.' };
        
        if (data.assignedDeviceId && data.assignedDeviceId !== currentDevice) {            return { success: false, message: '❌ Licencia ya asignada a otro dispositivo.' };
        }

        if (!data.assignedDeviceId) {
            await updateDoc(docRef, { assignedDeviceId: currentDevice });
        }

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

// =========================================
// 🔓 DESACTIVAR / CERRAR SESIÓN
// =========================================
export function deactivatePro() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
}

export function confirmLogout() {
    closeLogoutModal();
    localStorage.removeItem('wps_pro_active');
    localStorage.removeItem('wps_license_code');
    isProUser = false;
    updateProUI();
    location.reload();
}

export function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}

// Hacer globales para que funcionen desde HTML (onclick)
window.confirmLogout = confirmLogout;
window.closeLogoutModal = closeLogoutModal;

// =========================================
// 📞 CONTACTAR DESARROLLADOR
// =========================================
export function contactDeveloper() {
    const deviceId = getDeviceId();    const message = encodeURIComponent(`Hola, quiero activar WPS PRO. Mi ID de dispositivo es: ${deviceId}`);
    window.open(`https://wa.me/528141434957?text=${message}`, '_blank');
}

// =========================================
// 🚀 INICIALIZACIÓN
// =========================================
export function initProSystem() {
    updateProUI();
}