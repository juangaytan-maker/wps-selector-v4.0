/**
🎯 MAIN APPLICATION CONTROLLER (v4.1 - FINAL)
*/
import { calcularWPSCompleto } from './wps-calculator.js';
import { updateProUI, activatePro, deactivatePro, contactDeveloper, initProSystem } from './pro-system.js';
import { initAds, getRandomAd } from './ads-manager.js';
import { db, doc, setDoc, getDoc } from './firebase-config.js';

// =========================================
// 📚 CONSTANTES
// =========================================
const FREE_MATERIALS = ['A36', 'A500', 'A516-70', 'A53'];
const FREE_SIZES = ['6', '8', '10', '12'];
const FREE_PROCESSES = ['GMAW'];
window.hasCalculated = false;

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
// 🔄 NAVEGACIÓN
// =========================================
window.switchTab = function(screenId, btnElement) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

// =========================================
// 📋 LÓGICA FORMULARIO
// =========================================
window.updateFormLogic = function() {
    clearAllErrors();
    const position = document.getElementById('position').value;
    const weldStatic = document.getElementById('weldingTypeStatic');
    hideAllConditionalSections();
    if(weldStatic) weldStatic.value = "";
    if (!position) return;
    if (position.endsWith('F')) {
        if(weldStatic) { weldStatic.style.display = 'block'; weldStatic.value = "FILETE"; }
        document.getElementById('condition-filete').style.display = 'block';
    } else if (position.endsWith('G')) {
        if(weldStatic) weldStatic.style.display = 'none';
        document.getElementById('condition-bevel').style.display = 'block';
    }
};
window.updateConditionalFields = function() {
    const type = document.getElementById('weldingType').value;
    hideAllConditionalSections();
    if (type === 'Ranura Bisel') document.getElementById('condition-bevel').style.display = 'block';
    else if (type === 'Tope') document.getElementById('condition-square').style.display = 'block';
};
function hideAllConditionalSections() {
    ['condition-filete', 'condition-bevel', 'condition-square'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
}

// =========================================
// ✅ VALIDACIÓN & INTERSTICIAL
// =========================================
window.validarYMostrarAnuncio = function(accionReal) {
    if (validateRequiredFields()) { scrollToFirstError(); return; }
    incrementCounter('calculate_clicks');
    
    if (localStorage.getItem('wps_pro_active') === 'true') { accionReal(); return; }

    const ad1 = getRandomAd ? getRandomAd() : null;
    const ad2 = getRandomAd ? getRandomAd() : null;
    if (ad1 && ad2) showInterstitialAd([ad1, ad2], accionReal);
    else accionReal();
};

function validateRequiredFields() {
    let err = false; clearAllErrors();
    ['process', 'baseThickness', 'position', 'material'].forEach(id => {
        if (!document.getElementById(id)?.value) { showError('group-' + id.replace(/([A-Z])/g, '-$1').toLowerCase()); err = true; }
    });
    if (document.getElementById('position').value?.endsWith('F') && !document.getElementById('weldSize').value) {
        showError('group-weldsize'); err = true;
    }
    return err;
}
function showError(id) {
    const g = document.getElementById(id);
    if (g && !g.classList.contains('error')) {
        g.classList.add('error');
        if (!g.querySelector('.error-message')) {
            const m = document.createElement('div'); m.className = 'error-message'; m.textContent = 'Campo obligatorio'; g.appendChild(m);
        }
    }
}
window.clearError = function(id) { const g = document.getElementById(id); if(g) { g.classList.remove('error'); g.querySelector('.error-message')?.remove(); } };
function clearAllErrors() { document.querySelectorAll('.form-group.error').forEach(el => { el.classList.remove('error'); el.querySelector('.error-message')?.remove(); }); }
function scrollToFirstError() { document.querySelector('.form-group.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

// =========================================
// ⏳ INTERSTICIAL AD
// =========================================
function showInterstitialAd(ads, onContinue) {
    const overlay = document.getElementById('pre-result-ad-overlay');
    const imgEl = document.getElementById('interstitial-ad-img');
    const btnEl = document.getElementById('interstitial-btn');
    const timerEl = document.getElementById('interstitial-timer');
    if (!overlay) { onContinue(); return; }
    
    overlay.style.display = 'flex';
    let idx = 0, countdown = 3, timer;
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
            } else { clearInterval(timer); idx++; loadNext(); }
        }, 1000);
    }
    btnEl.onclick = () => { overlay.style.display = 'none'; btnEl.onclick = null; onContinue(); };
    loadNext();
}

// =========================================
// 🔍 CÁLCULO & RESULTADOS
// =========================================
window.mostrarResultados = function() {
    const data = {
        proceso: document.getElementById('process').value,
        posicion: document.getElementById('position').value,
        material: document.getElementById('material').value,
        espesor: parseFloat(document.getElementById('baseThickness').value) || 0,
        tipoJunta: document.getElementById('position').value.endsWith('F') ? 'Filete' : (document.getElementById('weldingType')?.value || 'Tope'),
        tamanoSoldadura: document.getElementById('weldSize').value || '00',
        gap: document.getElementById('position').value.endsWith('F') ? document.getElementById('fileteGap').value : (document.getElementById('gap').value || document.getElementById('squareGap').value || '0'),
        angulo: document.getElementById('angle').value,
        tipoRanura: document.getElementById('grooveType').value,
        longitud: document.getElementById('weldLength').value
    };
    const results = calcularWPSCompleto(data);
    displayResults(results, data);
    
    document.getElementById('form-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    window.hasCalculated = true;
    showFloatingButtons();
    saveToHistory(data);
    incrementCounter('calculate_clicks');
};

function displayResults(r, d) {
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v || '-'; };
    set('res-wps-id', r.wpsCode); set('res-process', d.proceso); set('res-position', d.posicion);
    set('res-material', d.material); set('res-thickness', d.espesor + ' mm');
    set('res-weld-size', d.tamanoSoldadura + ' mm'); set('res-weld-type', d.tipoJunta);
    set('res-gap', (d.gap || '0') + ' mm'); set('res-min-penetration', r.penMinima);
    set('res-angle', r.anguloTotal); set('res-groove', d.tipoRanura || '-');
    set('res-rootface', (document.getElementById('rootFace').value || '0') + ' mm');
    
    const p = r.params;
    set('res-voltage', `${p.voltage.min}-${p.voltage.max} V`);
    set('res-amperage', `${p.amperage.min}-${p.amperage.max} A`);
    set('res-wfs', `${p.wfs.min}-${p.wfs.max} in/min`);
    set('res-travel', `${p.travelSpeed.min}-${p.travelSpeed.max} cm/min`);
    set('res-current', p.current); set('res-stickout', `${p.stickOut.min}-${p.stickOut.max} mm`);
    set('res-preheat', r.preheat);
    document.getElementById('res-heat-input').innerHTML = `Min: ${r.heatInput.min} | Max: ${r.heatInput.max}` + (r.heatInput.warning || '');
    set('res-transfer', 'Cortocircuito / Spray'); set('res-work-angle', '90°'); set('res-travel-angle', '10°-15° (Empuje)');
    set('res-electrode', 'Sólido ER70S-6'); set('res-diameter', '1.2 mm (0.045")');
    set('res-class', 'AWS A5.18'); set('res-gas-type', 'Mezcla'); set('res-gas-mix', 'Ar 90% / CO2 10%'); set('res-flow', '35-45 CFH');
    
    if (document.getElementById('showConsumption').checked && r.consumos) {
        document.getElementById('consumption-section').style.display = 'block';
        set('res-wire-cons', `~${r.consumos.wire.total} kg`); set('res-gas-cons', `~${r.consumos.gas.total} L`);
    } else document.getElementById('consumption-section').style.display = 'none';
    
    if (r.techNote) { document.getElementById('tech-note').innerHTML = r.techNote; document.getElementById('tech-note').style.display = 'block'; }
}

window.volverFormulario = function() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('form-screen').style.display = 'block';
    clearAllErrors(); window.scrollTo({ top: 0, behavior: 'smooth' });
};

// =========================================
// 📜 HISTORIAL LOCAL
// =========================================
function saveToHistory(data) {
    let h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    h.unshift({ ...data, date: new Date().toLocaleString('es-ES') });
    if (h.length > 5) h.pop();
    localStorage.setItem('wps_calc_history', JSON.stringify(h));
}
window.loadHistory = function() {
    const h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = h.length === 0 ? '<p style="text-align:center;color:var(--muted);padding:20px;">📭 Sin cálculos recientes</p>' 
        : h.map((x, i) => `<div class="history-item" onclick="applyHistory(${i})"><span>${x.wpsCode || 'WPS'} - ${x.material} ${x.espesor}mm</span><small>${x.date}</small></div>`).join('');
    document.getElementById('history-modal').style.display = 'flex';
};
window.applyHistory = function(i) {
    const h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]')[i];
    if (!h) return;
    document.getElementById('process').value = h.proceso;
    document.getElementById('baseThickness').value = h.espesor;
    document.getElementById('position').value = h.posicion;
    document.getElementById('material').value = h.material;
    if (h.tamanoSoldadura !== '00') document.getElementById('weldSize').value = h.tamanoSoldadura;
    updateFormLogic();
    closeModal('history-modal');
    mostrarResultados();
};

// =========================================
// ☕ & 👥 BOTONES FLOTANTES
// =========================================
function showFloatingButtons() {
    document.getElementById('coffee-btn')?.classList.add('visible');
    document.getElementById('community-float-btn')?.classList.add('visible');
}
function updateCoffeeCount() {
    let c = parseInt(localStorage.getItem('wps_coffee_count') || '187');
    if (Math.random() < 0.3 && window.hasCalculated) c++;
    localStorage.setItem('wps_coffee_count', c);
    const el = document.getElementById('coffee-count'); if (el) el.textContent = c;
}
window.openCoffeeModal = function() { incrementCounter('coffee_clicks'); document.getElementById('coffee-modal').style.display = 'flex'; };

// =========================================
// 📤 EXPORTAR PDF
// =========================================
window.openExportModal = function() {
    document.getElementById('export-filename').value = document.getElementById('res-wps-id')?.textContent || 'WPS-Documento';
    document.getElementById('export-pdf-modal').style.display = 'flex';
};
window.confirmExport = function() {
    const name = (document.getElementById('export-filename').value || 'WPS-Documento').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    const orig = document.title; document.title = name;
    window.print(); document.title = orig;
    closeModal('export-pdf-modal'); incrementCounter('successful_exports');
};

// =========================================
// 🔒 PRO & UTILIDADES
// =========================================
window.checkProcessPro = checkProFeature(FREE_PROCESSES);
window.checkMaterialPro = checkProFeature(FREE_MATERIALS);
window.checkWeldSizePro = checkProFeature(FREE_SIZES);
function checkProFeature(list) { return function() {
    if (this.value && !list.includes(this.value) && localStorage.getItem('wps_pro_active') !== 'true') {
        incrementCounter('pro_attempts');
        document.getElementById('modalText').innerHTML = 'Esta opción requiere <span class="modal-highlight">WPS PRO</span>';
        document.getElementById('proModal').style.display = 'flex'; this.value = '';
    }
};}
window.goToActivation = () => { closeModal('proModal'); switchTab('activation-screen', document.querySelector('.nav-tab:nth-child(2)')); };
window.closeProModal = () => closeModal('proModal');
window.activatePro = async function() {
    const c = document.getElementById('license-code').value.trim();
    const s = document.getElementById('activation-status');
    if (!c) return s.innerHTML = '<div class="status-message error">⚠️ Ingresa un código</div>';
    s.innerHTML = '<div class="status-message info">⏳ Validando...</div>';
    const r = await activatePro(c);
    s.innerHTML = `<div class="status-message ${r.success ? 'success' : 'error'}">${r.message}</div>`;
    if (r.success) setTimeout(() => { s.innerHTML = ''; document.getElementById('license-code').value = ''; }, 2000);
};
window.validateFileteGap = function() {
    const g = parseFloat(document.getElementById('fileteGap').value);
    const w = document.getElementById('gapWarning'), i = document.getElementById('fileteGap');
    if (g > 5) { w.style.display = 'block'; i.classList.add('warning-input'); }
    else { w.style.display = 'none'; i.classList.remove('warning-input'); }
};
window.toggleConsumptionFields = function() { document.getElementById('consumptionInputs').style.display = document.getElementById('showConsumption').checked ? 'block' : 'none'; };
window.copyDeviceId = function() { const t = document.getElementById('user-device-id')?.textContent.trim(); if(t && t!=='Cargando...') navigator.clipboard.writeText(t).then(() => alert('✅ Copiado: '+t)); };
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };
window.closeLogoutModal = () => closeModal('logoutModal');
window.confirmLogout = function() { closeModal('logoutModal'); deactivatePro(); location.reload(); };

// =========================================
// 📊 CONTADORES FIREBASE
// =========================================
async function incrementCounter(key) {
    if (!navigator.onLine) return;
    try {
        const ref = doc(db, 'analytics', 'global_stats');
        const snap = await getDoc(ref);
        let cur = snap.exists() ? snap.data()[key] || 0 : 0;
        await setDoc(ref, { [key]: cur + 1, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (e) { console.warn('⚠️ Contador offline:', e); }
}
function trackNewDevice() {
    if (!localStorage.getItem('wps_first_visit')) {
        localStorage.setItem('wps_first_visit', 'true');
        incrementCounter('new_devices');
    }
}
