/* ============================================================================
   🎯 MAIN APPLICATION CONTROLLER - v4.2 (MAINTAINABLE EDITION)
   ============================================================================
   Descripción: Controlador principal de la aplicación WPS Selector Pro
   Última actualización: 2025
   Autor: Juan Gaytán
   
   📋 ÍNDICE DE SECCIONES:
   ────────────────────────────────────────────────────────────────────────
   01. 📦 IMPORTS & DEPENDENCIAS (Módulos externos)
   02. 📚 CONSTANTES & CONFIGURACIÓN GLOBAL
   03. 🎬 INICIALIZACIÓN DE LA APLICACIÓN
   04. 🔄 NAVEGACIÓN ENTRE PESTAÑAS
   05. 📋 LÓGICA DEL FORMULARIO (Condicional)
   06. ✅ VALIDACIÓN DE CAMPOS
   07. ⏳ INTERSTICIAL DE ANUNCIOS (Pre-cálculo)
   08. 🔒 VALIDACIONES PRO (Materiales/Procesos) [⚠️ CORREGIDO]
   09. 💳 SIMULACIÓN DE PAGO
   10. 🔑 ACTIVACIÓN DE LICENCIA PRO
   11. 🔍 CÁLCULO Y RESULTADOS [⚠️ ZONA CRÍTICA]
   12. 📜 HISTORIAL LOCAL (localStorage)
   13. ☕ BOTONES FLOTANTES & DONACIONES
   14. 📤 EXPORTACIÓN A PDF
   15. 🔧 UTILIDADES & HELPERS
   16. 📊 CONTADORES FIREBASE (Analytics)
   ============================================================================ */

// ============================================================================
// 01. 📦 IMPORTS & DEPENDENCIAS
// ============================================================================
// 💡 Módulos externos necesarios para la lógica de la app
// 🔧 Si agregas nuevas funciones a estos archivos, actualiza los imports aquí
import { showToast, showInfo, showSuccess, showWarning, showError } from './notifications.js';
import { calcularWPSCompleto } from './wps-calculator.js';
import { 
    updateProUI, 
    activatePro, 
    deactivatePro, 
    contactDeveloper, 
    initProSystem 
} from './pro-system.js';
import { initAds, getRandomAd } from './ads-manager.js';
import { db, doc, setDoc, getDoc } from './firebase-config.js';


// ============================================================================
// 02. 📚 CONSTANTES & CONFIGURACIÓN GLOBAL
// ============================================================================
// 💡 Listas de elementos permitidos en versión FREE
// 🔧 Para agregar nuevos materiales/procesos FREE: editar estos arrays
// ⚠️ Los valores deben coincidir EXACTAMENTE con los <option value=""> del HTML
const FREE_MATERIALS = ['A36', 'A500', 'A516-70', 'A53'];
const FREE_SIZES = ['6', '8', '10', '12'];
const FREE_PROCESSES = ['GMAW'];

// Estado global: ¿El usuario ya calculó algo? (para mostrar botones flotantes)
window.hasCalculated = false;


// ============================================================================
// 03. 🎬 INICIALIZACIÓN DE LA APLICACIÓN
// ============================================================================
// 💡 Se ejecuta cuando el DOM está completamente cargado
// 🔧 Para agregar inicializaciones adicionales: editar dentro de este callback
document.addEventListener('DOMContentLoaded', () => {
    initProSystem();      // Inicializa sistema PRO/Free
    initAds();            // Carga anuncios desde Firebase
    trackNewDevice();     // Registra nuevo dispositivo en analytics
    console.log('✅ WPS Selector Pro cargado correctamente');
});


// ============================================================================
// 04. 🔄 NAVEGACIÓN ENTRE PESTAÑAS
// ============================================================================
// 💡 Alterna entre pantallas (Selector / Activar PRO)
// ⚠️ Los IDs de pantalla deben coincidir con index.html
// 🔧 Para agregar nuevas pantallas: duplicar lógica y actualizar CSS/HTML
window.switchTab = function(screenId, btnElement) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Desactivar todos los tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    // Mostrar pantalla objetivo
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    
    // Activar tab correspondiente
    if (btnElement) btnElement.classList.add('active');
};


// ============================================================================
// 05. 📋 LÓGICA DEL FORMULARIO (Condicional)
// ============================================================================
// 💡 Muestra/oculta secciones según la posición seleccionada (F/G)
// ⚠️ Los IDs de elementos deben coincidir con index.html
// 🔧 Para agregar nuevas condiciones: editar updateFormLogic()
// ============================================================================

// Maneja lógica principal según posición (Filete vs Ranura)
window.updateFormLogic = function() {
    clearAllErrors();
    const position = document.getElementById('position').value;
    const weldStatic = document.getElementById('weldingTypeStatic');
    
    hideAllConditionalSections();
    if(weldStatic) weldStatic.value = "";
    
    if (!position) return;
    
    // ── Posiciones de FILETE (1F, 2F, 3F, 4F) ──
    if (position.endsWith('F')) {
        if(weldStatic) { 
            weldStatic.style.display = 'block'; 
            weldStatic.value = "FILETE"; 
        }
        document.getElementById('condition-filete').style.display = 'block';
        
    // ── Posiciones de RANURA (1G, 2G, 3G, 4G) ──
    } else if (position.endsWith('G')) {
        if(weldStatic) weldStatic.style.display = 'none';
        document.getElementById('condition-bevel').style.display = 'block';
    }
};

// Maneja sub-tipos de ranura (Bisel vs Tope)
window.updateConditionalFields = function() {
    const type = document.getElementById('weldingType').value;
    hideAllConditionalSections();
    
    if (type === 'Ranura Bisel') {
        document.getElementById('condition-bevel').style.display = 'block';
    } else if (type === 'Tope') {
        document.getElementById('condition-square').style.display = 'block';
    }
};

// Oculta todas las secciones condicionales (helper interno)
function hideAllConditionalSections() {
    ['condition-filete', 'condition-bevel', 'condition-square'].forEach(id => {
        const el = document.getElementById(id); 
        if (el) el.style.display = 'none';
    });
}


// ============================================================================
// 06. ✅ VALIDACIÓN DE CAMPOS
// ============================================================================
// 💡 Valida que los campos obligatorios estén llenos antes de calcular
// 🔧 Para agregar nuevos campos requeridos: editar el array en validateRequiredFields()
// ============================================================================

// Función principal: valida y muestra intersticial si es FREE
window.validarYMostrarAnuncio = function(accionReal) {
    if (validateRequiredFields()) { 
        scrollToFirstError(); 
        return; 
    }
    incrementCounter('calculate_clicks');
    
    // Si es PRO, saltar anuncios
    if (localStorage.getItem('wps_pro_active') === 'true') { 
        accionReal(); 
        return; 
    }

    // Obtener 2 anuncios aleatorios para el intersticial
    const ad1 = getRandomAd ? getRandomAd() : null;
    const ad2 = getRandomAd ? getRandomAd() : null;
    
    if (ad1 && ad2) {
        showInterstitialAd([ad1, ad2], accionReal);
    } else {
        accionReal(); // Fallback si no hay anuncios disponibles
    }
};

// Valida campos obligatorios del formulario
function validateRequiredFields() {
    let err = false; 
    clearAllErrors();
    
    // Campos base obligatorios
    ['process', 'baseThickness', 'position', 'material'].forEach(id => {
        if (!document.getElementById(id)?.value) { 
            showError('group-' + id.replace(/([A-Z])/g, '-$1').toLowerCase()); 
            err = true; 
        }
    });
    
    // Validación adicional: tamaño de soldadura para filetes
    if (document.getElementById('position').value?.endsWith('F') && 
        !document.getElementById('weldSize').value) {
        showError('group-weldsize'); 
        err = true;
    }
    return err;
}

// Muestra mensaje de error en un grupo de formulario
function showError(id) {
    const g = document.getElementById(id);
    if (g && !g.classList.contains('error')) {
        g.classList.add('error');
        if (!g.querySelector('.error-message')) {
            const m = document.createElement('div'); 
            m.className = 'error-message'; 
            m.textContent = 'Campo obligatorio'; 
            g.appendChild(m);
        }
    }
}

// Limpia error de un grupo específico (expuesta para HTML)
window.clearError = function(id) { 
    const g = document.getElementById(id); 
    if(g) { 
        g.classList.remove('error'); 
        g.querySelector('.error-message')?.remove(); 
    } 
};

// Limpia todos los errores del formulario
function clearAllErrors() { 
    document.querySelectorAll('.form-group.error').forEach(el => { 
        el.classList.remove('error'); 
        el.querySelector('.error-message')?.remove(); 
    }); 
}

// Scroll suave al primer error encontrado
function scrollToFirstError() { 
    document.querySelector('.form-group.error')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    }); 
}


// ============================================================================
// 07. ⏳ INTERSTICIAL DE ANUNCIOS (Pre-cálculo)
// ============================================================================
// 💡 Muestra 2 anuncios de 3 segundos antes de mostrar resultados (solo FREE)
// ⚠️ Los IDs deben coincidir con el bloque #pre-result-ad-overlay en index.html
// 🔧 Para cambiar tiempos: editar el setInterval (1000ms = 1 segundo)
// ============================================================================

function showInterstitialAd(ads, onContinue) {
    const overlay = document.getElementById('pre-result-ad-overlay');
    const imgEl = document.getElementById('interstitial-ad-img');
    const btnEl = document.getElementById('interstitial-btn');
    const timerEl = document.getElementById('interstitial-timer');
    
    // Fallback si el overlay no existe en el HTML
    if (!overlay) { 
        onContinue(); 
        return; 
    }
    
    overlay.style.display = 'flex';
    let idx = 0, countdown = 3, timer;
    
    // Estado inicial del botón
    btnEl.disabled = true;
    btnEl.textContent = '⏳ Preparando tus parámetros...';

    // Carga secuencial de anuncios
    function loadNext() {
        // Si ya se mostraron todos los anuncios, habilitar botón
        if (idx >= ads.length) {
            clearInterval(timer);
            btnEl.disabled = false;
            btnEl.textContent = '✅ VER MIS CÁLCULOS';
            timerEl.textContent = '✨ ¡Listo! Haz clic para continuar';
            return;
        }
        
        // Cargar imagen del anuncio actual
        imgEl.src = ads[idx].imagePath || ads[idx].image || '';
        countdown = 3;
        timerEl.textContent = `⏱️ Anuncio ${idx + 1}/2: ${countdown}s`;
        btnEl.textContent = `⏳ Espere ${countdown}s...`;
        
        // Countdown de 3 segundos por anuncio
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
    
    // Acción al hacer clic en el botón
    btnEl.onclick = () => { 
        overlay.style.display = 'none'; 
        btnEl.onclick = null; 
        onContinue(); 
    };
    
    loadNext(); // Iniciar secuencia
}


// ============================================================================
// 08. 🔒 VALIDACIONES PRO (Materiales/Procesos) [⚠️ CORREGIDO]
// ============================================================================
// 💡 Bloquea selección de opciones premium si el usuario no es PRO
// ⚠️ CORRECCIÓN CRÍTICA: Ahora recibe el elemento como parámetro (no usa `this`)
// 🔧 Para agregar nuevas restricciones: editar FREE_* arrays o checkProFeature()
// 
// 📝 Uso en HTML (IMPORTANTE):
//   onchange="checkProcessPro(this)"  ← Pasar 'this' como argumento
// ============================================================================

// Inicializar validadores con las listas FREE
window.checkProcessPro = checkProFeature(FREE_PROCESSES);
window.checkMaterialPro = checkProFeature(FREE_MATERIALS);
window.checkWeldSizePro = checkProFeature(FREE_SIZES);

// Factory function: crea validadores personalizados
// ⚠️ CORRECCIÓN: Ahora acepta 'element' como parámetro para evitar error de `this`
function checkProFeature(list) { 
    return function(element) {
        // ✅ Usar element.value en lugar de this.value
        const value = element?.value;
        
        if (value && !list.includes(value) && localStorage.getItem('wps_pro_active') !== 'true') {
            incrementCounter('pro_attempts');
            document.getElementById('modalText').innerHTML = 'Esta opción requiere <span class="modal-highlight">WPS PRO</span>';
            document.getElementById('proModal').style.display = 'flex'; 
            element.value = ''; // Limpiar selección no permitida
        }
    };
}

// Navegar a pantalla de activación PRO
window.goToActivation = () => { 
    closeModal('proModal'); 
    switchTab('activation-screen', document.querySelector('.nav-tab:nth-child(2)')); 
};

// Cerrar modal PRO
window.closeProModal = () => closeModal('proModal');


// ============================================================================
// 09. 💳 SIMULACIÓN DE PAGO (Modo Test)
// ============================================================================
// 💡 Genera código de licencia aleatorio para pruebas
// 🔧 Para cambiar formato del código: editar generateTestLicenseCode()
// ============================================================================

window.showSimulatePayment = function() {
    const code = generateTestLicenseCode();
    document.getElementById('generated-code').textContent = code;
    document.getElementById('paymentModal').style.display = 'flex';
};

// Genera código tipo: WPS-PRO-ABC123-5
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

// Copiar código al portapapeles con feedback visual
window.copyCode = function() {
    const code = document.getElementById('generated-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    });
};

// Cerrar modal de pago
window.closePaymentModal = function() {
    document.getElementById('paymentModal').style.display = 'none';
};


// ============================================================================
// 10. 🔑 ACTIVACIÓN DE LICENCIA PRO
// ============================================================================
// 💡 Valida código ingresado y activa versión PRO
// ⚠️ Los mensajes se muestran en #activation-status (index.html)
// ============================================================================

window.activatePro = async function() {
    const c = document.getElementById('license-code').value.trim();
    const s = document.getElementById('activation-status');
    
    if (!c) return s.innerHTML = '<div class="status-message error">⚠️ Ingresa un código</div>';
    
    s.innerHTML = '<div class="status-message info">⏳ Validando...</div>';
    const r = await activatePro(c);
    
    s.innerHTML = `<div class="status-message ${r.success ? 'success' : 'error'}">${r.message}</div>`;
    
    if (r.success) {
        setTimeout(() => { 
            s.innerHTML = ''; 
            document.getElementById('license-code').value = ''; 
        }, 2000);
    }
};


// ============================================================================
// 11. 🔍 CÁLCULO Y RESULTADOS [⚠️ ZONA CRÍTICA]
// ============================================================================
// 💡 Función principal: recolecta datos, calcula y muestra resultados
// ⚠️ Los IDs de inputs/outputs deben coincidir EXACTAMENTE con index.html
// 🔧 Para agregar nuevos parámetros: editar objeto 'data' y displayResults()
// ============================================================================

window.mostrarResultados = function() {
    // ── Recopilar datos del formulario ──
    const data = {
        proceso: document.getElementById('process').value,
        posicion: document.getElementById('position').value,
        material: document.getElementById('material').value,
        espesor: parseFloat(document.getElementById('baseThickness').value) || 0,
        tipoJunta: document.getElementById('position').value.endsWith('F') ? 
            'Filete' : (document.getElementById('weldingType')?.value || 'Tope'),
        tamanoSoldadura: document.getElementById('weldSize').value || '00',
        gap: document.getElementById('position').value.endsWith('F') ? 
            document.getElementById('fileteGap').value : 
            (document.getElementById('gap').value || document.getElementById('squareGap').value || '0'),
        angulo: document.getElementById('angle').value,
        tipoRanura: document.getElementById('grooveType').value,
        longitud: document.getElementById('weldLength').value
    };
    
    // Calcular parámetros según AWS D1.1
    const results = calcularWPSCompleto(data);
    
    // Mostrar resultados en pantalla
    displayResults(results, data);
    
    // Cambiar vista: formulario → resultados
    document.getElementById('form-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Post-cálculo: mostrar botones flotantes y guardar historial
    window.hasCalculated = true;
    showFloatingButtons();
    saveToHistory(data);
    incrementCounter('calculate_clicks');
};

// Renderiza resultados en el DOM
function displayResults(r, d) {
    // Helper para setear texto con fallback
    const set = (id, v) => { 
        const el = document.getElementById(id); 
        if(el) el.textContent = v || '-'; 
    };
    
    // Configuración básica
    set('res-wps-id', r.wpsCode); 
    set('res-process', d.proceso); 
    set('res-position', d.posicion);
    set('res-material', d.material); 
    set('res-thickness', d.espesor + ' mm');
    set('res-weld-size', d.tamanoSoldadura + ' mm'); 
    set('res-weld-type', d.tipoJunta);
    set('res-gap', (d.gap || '0') + ' mm'); 
    set('res-min-penetration', r.penMinima);
    set('res-angle', r.anguloTotal); 
    set('res-groove', d.tipoRanura || '-');
    set('res-rootface', (document.getElementById('rootFace').value || '0') + ' mm');
    
    // Parámetros eléctricos
    const p = r.params;
    set('res-voltage', `${p.voltage.min}-${p.voltage.max} V`);
    set('res-amperage', `${p.amperage.min}-${p.amperage.max} A`);
    set('res-wfs', `${p.wfs.min}-${p.wfs.max} in/min`);
    set('res-travel', `${p.travelSpeed.min}-${p.travelSpeed.max} cm/min`);
    set('res-current', p.current); 
    set('res-stickout', `${p.stickOut.min}-${p.stickOut.max} mm`);
    
    // Técnicas y preheat
    set('res-preheat', r.preheat);
    document.getElementById('res-heat-input').innerHTML = 
        `Min: ${r.heatInput.min} | Max: ${r.heatInput.max}` + (r.heatInput.warning || '');
    
    set('res-transfer', 'Cortocircuito / Spray'); 
    set('res-work-angle', '90°'); 
    set('res-travel-angle', '10°-15° (Empuje)');
    
    // Consumibles
    set('res-electrode', 'Sólido ER70S-6'); 
    set('res-diameter', '1.2 mm (0.045")');
    set('res-class', 'AWS A5.18'); 
    set('res-gas-type', 'Mezcla'); 
    set('res-gas-mix', 'Ar 90% / CO2 10%'); 
    set('res-flow', '35-45 CFH');
    
    // Consumo estimado (opcional)
    if (document.getElementById('showConsumption').checked && r.consumos) {
        document.getElementById('consumption-section').style.display = 'block';
        set('res-wire-cons', `~${r.consumos.wire.total} kg`); 
        set('res-gas-cons', `~${r.consumos.gas.total} L`);
    } else {
        document.getElementById('consumption-section').style.display = 'none';
    }
    
    // Nota técnica (si existe)
    if (r.techNote) { 
        document.getElementById('tech-note').innerHTML = r.techNote; 
        document.getElementById('tech-note').style.display = 'block'; 
    }
}

// Volver al formulario desde resultados
window.volverFormulario = function() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('form-screen').style.display = 'block';
    clearAllErrors(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
};


// ============================================================================
// 12. 📜 HISTORIAL LOCAL (localStorage)
// ============================================================================
// 💡 Guarda últimos 5 cálculos en el navegador del usuario
// 🔧 Para cambiar límite: editar 'if (h.length > 5)' en saveToHistory()
// ============================================================================

function saveToHistory(data) {
    let h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    h.unshift({ ...data, date: new Date().toLocaleString('es-ES') });
    if (h.length > 5) h.pop(); // Mantener solo últimos 5
    localStorage.setItem('wps_calc_history', JSON.stringify(h));
}

// Cargar y mostrar historial en modal
window.loadHistory = function() {
    const h = JSON.parse(localStorage.getItem('wps_calc_history') || '[]');
    const list = document.getElementById('history-list');
    if (!list) return;
    
    list.innerHTML = h.length === 0 ? 
        '<p style="text-align:center;color:var(--muted);padding:20px;">📭 Sin cálculos recientes</p>' :
        h.map((x, i) => `
            <div class="history-item" onclick="applyHistory(${i})">
                <span>${x.wpsCode || 'WPS'} - ${x.material} ${x.espesor}mm</span>
                <small>${x.date}</small>
            </div>
        `).join('');
    
    document.getElementById('history-modal').style.display = 'flex';
};

// Aplicar cálculo del historial al formulario
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


// ============================================================================
// 13. ☕ BOTONES FLOTANTES & DONACIONES
// ============================================================================
// 💡 Aparecen después del primer cálculo exitoso
// 🔧 Para cambiar posición: editar CSS (.coffee-btn, .community-btn)
// ============================================================================

function showFloatingButtons() {
    document.getElementById('coffee-btn')?.classList.add('visible');
    document.getElementById('community-float-btn')?.classList.add('visible');
}

// Actualiza contador de cafés (simulado)
function updateCoffeeCount() {
    let c = parseInt(localStorage.getItem('wps_coffee_count') || '187');
    if (Math.random() < 0.3 && window.hasCalculated) c++;
    localStorage.setItem('wps_coffee_count', c);
    const el = document.getElementById('coffee-count'); 
    if (el) el.textContent = c;
}

// Abrir modal de donación
window.openCoffeeModal = function() { 
    incrementCounter('coffee_clicks'); 
    document.getElementById('coffee-modal').style.display = 'flex'; 
};


// ============================================================================
// 14. 📤 EXPORTACIÓN A PDF
// ============================================================================
// 💡 Usa window.print() con estilos @media print para generar PDF limpio
// 🔧 Para cambiar nombre por defecto: editar en openExportModal()
// ============================================================================

window.openExportModal = function() {
    document.getElementById('export-filename').value = 
        document.getElementById('res-wps-id')?.textContent || 'WPS-Documento';
    document.getElementById('export-pdf-modal').style.display = 'flex';
};

window.confirmExport = function() {
    // Sanitizar nombre de archivo (evitar caracteres inválidos)
    const name = (document.getElementById('export-filename').value || 'WPS-Documento')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    
    const orig = document.title; 
    document.title = name;
    window.print(); 
    document.title = orig;
    
    closeModal('export-pdf-modal'); 
    incrementCounter('successful_exports');
};


// ============================================================================
// 15. 🔧 UTILIDADES & HELPERS
// ============================================================================
// 💡 Funciones auxiliares reutilizables
// 🔧 Para agregar nuevas utilidades: editar esta sección
// ============================================================================

// Validar gap en filetes (advertencia si > 5mm)
window.validateFileteGap = function() {
    const g = parseFloat(document.getElementById('fileteGap').value);
    const w = document.getElementById('gapWarning'), i = document.getElementById('fileteGap');
    if (g > 5) { 
        w.style.display = 'block'; 
        i.classList.add('warning-input'); 
    } else { 
        w.style.display = 'none'; 
        i.classList.remove('warning-input'); 
    }
};

// Mostrar/ocultar inputs de consumo estimado
window.toggleConsumptionFields = function() { 
    document.getElementById('consumptionInputs').style.display = 
        document.getElementById('showConsumption').checked ? 'block' : 'none'; 
};

// Copiar ID de dispositivo al portapapeles
window.copyDeviceId = function() { 
    const t = document.getElementById('user-device-id')?.textContent.trim(); 
    if(t && t!=='Cargando...') {
        navigator.clipboard.writeText(t).then(() => alert('✅ Copiado: '+t)); 
    }
};

// Cerrar modal genérico
window.closeModal = function(id) { 
    document.getElementById(id).style.display = 'none'; 
};

// Cerrar modal de logout
window.closeLogoutModal = () => closeModal('logoutModal');

// Confirmar logout PRO
window.confirmLogout = function() { 
    closeModal('logoutModal'); 
    deactivatePro(); 
    location.reload(); 
};


// ============================================================================
// 16. 📊 CONTADORES FIREBASE (Analytics)
// ============================================================================
// 💡 Registra eventos anónimos en Firestore para estadísticas del admin
// ⚠️ Requiere reglas de seguridad que permitan escritura pública en /analytics
// 🔧 Para agregar nuevos contadores: llamar incrementCounter('nuevo_nombre')
// ============================================================================

async function incrementCounter(key) {
    // No intentar sincronizar si está offline
    if (!navigator.onLine) return;
    
    try {
        const ref = doc(db, 'analytics', 'global_stats');
        const snap = await getDoc(ref);
        
        // Obtener valor actual o iniciar en 0
        let cur = snap.exists() ? snap.data()[key] || 0 : 0;
        
        // Actualizar con nuevo valor + timestamp
        await setDoc(ref, { 
            [key]: cur + 1, 
            lastUpdated: new Date().toISOString() 
        }, { merge: true });
        
    } catch (e) { 
        console.warn('⚠️ Contador offline:', e); 
    }
}

// Registrar primer ingreso del dispositivo (solo una vez)
function trackNewDevice() {
    if (!localStorage.getItem('wps_first_visit')) {
        localStorage.setItem('wps_first_visit', 'true');
        incrementCounter('new_devices');
    }
}


// ============================================================================
// 📋 RESUMEN DE EXPORTACIONES & FUNCIONES GLOBALES
// ============================================================================
// 💡 Referencia rápida de lo que este archivo expone
// 
// 🌐 FUNCIONES GLOBALES (para onclick en HTML):
//   • switchTab()              → Navegar entre pantallas
//   • updateFormLogic()        → Lógica condicional del formulario
//   • updateConditionalFields()→ Sub-tipos de ranura
//   • validarYMostrarAnuncio() → Validar + intersticial
//   • clearError()             → Limpiar error específico
//   • checkProcessPro()        → Validar proceso (recibe elemento)
//   • checkMaterialPro()       → Validar material (recibe elemento)
//   • checkWeldSizePro()       → Validar tamaño (recibe elemento)
//   • goToActivation()         → Ir a pantalla PRO
//   • closeProModal()          → Cerrar modal PRO
//   • showSimulatePayment()    → Mostrar simulador de pago
//   • copyCode()               → Copiar código de prueba
//   • closePaymentModal()      → Cerrar modal de pago
//   • activatePro()            → Activar licencia
//   • mostrarResultados()      → Calcular y mostrar resultados
//   • volverFormulario()       → Volver al formulario
//   • loadHistory()            → Cargar historial en modal
//   • applyHistory()           → Aplicar cálculo del historial
//   • openCoffeeModal()        → Abrir modal de donación
//   • openExportModal()        → Abrir modal de exportación
//   • confirmExport()          → Generar PDF
//   • validateFileteGap()      → Validar gap de filete
//   • toggleConsumptionFields()→ Mostrar inputs de consumo
//   • copyDeviceId()           → Copiar ID de dispositivo
//   • closeModal()             → Cerrar modal genérico
//   • closeLogoutModal()       → Cerrar modal de logout
//   • confirmLogout()          → Confirmar logout PRO
// 
// 🔒 FUNCIONES INTERNAS (no exponer):
//   • hideAllConditionalSections() → Helper de formulario
//   • validateRequiredFields()     → Validación base
//   • showError() / clearAllErrors() → Manejo de errores
//   • scrollToFirstError()         → UX de validación
//   • checkProFeature()            → Factory de validadores PRO
//   • generateTestLicenseCode()    → Generador de códigos test
//   • displayResults()             → Renderizado de resultados
//   • saveToHistory()              → Guardar en localStorage
//   • showFloatingButtons()        → Mostrar botones post-cálculo
//   • updateCoffeeCount()          → Contador simulado de cafés
//   • incrementCounter()           → Sync con Firebase Analytics
//   • trackNewDevice()             → Registro de primer ingreso
// ============================================================================
