/**
🎯 MAIN APPLICATION CONTROLLER (v2.0 - CORREGIDO)
*/
import {
    calcularWPSCompleto,
    getElectricalParams,
    getHeatInputRange
} from './wps-calculator.js';

import {
    updateProUI,
    activatePro,
    deactivatePro,
    contactDeveloper,
    initProSystem
} from './pro-system.js';

import { initAds } from './ads-manager.js';
import { db, doc, setDoc, getDoc } from './firebase-config.js'; 

// =========================================
// 📚 CONSTANTES
// =========================================
const FREE_MATERIALS = ['A36', 'A500', 'A516-70', 'A53'];
const FREE_SIZES = ['6', '8', '10', '12'];
const FREE_PROCESSES = ['GMAW'];

// =========================================
// 🎬 INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    initProSystem();
    initAds();
    trackNewDevice();
    console.log('✅ WPS Selector Pro cargado correctamente');
});

// =========================================
// 🔄 NAVEGACIÓN ENTRE PESTAÑAS
// =========================================
window.switchTab = function(screenId, btnElement) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    if (btnElement) {
        btnElement.classList.add('active');
    }
};

// =========================================
// 📋 LÓGICA DEL FORMULARIO
// =========================================
window.updateFormLogic = function() {
    clearAllErrors();
    const position = document.getElementById('position').value;
    const weldSelect = document.getElementById('weldingType');
    const weldStatic = document.getElementById('weldingTypeStatic');

    hideAllConditionalSections();
    
    if (weldSelect) weldSelect.value = "";

    if (!position) return;

    if (position.endsWith('F')) {
        if (weldSelect) weldSelect.style.display = 'none';
        if (weldStatic) {
            weldStatic.style.display = 'block';
            weldStatic.value = "FILETE";
        }
        document.getElementById('condition-filete').style.display = 'block';
    } else if (position.endsWith('G')) {
        if (weldSelect) weldSelect.style.display = 'block';
        if (weldStatic) weldStatic.style.display = 'none';
        
        if (weldSelect && weldSelect.options.length <= 1) {
            weldSelect.innerHTML = `
                <option value="">-- Seleccionar --</option>
                <option value="Ranura Bisel">Ranura Bisel</option>
                <option value="Tope">Tope (Square)</option>
            `;
        }
    }
};

window.updateConditionalFields = function() {
    const type = document.getElementById('weldingType').value;
    hideAllConditionalSections();

    if (type === 'Ranura Bisel') {
        document.getElementById('condition-bevel').style.display = 'block';
    } else if (type === 'Tope') {
        document.getElementById('condition-square').style.display = 'block';
    }
};

function hideAllConditionalSections() {
    const ids = ['condition-filete', 'condition-bevel', 'condition-square'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// =========================================
// ✅ VALIDACIÓN DE CAMPOS
// =========================================
window.validarYMostrarAnuncio = function(accionReal) {
    const hasError = validateRequiredFields();
    if (hasError) {
        scrollToFirstError();
        return;
    }

    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (isPro) {
        accionReal();
        return;
    }

    accionReal();
};

function validateRequiredFields() {
    let hasError = false;
    clearAllErrors();
    
    const fields = [
        { id: 'process', group: 'group-process' },
        { id: 'baseThickness', group: 'group-thickness' },
        { id: 'position', group: 'group-position' },
        { id: 'material', group: 'group-material' }
    ];

    fields.forEach(field => {
        const el = document.getElementById(field.id);
        if (el && !el.value) {
            showError(field.group);
            hasError = true;
        }
    });

    const position = document.getElementById('position').value;
    if (position && position.endsWith('F')) {
        const weldSize = document.getElementById('weldSize').value;
        if (!weldSize) {
            showError('group-weldsize');
            hasError = true;
        }
    }

    return hasError;
}

function showError(groupId) {
    const group = document.getElementById(groupId);
    if (group && !group.classList.contains('error')) {
        group.classList.add('error');
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Campo obligatorio';
        group.appendChild(errorMsg);
    }
}

window.clearError = function(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }
};

function clearAllErrors() {
    document.querySelectorAll('.form-group.error').forEach(el => {
        el.classList.remove('error');
        const errorMsg = el.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    });
}

function scrollToFirstError() {
    const firstError = document.querySelector('.form-group.error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// =========================================
// 🔒 VALIDACIONES PRO
// =========================================
window.checkProcessPro = function() {
    const process = document.getElementById('process').value;
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (process && !FREE_PROCESSES.includes(process) && !isPro) {
        checkProAccess('process');
        document.getElementById('process').value = '';
    }
};

window.checkMaterialPro = function() {
    const material = document.getElementById('material').value;
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (material && !FREE_MATERIALS.includes(material) && !isPro) {
        checkProAccess('material');
        document.getElementById('material').value = '';
    }
};

window.checkWeldSizePro = function() {
    const size = document.getElementById('weldSize').value;
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (size && !FREE_SIZES.includes(size) && !isPro) {
        checkProAccess('size');
        document.getElementById('weldSize').value = '';
    }
};

function checkProAccess(type) {
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (!isPro) {
        const modal = document.getElementById('proModal');
        const text = document.getElementById('modalText');
        
        const messages = {
            'process': 'El proceso seleccionado requiere <span class="modal-highlight">WPS PRO</span>',
            'material': 'Este material requiere <span class="modal-highlight">WPS PRO</span>',
            'size': 'Tamaños >12mm requieren <span class="modal-highlight">WPS PRO</span>'
        };
        
        text.innerHTML = messages[type] || messages['process'];
        modal.style.display = 'flex';
    }
}

window.goToActivation = function() {
    closeProModal();
    const tab2 = document.querySelector('.nav-tab:nth-child(2)');
    if (tab2) tab2.click();
};

window.closeProModal = function() {
    document.getElementById('proModal').style.display = 'none';
};

// =========================================
// 💳 SIMULACIÓN DE PAGO
// =========================================
window.showSimulatePayment = function() {
    const code = generateTestLicenseCode();
    document.getElementById('generated-code').textContent = code;
    document.getElementById('paymentModal').style.display = 'flex';
};

function generateTestLicenseCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let payload = '';
    for (let i = 0; i < 6; i++) {
        payload += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    let checksum = 0;
    for (let i = 0; i < payload.length; i++) {
        checksum += payload.charCodeAt(i);
    }
    checksum = checksum % 10;
    return `WPS-PRO-${payload}-${checksum}`;
}

window.copyCode = function() {
    const code = document.getElementById('generated-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
};

window.closePaymentModal = function() {
    document.getElementById('paymentModal').style.display = 'none';
};

// =========================================
// 🔑 ACTIVACIÓN PRO
// =========================================
window.activatePro = async function() {
    const code = document.getElementById('license-code').value;
    const statusDiv = document.getElementById('activation-status');
    if (!code) {
        statusDiv.innerHTML = '<div class="status-message error">⚠️ Ingresa un código de licencia</div>';
        return;
    }

    statusDiv.innerHTML = '<div class="status-message info">⏳ Validando...</div>';

    const result = await activatePro(code);

    if (result.success) {
        statusDiv.innerHTML = `<div class="status-message success">${result.message}</div>`;
        setTimeout(() => {
            statusDiv.innerHTML = '';
            document.getElementById('license-code').value = '';
        }, 2000);
    } else {
        statusDiv.innerHTML = `<div class="status-message error">${result.message}</div>`;
    }
};

window.deactivatePro = deactivatePro;
window.contactDeveloper = contactDeveloper;

// =========================================
// 🔍 CÁLCULO Y RESULTADOS
// =========================================
window.mostrarResultados = function() {
    const data = {
        proceso: document.getElementById('process').value,
        posicion: document.getElementById('position').value,
        material: document.getElementById('material').value,
        espesor: parseFloat(document.getElementById('baseThickness').value) || 0,
        tipoJunta: document.getElementById('position').value.endsWith('F') ? 
            'Filete' : (document.getElementById('weldingType') ? document.getElementById('weldingType').value : 'Tope'),
        tamanoSoldadura: document.getElementById('weldSize').value,
        gap: document.getElementById('position').value.endsWith('F') ? 
            document.getElementById('fileteGap').value : 
            (document.getElementById('gap').value || document.getElementById('squareGap').value),
        angulo: document.getElementById('angle').value,
        tipoRanura: document.getElementById('grooveType').value,
        longitud: document.getElementById('weldLength').value
    };
    
    const results = calcularWPSCompleto(data);
    displayResults(results, data);

    document.getElementById('form-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function displayResults(results, data) {
    document.getElementById('res-wps-id').textContent = results.wpsCode;
    document.getElementById('res-process').textContent = data.proceso;
    document.getElementById('res-position').textContent = data.posicion;
    document.getElementById('res-material').textContent = data.material;
    document.getElementById('res-thickness').textContent = data.espesor + ' mm';
    document.getElementById('res-weld-size').textContent = (data.tamanoSoldadura || '00') + ' mm';
    document.getElementById('res-weld-type').textContent = data.tipoJunta;
    document.getElementById('res-gap').textContent = data.gap + ' mm';
    document.getElementById('res-min-penetration').textContent = results.penMinima;

    const esRanura = data.tipoJunta === 'Ranura Bisel';
    document.getElementById('box-groove').style.display = esRanura ? 'block' : 'none';
    document.getElementById('res-groove').textContent = data.tipoRanura || '-';

    document.getElementById('box-rootface').style.display = esRanura ? 'block' : 'none';
    document.getElementById('res-rootface').textContent = (document.getElementById('rootFace').value || '0') + ' mm';

    document.getElementById('box-angle').style.display = esRanura ? 'block' : 'none';
    document.getElementById('res-angle').textContent = results.anguloTotal;

    const params = results.params;
    document.getElementById('res-voltage').textContent = `${params.voltage.min}-${params.voltage.max} V`;
    document.getElementById('res-amperage').textContent = `${params.amperage.min}-${params.amperage.max} A`;
    document.getElementById('res-wfs').textContent = `${params.wfs.min}-${params.wfs.max} in/min`;
    document.getElementById('res-travel').textContent = `${params.travelSpeed.min}-${params.travelSpeed.max} cm/min`;
    document.getElementById('res-current').textContent = params.current;
    document.getElementById('res-stickout').textContent = `${params.stickOut.min}-${params.stickOut.max} mm`;

    document.getElementById('res-preheat').textContent = results.preheat;

    const hiHTML = `Min: ${results.heatInput.min} | Max: ${results.heatInput.max}`;
    document.getElementById('res-heat-input').innerHTML = hiHTML + results.heatInput.warning;

    document.getElementById('res-transfer').textContent = 'Cortocircuito / Spray';
    document.getElementById('res-work-angle').textContent = '90°';
    document.getElementById('res-travel-angle').textContent = '10°-15° (Empuje)';

    document.getElementById('res-electrode').textContent = 'Sólido ER70S-6';
    document.getElementById('res-diameter').textContent = '1.2 mm (0.045")';
    document.getElementById('res-class').textContent = 'AWS A5.18';
    document.getElementById('res-gas-type').textContent = 'Mezcla';
    document.getElementById('res-gas-mix').textContent = 'Ar 90% / CO2 10%';
    document.getElementById('res-flow').textContent = '35-45 CFH';

    const showConsumption = document.getElementById('showConsumption').checked;
    if (showConsumption && results.consumos) {
        document.getElementById('consumption-section').style.display = 'block';
        document.getElementById('res-wire-cons').textContent = `~${results.consumos.wire.total} kg`;
        document.getElementById('res-gas-cons').textContent = `~${results.consumos.gas.total} L`;
    } else {
        document.getElementById('consumption-section').style.display = 'none';
    }

    if (results.techNote) {
        document.getElementById('tech-note').innerHTML = results.techNote;
        document.getElementById('tech-note').style.display = 'block';
    }
}

window.volverFormulario = function() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('form-screen').style.display = 'block';
    clearAllErrors();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// =========================================
// 📤 EXPORTACIÓN A PDF
// =========================================
window.exportarPDF = function() {
    const wpsCode = document.getElementById('res-wps-id').textContent;
    const originalTitle = document.title;
    document.title = wpsCode;
    window.print();
    document.title = originalTitle;
};

// =========================================
// 🔧 UTILIDADES
// =========================================
window.validateFileteGap = function() {
    const gap = parseFloat(document.getElementById('fileteGap').value);
    const warning = document.getElementById('gapWarning');
    const input = document.getElementById('fileteGap');
    if (!isNaN(gap) && gap > 5) {
        warning.style.display = 'block';
        input.classList.add('warning-input');
    } else {
        warning.style.display = 'none';
        input.classList.remove('warning-input');
    }
};

window.toggleConsumptionFields = function() {
    const show = document.getElementById('showConsumption').checked;
    document.getElementById('consumptionInputs').style.display = show ? 'block' : 'none';
};
// =========================================
// 📱 TRACK NEW DEVICE (CONEXIÓN REAL)
// =========================================
async function trackNewDevice() {
    // Verificar si ya contamos este dispositivo antes
    const hasBeenCounted = localStorage.getItem('wps_first_visit');
    
    if (!hasBeenCounted) {
        // Marcar como contado para no repetir
        localStorage.setItem('wps_first_visit', 'true');
        console.log('📱 Nuevo dispositivo registrado');
        
        // 👇 Intentar enviar el dato a Firebase
        try {
            const analyticsRef = doc(db, 'analytics', 'global_stats');
            const snapshot = await getDoc(analyticsRef);
            
            // Si ya existen datos, sumamos 1 al actual. Si no, empezamos en 1.
            let currentCount = 0;
            if (snapshot.exists()) {
                currentCount = snapshot.data().new_devices || 0;
            }
            
            await setDoc(analyticsRef, { 
                new_devices: currentCount + 1,
                lastUpdated: new Date().toISOString()
            }, { merge: true }); // merge: true crea el doc si no existe o actualiza si existe
            
        } catch (error) {
            console.warn("⚠️ No se pudo conectar con la base de datos:", error);
        }
    }
}

// =========================================
// 📋 COPIAR ID DE DISPOSITIVO
// =========================================
window.copyDeviceId = function() {
    const el = document.getElementById('user-device-id');
    const text = el.textContent.trim();
    
    if (text && text !== 'Cargando...') {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ ID copiado al portapapeles: ' + text);
        });
    }
};
