/**
🛠️ ADMIN PANEL LOGIC (v2.1 - CON ANALYTICS CORREGIDO)
- Agregado getDoc para leer analytics
- Función loadAnalytics() para mostrar contadores reales
- Sincronización con Firestore
*/
import { 
    db, 
    collection, 
    getDocs, 
    getDoc,  // ← AGREGADO: Para leer documento único
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    setDoc, 
    addDoc 
} from './firebase-config.js';

const ADMIN_PASSWORD = "Dan1&diego"; // ⚠️ TU CONTRASEÑA DE ADMIN

// =========================================
// 🔔 SISTEMA DE NOTIFICACIONES (TOAST)
// =========================================
function showToast(message, title = '', type = 'success', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = { success: '#00d9ff', error: '#ff4d4d', warning: '#fca311', info: '#a0a0a0' };
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    toast.className = `toast ${type}`;
    toast.style.cssText = `background:#16213e;color:#fff;padding:12px 16px;border-radius:8px;border-left:4px solid ${colors[type]};box-shadow:0 4px 12px rgba(0,0,0,0.5);font-size:0.85rem;display:flex;align-items:center;gap:10px;min-width:250px;animation:slideIn 0.3s ease;pointer-events:auto;`;

    toast.innerHTML = `
        <span style="font-size:1.2rem;">${icons[type]}</span> 
        <div>${title ? `<strong>${title}</strong><br>` : ''}${message}</div>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex;justify-content:center;align-items:center;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:5000;padding:20px;backdrop-filter:blur(4px);';
    
    modal.innerHTML = `
        <div style="background:#16213e;border:2px solid #ff4d4d;border-radius:12px;padding:24px;max-width:360px;width:100%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.6);">
            <div style="font-size:2.5rem;margin-bottom:10px;">⚠️</div>
            <h3 style="color:#ff4d4d;margin-bottom:12px;">Confirmar Acción</h3>
            <p style="color:#a0a0a0;margin-bottom:20px;font-size:0.9rem;line-height:1.4;">${message}</p>
            <div style="display:flex;gap:10px;">
                <button id="confirm-yes" style="flex:1;padding:10px;background:#e94560;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Aceptar</button>
                <button id="confirm-no" style="flex:1;padding:10px;background:transparent;color:#a0a0a0;border:1px solid #334155;border-radius:6px;cursor:pointer;">Cancelar</button>
            </div>
        </div>`;
    
    document.body.appendChild(modal);

    document.getElementById('confirm-yes').onclick = () => { modal.remove(); if (onConfirm) onConfirm(); };
    document.getElementById('confirm-no').onclick = () => modal.remove();
}

// =========================================
// 🔑 AUTENTICACIÓN
// =========================================
window.verifyAdmin = function() {
    const input = document.getElementById('admin-password');
    if (input.value === ADMIN_PASSWORD) {
        localStorage.setItem('wps_admin_logged', 'true');
        showDashboard();
    } else {
        showToast('Verifica la contraseña', '❌ Acceso Denegado', 'error');
        input.value = '';
        input.focus();
    }
};

window.logoutAdmin = function() {
    localStorage.removeItem('wps_admin_logged');
    showToast('Sesión cerrada', '👋 Hasta luego', 'info');
    setTimeout(() => location.reload(), 500);
};

function checkAdminAuth() {
    if (localStorage.getItem('wps_admin_logged') === 'true') {
        showDashboard();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

function showDashboard() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadLicenses();
    loadAds();
    updateStats();
    loadAnalytics();  // ← AGREGADO: Cargar contadores reales de analytics
}

// =========================================
// 📊 CARGAR ANALYTICS (CONTADORES REALES)
// =========================================
async function loadAnalytics() {
    try {
        // Leer el documento global_stats de analytics
        const docRef = doc(db, 'analytics', 'global_stats');
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
            const data = snap.data();
            
            // Mapeo de campos: [ID del elemento en HTML, campo en Firestore]
            const fields = [
                ['stat-new-devices', 'new_devices'],
                ['stat-calculate-clicks', 'calculate_clicks'],
                ['stat-successful-exports', 'successful_exports'],
                ['stat-coffee-clicks', 'coffee_clicks'],
                ['stat-community-clicks', 'community_clicks'],
                ['stat-pro-attempts', 'pro_attempts']
            ];
            
            // Actualizar cada elemento del DOM
            fields.forEach(([elementId, firestoreField]) => {
                const el = document.getElementById(elementId);
                if (el) {
                    const value = data[firestoreField] ?? 0;
                    // Animación suave de números
                    animateNumber(el, parseInt(el.textContent) || 0, value);
                }
            });
            
            // Actualizar fecha de última actualización si existe
            if (data.lastUpdated) {
                const dateEl = document.getElementById('stat-last-updated');
                if (dateEl) {
                    const date = new Date(data.lastUpdated);
                    dateEl.textContent = date.toLocaleString('es-ES');
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ Error cargando analytics:', e);
    }
}

// Animación suave para números (efecto visual)
function animateNumber(element, start, end, duration = 500) {
    let startTime = null;
    
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString('es-ES');
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

// =========================================
// 🎲 GENERAR LICENCIA
// =========================================
window.generateLicense = async function() {
    try {
        const licenseCode = generateUniqueCode();
        const deviceIdInput = document.getElementById('device-id-input');
        const customDeviceId = deviceIdInput ? deviceIdInput.value.trim().toUpperCase() : '';
        const createdAt = new Date().toISOString();

        await setDoc(doc(db, 'licenses', licenseCode), {
            code: licenseCode, 
            status: 'active', 
            assignedDeviceId: customDeviceId || null,
            createdAt: createdAt,
            createdBy: 'admin'
        });

        if (deviceIdInput) deviceIdInput.value = '';
        const msg = customDeviceId ? `Asignada a: <strong>${customDeviceId}</strong>` : 'Se asignará automáticamente al activar';
        showToast(`Código: <strong style="color:#fca311">${licenseCode}</strong><br><small>${msg}</small>`, '✅ Licencia Generada', 'success', 6000);
        loadLicenses(); 
        updateStats();
        loadAnalytics(); // ← Actualizar analytics también
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, '❌ Error al Generar', 'error');
    }
};

function generateUniqueCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let payload = '';
    for (let i = 0; i < 6; i++) payload += chars.charAt(Math.floor(Math.random() * chars.length));
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) checksum += payload.charCodeAt(i);
    checksum = checksum % 10;
    return `WPS-PRO-${payload}-${checksum}`;
}

// =========================================
// 📋 CARGAR LICENCIAS
// =========================================
window.loadLicenses = async function() {
    const tbody = document.getElementById('licenses-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">⏳ Cargando...</td></tr>';

    try {
        const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#a0a0a0;">📭 No hay licencias registradas</td></tr>';
            return;
        }

        let html = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const licenseId = docSnap.id;
            const statusClass = data.status === 'active' ? 'status-active' : 'status-inactive';
            const statusText = data.status === 'active' ? '✅ Activa' : '❌ Inactiva';
            const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-ES') : 'N/A';

            html += `<tr>
                <td><strong style="color:#fca311;font-family:monospace;">${data.code}</strong></td>
                <td style="font-family:monospace;font-size:0.85rem;">${data.assignedDeviceId ? `✅ ${data.assignedDeviceId}` : '⏳ Pendiente'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-sm" onclick="copyLicense('${data.code}')">📋</button>
                    ${data.status === 'active' 
                        ? `<button class="btn-sm btn-danger" onclick="revokeLicense('${licenseId}')">🚫</button>`
                        : `<button class="btn-sm btn-success" onclick="activateLicense('${licenseId}')">✅</button>`}
                    <button class="btn-sm btn-delete" onclick="deleteLicense('${licenseId}')">🗑️</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ff4d4d;">Error de carga</td></tr>';
    }
};

// =========================================
// 🎛️ ACCIONES LICENCIAS
// =========================================
window.copyLicense = function(code) {
    navigator.clipboard.writeText(code).then(() => showToast('Código copiado', '📋 Listo'));
};

window.revokeLicense = async function(licenseId) {
    showConfirmModal('¿Revocar esta licencia? El usuario perderá acceso PRO.', async () => {
        try {
            await updateDoc(doc(db, 'licenses', licenseId), { status: 'inactive' });
            showToast('Licencia revocada', '🚫 Actualizado', 'warning');
            loadLicenses(); 
            updateStats();
        } catch (e) { showToast(e.message, 'Error', 'error'); }
    });
};

window.activateLicense = async function(licenseId) {
    try {
        await updateDoc(doc(db, 'licenses', licenseId), { status: 'active' });
        showToast('Licencia activada', '✅ Actualizado');
        loadLicenses(); 
        updateStats();
    } catch (e) { showToast(e.message, 'Error', 'error'); }
};

window.deleteLicense = async function(licenseId) {
    showConfirmModal('¿Eliminar PERMANENTEMENTE? Esta acción no se puede deshacer.', async () => {
        try {
            await deleteDoc(doc(db, 'licenses', licenseId));
            showToast('Licencia eliminada', '🗑️ Eliminado', 'info');
            loadLicenses(); 
            updateStats();
        } catch (e) { showToast(e.message, 'Error', 'error'); }
    });
};

// =========================================
// 📊 ESTADÍSTICAS DE LICENCIAS
// =========================================
async function updateStats() {
    try {
        const snap = await getDocs(collection(db, 'licenses'));
        let total = 0, active = 0, inactive = 0;
        snap.forEach(d => { 
            total++; 
            d.data().status === 'active' ? active++ : inactive++; 
        });
        const elTotal = document.getElementById('stat-total');
        const elActive = document.getElementById('stat-active');
        const elInactive = document.getElementById('stat-inactive');
        if (elTotal) elTotal.textContent = total;
        if (elActive) elActive.textContent = active;
        if (elInactive) elInactive.textContent = inactive;
    } catch (e) { console.warn('Stats error:', e); }
}

// =========================================
// 📢 GESTIÓN DE ANUNCIOS
// =========================================
window.addNewAd = async function() {
    const name = document.getElementById('ad-name')?.value;
    const link = document.getElementById('ad-link')?.value;
    const path = document.getElementById('ad-path')?.value;
    const weight = parseInt(document.getElementById('ad-weight')?.value) || 1;

    if (!name || !path) return showToast('Nombre y Ruta son obligatorios', '⚠️ Error', 'warning');

    try {
        await addDoc(collection(db, 'ads'), {
            name, 
            link, 
            imagePath: path, 
            weight, 
            active: true, 
            createdAt: new Date().toISOString()
        });
        showToast('Anuncio creado', '✅ Listo');
        loadAds();
        if(document.getElementById('ad-name')) document.getElementById('ad-name').value = '';
        if(document.getElementById('ad-link')) document.getElementById('ad-link').value = '';
        if(document.getElementById('ad-path')) document.getElementById('ad-path').value = '';
    } catch (e) { showToast(e.message, '❌ Error', 'error'); }
};

window.loadAds = async function() {
    const tbody = document.getElementById('ads-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">⏳ Cargando...</td></tr>';

    try {
        const snap = await getDocs(collection(db, 'ads'));
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#a0a0a0;">📭 Sin anuncios configurados</td></tr>';
            return;
        }

        let html = '';
        snap.forEach((d) => {
            const data = d.data();
            const adId = d.id;
            html += `<tr>
                <td><strong>${data.name}</strong></td>
                <td><img src="${data.imagePath}" style="height:30px;border-radius:4px;background:#fff;"></td>
                <td><small style="color:#a0a0a0;">${data.link || '-'}</small></td>
                <td>${data.weight}</td>
                <td>${data.active ? '🟢 Activo' : '🔴 Inactivo'}</td>
                <td>
                    <button class="btn-sm" onclick="toggleAd('${adId}', ${!data.active})">${data.active ? '⏸️ Pausar' : '▶️ Activar'}</button>
                    <button class="btn-sm btn-delete" onclick="deleteAd('${adId}')">🗑️</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { 
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ff4d4d;">Error</td></tr>'; 
    }
};

window.toggleAd = async function(adId, newStatus) {
    try {
        await updateDoc(doc(db, 'ads', adId), { active: newStatus });
        showToast(newStatus ? 'Activado' : 'Pausado', '✅ Actualizado');
        loadAds();
    } catch (e) { showToast(e.message, '❌ Error', 'error'); }
};

window.deleteAd = async function(adId) {
    showConfirmModal('¿Eliminar este anuncio permanentemente?', async () => {
        try {
            await deleteDoc(doc(db, 'ads', adId));
            showToast('Eliminado', '🗑️ Listo', 'info');
            loadAds();
        } catch (e) { showToast(e.message, '❌ Error', 'error'); }
    });
};

// =========================================
// 🔄 REFRESCAR DATOS (Botón manual)
// =========================================
window.refreshAllData = function() {
    showToast('Actualizando datos...', '🔄 Cargando', 'info', 2000);
    loadLicenses();
    loadAds();
    updateStats();
    loadAnalytics(); // ← También refrescar analytics
};

// =========================================
// 🚀 INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', () => { 
    checkAdminAuth(); 
});
