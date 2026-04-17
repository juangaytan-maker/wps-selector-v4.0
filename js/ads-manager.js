/**
📢 ADS MANAGER (FIREBASE EDITION - OPTIMIZED & AUDITADO)
- Rotación suave con fade
- Ponderación por peso (weight)
- Exportación segura para intersticiales
- ✅ CORREGIDO: Manejo de rutas relativas y fallback de imágenes
*/
import { db, collection, getDocs } from './firebase-config.js';

let adsData = [];
let currentRotationTimer = null;

// URL base de tu proyecto en GitHub Pages
const BASE_URL = 'https://juangaytan-maker.github.io/wps-selector-v4.0/';

export async function initAds() {
    const isPro = localStorage.getItem('wps_pro_active') === 'true';
    const adContainer = document.getElementById('ad-container');

    // Si es PRO o no existe el contenedor, salimos
    if (isPro || !adContainer) {
        if (adContainer) adContainer.style.display = 'none';
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, 'ads'));
        adsData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.active) {
                // Normalizamos campo y convertimos ruta relativa a absoluta
                let imagePath = data.imagePath || data.image || '';
                
                // ✅ CORRECCIÓN: Convertir rutas relativas a absolutas
                if (imagePath && !imagePath.startsWith('http')) {
                    // Quitar slash inicial si existe para evitar duplicados
                    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
                    imagePath = BASE_URL + cleanPath;
                }
                
                adsData.push({ 
                    id: doc.id, 
                    ...data,
                    imagePath: imagePath
                });
            }
        });

        if (adsData.length > 0) {
            startAdRotation(6000); // 6 segundos
            adContainer.style.display = 'block';
        } else {
            adContainer.style.display = 'none';
        }

    } catch (error) {
        console.warn('⚠️ Error cargando anuncios desde Firestore:', error);
    }
}

function startAdRotation(timeMs) {
    showRandomAd();
    if (currentRotationTimer) clearInterval(currentRotationTimer);
    currentRotationTimer = setInterval(showRandomAd, timeMs);
}

function showRandomAd() {
    if (adsData.length === 0) return;
    const ad = getWeightedRandomAd();
    if (!ad) return;

    const container = document.getElementById('ad-container');
    if (!container) return;

    let adLink = container.querySelector('.ad-link');
    let adImg = container.querySelector('.ad-image');

    // Crear estructura si es la primera carga
    if (!adLink) {
        container.innerHTML = `
            <a href="#" target="_blank" class="ad-link" style="display:block; position:relative;">
                <div class="ad-label">PUBLICIDAD</div>
                <img src="" alt="Anuncio" class="ad-image" style="width:100%; height:100%; object-fit:contain; display:block; transition: opacity 0.4s ease-in-out;">
            </a>`;
        adLink = container.querySelector('.ad-link');
        adImg = container.querySelector('.ad-image');
    }

    // 1. Fade Out
    adImg.style.opacity = '0.2'; 
    
    // 2. Precarga de imagen
    const newImg = new Image();
    newImg.src = ad.imagePath;

    // 3. Fade In al cargar
    newImg.onload = () => {
        adImg.src = ad.imagePath;
        adImg.alt = ad.alt || 'Anuncio Publicitario';
        adLink.href = ad.link || '#';
        adLink.onclick = () => window.handleAdClick?.(ad.id);
        adImg.style.opacity = '1';
    };

    // ✅ CORRECCIÓN: Fallback si la imagen falla al cargar
    newImg.onerror = () => {
        console.warn(`⚠️ Imagen no encontrada: ${ad.imagePath}`);
        
        // Imagen de fallback (placeholder genérico)
        const fallbackImg = 'https://via.placeholder.com/400x150/16213e/00d9ff?text=Anuncio+No+Disponible';
        
        adImg.src = fallbackImg;
        adImg.alt = 'Anuncio no disponible';
        adLink.href = '#';
        adLink.onclick = null;
        adImg.style.opacity = '1';
    };
}

function getWeightedRandomAd() {
    const totalWeight = adsData.reduce((sum, ad) => sum + (ad.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const ad of adsData) {
        random -= (ad.weight || 1);
        if (random <= 0) return ad;
    }
    return adsData[0];
}

// ✅ Exportar función para intersticiales (app.js la importa)
export function getRandomAd() {
    return getWeightedRandomAd();
}

// Click tracking global (opcional)
window.handleAdClick = function(adId) {
    console.log(`🖱️ Clic registrado en anuncio ID: ${adId}`);
};
