/**
🎯 MAIN APPLICATION CONTROLLER (v4.0 - AUDITADO)
Coordina: Navegación, Validación, Cálculo, Intersticiales, PDF, Historial, QR, Contadores
*/
import { calcularWPSCompleto } from './wps-calculator.js';
import { updateProUI, activatePro, deactivatePro, contactDeveloper, initProSystem } from './pro-system.js';
import { initAds, getRandomAd } from './ads-manager.js';
import { db, doc, getDoc, updateDoc } from './firebase-config.js';

// =========================================
// 📚 CONSTANTES Y ESTADO
// =========================================
const FREE_MATERIALS = ['A36', 'A500', 'A516-70', 'A53'];
const FREE_SIZES = ['6', '8', '10', '12'];
const FREE_PROCESSES = ['GMAW'];

window.hasCalculated = false;
let isTermsAccepted = localStorage.getItem('wps_terms_v1_accepted') === 'true';
let interstitialQueue = [];

// =========================================
// 🎬 INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        initProSystem();
        await initAds();
        checkTerms();
        trackNewDevice();
        parseUrlHash();
        updateCoffeeCount();
        console.log('✅ WPS Selector Pro v4.0 cargado correctamente');
    } catch (err) {
        console.error('⚠️ Error en inicialización:', err);
    }
});

// =========================================
// 📜 TÉRMINOS Y CONDICIONES
// =========================================
function checkTerms() {
    if (!isTermsAccepted) {
        document.getElementById('terms-modal').style.display = 'flex';
        document.getElementById('terms-checkbox').addEventListener('change', (e) => {
            document.getElementById('accept-terms-btn').disabled = !e.target.checked;
        });
    }
}
window.acceptTerms = function() {
    localStorage.setItem('wps_terms_v1_accepted', 'true');
    isTermsAccepted = true;
    closeModal('terms-modal');
};

// =========================================
// 🔑 NUEVO DISPOSITIVO (CONTADOR ADMIN)
// =========================================
function trackNewDevice() {
    if (!localStorage.getItem('wps_first_visit_done')) {
        localStorage.setItem('wps_first_visit_done', 'true');
        incrementCounter('new_devices');
    }
}

// =========================================
// 🔄 NAVEGACIÓN ENTRE PESTAÑAS
// =========================================
window.switchTab = function(screenId, btnElement) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
    
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        document.querySelector(`.nav-tab[onclick*="${screenId}"]`)?.classList.add('active');
    }
};

// =========================================
// 📋 LÓGICA DEL FORMULARIO
// =========================================
window.updateFormLogic = function() {
    clearAllErrors();
    const position = document.getElementById('position').value;
    const weldStatic = document.getElementById('weldingTypeStatic');
    
    hideAllConditionalSections();
    if (weldStatic) weldStatic.value = "";

    if (!position) return;

    if (position.endsWith('F')) {
        document.getElementById('condition-filete').style.display = 'block';
    } else if (position.endsWith('G')) {
        const type = document.getElementById('grooveType') ? 'bevel' : 'square';
        document.getElementById(`condition-${type}`).style.display = 'block';
    }
};

function hideAllConditionalSections() {
    ['condition-filete', 'condition-bevel', 'condition-square'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// =========================================
// ✅ VALIDACIÓN Y ANUNCIOS INTERSTICIALES
// =========================================
window.validarYMostrarAnuncio = function(accionReal) {
    const hasError = validateRequiredFields();
    if (hasError) {
        scrollToFirstError();
        return;
    }

    incrementCounter('calculate_clicks');
    
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    if (isPro) {
        accionReal();
        return;
    }

    const ad1 = getRandomAd ? getRandomAd() : null;
    const ad2 = getRandomAd ? getRandomAd() : null;

    if (ad1 && ad2) {
        showInterstitialAd([ad1, ad2], accionReal);
    } else {
        accionReal(); // Fallback si no hay anuncios
    }
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
        const val = document.getElementById(field.id)?.value;
        if (!val) { showError(field.group); hasError = true; }
    });

    const pos = document.getElementById('position')?.value;
    if (pos?.endsWith('F')) {
        if (!document.getElementById('weldSize')?.value) {
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
        if (!group.querySelector('.error-message')) {
            const msg = document.createElement('div');
            msg.className = 'error-message';
            msg.textContent = 'Campo obligatorio';
            group.appendChild(msg);
        }
    }
}
window.clearError = function(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.remove('error');
        group.querySelector('.error-message')?.remove();
    }
};
function clearAllErrors() {
    document.querySelectorAll('.form-group.error').forEach(el => {
        el.classList.remove('error');
        el.querySelector('.error-message')?.remove();
    });
}
function scrollToFirstError() {
    document.querySelector('.form-group.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// =========================================
// 📢 INTERSTICIAL PRE-RESULTADOS
// =========================================
function showInterstitialAd(ads, onContinue) {
    const overlay = document.getElementById('pre-result-ad-overlay');
    if (!overlay) { onContinue(); return; }
    
    const imgEl = document.getElementById('interstitial-ad-img');
    const btnEl = document.getElementById('interstitial-btn');
    const timerEl = document.getElementById('interstitial-timer');
    
    overlay.style.display = 'flex';
    let idx = 0;
    let countdown = 3;
    let timer;

    btnEl.disabled = true;
    btnEl.textContent = '⏳ Preparando tus parámetros...';

    function loadNext() {
        if (idx >= ads.length) {
            clearInterval(timer);
            btnEl.disabled = false;
            btnEl.textContent = '✅ VER MIS CÁLCULOS';
            timerEl.textContent = '✨ ¡Listo! Haz clic para continuar';
            return;
        }
        imgEl.src = ads[idx].imagePath || ads[idx].image || '';
        countdown = 3;
        timerEl.textContent = `⏱️ Anuncio ${idx + 1}/2: ${countdown}s`;
        btnEl.textContent = `⏳ Espere ${countdown}s...`;

        timer = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                timerEl.textContent = `⏱️ Anuncio ${idx + 1}/2: ${countdown}s`;
                btnEl.textContent = `⏳ Espere ${countdown}s...`;
            } else {
                clearInterval(timer);
                idx++;
                loadNext();
            }
        }, 1000);
    }

    btnEl.onclick = () => {
        overlay.style.display = 'none';
        btnEl.onclick = null;
        onContinue();
    };

    loadNext();
}

// =========================================
// 🔍 CÁLCULO Y RESULTADOS
// =========================================
window.mostrarResultados = function() {
    const data = {
        proceso: document.getElementById('process').value,
        posicion: document.getElementById('position').value,
        material: document.getElementById('material').value,
        espesor: parseFloat(document.getElementById('baseThickness').value) || 0,
        tipoJunta: document.getElementById('position').value.endsWith('F') ? 'Filete' : (document.getElementById('grooveType') ? 'Ranura Bisel' : 'Tope'),
        tamanoSoldadura: document.getElementById('weldSize').value || '00',
        gap: document.getElementById('fileteGap').value || document.getElementById('gap').value || document.getElementById('squareGap').value || '0',
        angulo: document.getElementById('angle').value,
        tipoRanura: document.getElementById('grooveType').value,
        longitud: document.getElementById('weldLength').value
    };

    const results = calcularWPSCompleto(data);
    displayResults(results, data);
    
    // Layout responsivo (móvil/desktop)
    document.querySelector('.app-layout').classList.add('results-active');
    window.hasCalculated = true;
    showFloatingButtons();
    
    saveToHistory(data);
    updateUrlHash(data);
    incrementCounter('calculate_clicks');
};

function displayResults(results, data) {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || '-'; };
    
    set('res-wps-id', results.wpsCode);
    set('res-process', data.proceso);
    set('res-position', data.posicion);
    set('res-material', data.material);
    set('res-thickness', data.espesor + ' mm');
    set('res-weld-size', data.tamanoSoldadura + ' mm');
    set('res-weld-type', data.tipoJunta);
    set('res-gap', data.gap + ' mm');
    set('res-min-penetration', results.penMinima);
    set('res-angle', results.anguloTotal);
    set('res-groove', data.tipoRanura || '-');
    set('res-rootface', document.getElementById('rootFace').value + ' mm');

    const p = results.params;
    set('res-voltage', `${p.voltage.min}-${p.voltage.max} V`);
    set('res-amperage', `${p.amperage.min}-${p.amperage.max} A`);
    set('res-wfs', `${p.wfs.min}-${p.wfs.max} in/min`);
    set('res-travel', `${p.travelSpeed.min}-${p.travelSpeed.max} cm/min`);
    set('res-current', p.current);
    set('res-stickout', `${p.stickOut.min}-${p.stickOut.max} mm`);
    set('res-preheat', results.preheat);
    set('res-heat-input', `Min: ${results.heatInput.min} | Max: ${results.heatInput.max}`);
    set('res-transfer', 'Cortocircuito / Spray');
    set('res-work-angle', '90°');
    set('res-travel-angle', '10°-15° (Empuje)');
    set('res-electrode', 'Sólido ER70S-6');
    set('res-diameter', '1.2 mm (0.045")');
    set('res-class', 'AWS A5.18');
    set('res-gas-type', 'Mezcla');
    set('res-gas-mix', 'Ar 90% / CO2 10%');
    set('res-flow', '35-45 CFH');

    if (results.heatInput.warning) {
        const hiEl = document.getElementById('res-heat-input');
        if(hiEl) hiEl.innerHTML += results.heatInput.warning;
    }

    const showCons = document.getElementById('showConsumption')?.checked;
    const consSec = document.getElementById('consumption-section');
    if (showCons && results.consumos) {
        consSec.style.display = 'block';
        set('res-wire-cons', `~${results.consumos.wire.total} kg`);
        set('res-gas-cons', `~${results.consumos.gas.total} L`);
    } else {
        consSec.style.display = 'none';
    }

    if (results.techNote) {
        const note = document.getElementById('tech-note');
        if (note) { note.innerHTML = results.techNote; note.style.display = 'block'; }
    }

    // Efecto typing en código WPS
    typeEffect('res-wps-id', results.wpsCode);
    generateQR(results.wpsCode, data);
}

function typeEffect(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        el.textContent += text.charAt(i);
        i++;
        if (i >= text.length) clearInterval(interval);
    }, 40);
}

window.volverFormulario = function() {
    document.querySelector('.app-layout').classList.remove('results-active');
    clearAllErrors();
};

// =========================================
// 📜 HISTORIAL LOCAL + URL HASH
// =========================================
function saveToHistory(data) {
    let hist = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    const entry = { ...data, date: new Date().toLocaleString('es-ES') };
    hist.unshift(entry);
    if (hist.length > 5) hist.pop();
    localStorage.setItem('wps_calc_history', JSON.stringify(hist));
}

window.loadHistory = function() {
    const hist = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    const list = document.getElementById('history-list');
    if (!list) return;
    
    if (hist.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">📭 Sin cálculos recientes</p>';
    } else {
        list.innerHTML = hist.map((h, i) => `
            <div class="history-item" onclick="applyHistory(${i})">
                <span>${h.wpsCode || 'WPS'} - ${h.material} ${h.espesor}mm</span>
                <small>${h.date}</small>
            </div>
        `).join('');
    }
    document.getElementById('history-modal').style.display = 'flex';
};

window.applyHistory = function(idx) {
    const hist = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    const h = hist[idx];
    if (!h) return;
    
    document.getElementById('process').value = h.proceso;
    document.getElementById('baseThickness').value = h.espesor;
    document.getElementById('position').value = h.posicion;
    document.getElementById('material').value = h.material;
    if (h.tamanoSoldadura !== '00') document.getElementById('weldSize').value = h.tamanoSoldadura;
    if (h.longitud) document.getElementById('weldLength').value = h.longitud;
    
    updateFormLogic();
    closeModal('history-modal');
    mostrarResultados();
};

function updateUrlHash(data) {
    const hash = new URLSearchParams({
        proc: data.proceso, pos: data.posicion, mat: data.material, 
        esp: data.espesor, tam: data.tamanoSoldadura
    }).toString();
    window.location.hash = hash;
}

function parseUrlHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (params.has('proc')) {
        document.getElementById('process').value = params.get('proc');
        document.getElementById('position').value = params.get('pos') || '';
        document.getElementById('material').value = params.get('mat') || '';
        document.getElementById('baseThickness').value = params.get('esp') || '';
        document.getElementById('weldSize').value = params.get('tam') || '';
        updateFormLogic();
    }
}

// =========================================
// ☕ BOTONES FLOTANTES
// =========================================
function showFloatingButtons() {
    document.getElementById('coffee-btn')?.classList.add('visible');
    document.getElementById('community-float-btn')?.classList.add('visible');
}

function updateCoffeeCount() {
    let count = parseInt(localStorage.getItem('wps_coffee_count') || '187');
    if (Math.random() < 0.3 && window.hasCalculated) count++;
    localStorage.setItem('wps_coffee_count', count);
    const el = document.getElementById('coffee-count');
    if (el) el.textContent = count;
}

window.openCoffeeModal = function() {
    incrementCounter('coffee_clicks');
    document.getElementById('coffee-modal').style.display = 'flex';
};
window.trackCoffee = function() {
    // Solo tracking visual, el pago es externo
    console.log('☕ Apoyo iniciado');
};

// =========================================
// 📤 EXPORTACIÓN PDF + QR
// =========================================
window.openExportModal = function() {
    const code = document.getElementById('res-wps-id')?.textContent || 'WPS-Documento';
    const input = document.getElementById('export-filename');
    if (input) input.value = code;
    document.getElementById('export-pdf-modal').style.display = 'flex';
};

window.confirmExport = function() {
    const input = document.getElementById('export-filename');
    const name = sanitizeFilename(input.value || 'WPS-Documento');
    
    const originalTitle = document.title;
    document.title = name;
    
    window.print();
    
    document.title = originalTitle;
    closeModal('export-pdf-modal');
    incrementCounter('successful_exports');
};

function sanitizeFilename(str) {
    return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'WPS-Documento';
}

// QR Ligero (Canvas nativo)
function generateQR(code, data) {
    const canvas = document.getElementById('wps-qr');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 80;
    canvas.width = size; canvas.height = size;
    
    // Simulación visual compacta (para impresión offline)
    // En producción se recomienda importar una librería QR real.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QR', size/2, size/2 + 4);
    ctx.font = '6px monospace';
    ctx.fillText(`wps.pro/${btoa(encodeURIComponent(code)).slice(0,10)}`, size/2, size - 8);
    
    // Patrón decorativo tipo QR
    for(let i=0; i<6; i++) for(let j=0; j<6; j++) {
        if (Math.random()>0.5) ctx.fillRect(8+i*10, 8+j*10, 6, 6);
    }
    ctx.fillRect(10,10,16,16); ctx.fillRect(54,10,16,16); ctx.fillRect(10,54,16,16);
}

// =========================================
// 🔒 VALIDACIONES PRO & UTILIDADES
// =========================================
window.checkProcessPro = checkProFeature(FREE_PROCESSES, 'process');
window.checkMaterialPro = checkProFeature(FREE_MATERIALS, 'material');
window.checkWeldSizePro = checkProFeature(FREE_SIZES, 'size');

function checkProFeature(allowedList, type) {
    return function() {
        const val = this.value;
        if (val && !allowedList.includes(val) && localStorage.getItem('wps_pro_active') !== 'true') {
            showProModal(type);
            this.value = '';
        }
    };
}

function showProModal(type) {
    incrementCounter('pro_attempts');
    const msgs = { process: 'proceso', material: 'material', size: 'tamaño >12mm' };
    document.getElementById('modalText').innerHTML = `La opción <strong>${msgs[type]}</strong> requiere <span class="modal-highlight">WPS PRO</span>`;
    document.getElementById('proModal').style.display = 'flex';
}

window.goToActivation = () => { closeModal('proModal'); switchTab('activation-screen', document.querySelector('.nav-tab:nth-child(2)')); };
window.closeProModal = () => closeModal('proModal');

window.showSimulatePayment = function() {
    document.getElementById('generated-code').textContent = `WPS-TEST-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    document.getElementById('paymentModal').style.display = 'flex';
};
window.copyCode = function() {
    navigator.clipboard.writeText(document.getElementById('generated-code').textContent);
    const btn = document.querySelector('#paymentModal .copy-btn');
    btn.textContent = '✅ ¡Copiado!';
    setTimeout(() => btn.textContent = '📋 Copiar Código', 2000);
};
window.closePaymentModal = () => closeModal('paymentModal');

window.activatePro = async function() {
    const code = document.getElementById('license-code').value.trim();
    const status = document.getElementById('activation-status');
    if (!code) return status.innerHTML = '<div class="status-message error">⚠️ Ingresa un código</div>';
    status.innerHTML = '<div class="status-message info">⏳ Validando...</div>';
    const res = await activatePro(code);
    status.innerHTML = `<div class="status-message ${res.success ? 'success' : 'error'}">${res.message}</div>`;
    if (res.success) setTimeout(() => { status.innerHTML = ''; document.getElementById('license-code').value = ''; }, 2000);
};

window.validateFileteGap = function() {
    const gap = parseFloat(document.getElementById('fileteGap').value);
    const warn = document.getElementById('gapWarning');
    const inp = document.getElementById('fileteGap');
    if (gap > 5) { warn.style.display = 'block'; inp.classList.add('warning-input'); }
    else { warn.style.display = 'none'; inp.classList.remove('warning-input'); }
};
window.toggleConsumptionFields = function() {
    document.getElementById('consumptionInputs').style.display = document.getElementById('showConsumption').checked ? 'block' : 'none';
};

// =========================================
// 📊 CONTADORES ADMIN (FIREBASE)
// =========================================
function incrementCounter(key) {
    if (navigator.onLine) {
        const ref = doc(db, 'analytics', 'global_stats');
        getDoc(ref).then(snap => {
            const data = snap.exists() ? snap.data() : {};
            updateDoc(ref, { [key]: (data[key] || 0) + 1, last_updated: new Date() });
        }).catch(() => console.warn('⚠️ Sync offline:', key));
    }
}

// =========================================
// 🛠️ UTILIDADES GLOBALES
// =========================================
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };
window.closeLogoutModal = () => closeModal('logoutModal');
window.confirmLogout = function() {
    closeModal('logoutModal');
    deactivatePro(); // Usa la lógica de pro-system
    location.reload();
};
window.copyDeviceId = function() {
    navigator.clipboard.writeText(document.getElementById('user-device-id')?.textContent || '');
};
