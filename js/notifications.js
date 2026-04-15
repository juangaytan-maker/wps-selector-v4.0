/* ============================================================================
   🔔 SISTEMA DE NOTIFICACIONES TOAST
   ============================================================================
   Descripción: Notificaciones personalizadas en lugar de alert() nativos
   ============================================================================ */

// Función principal para mostrar notificaciones
export function showToast(message, type = 'info', title = null, duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Iconos según el tipo
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };

    // Títulos por defecto según el tipo
    const titles = {
        info: 'Información',
        success: '¡Éxito!',
        warning: 'Advertencia',
        error: 'Error'
    };

    // Contenido del toast
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;

    // Agregar al contenedor
    container.appendChild(toast);

    // Auto-cerrar después del tiempo especificado
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, duration);
    }
}

// Funciones específicas para cada tipo
export function showInfo(message, title = null) {
    showToast(message, 'info', title);
}

export function showSuccess(message, title = null) {
    showToast(message, 'success', title);
}

export function showWarning(message, title = null) {
    showToast(message, 'warning', title);
}

export function showError(message, title = null) {
    showToast(message, 'error', title);
}

// Hacerlas globales para usar desde HTML
window.showInfo = showInfo;
window.showSuccess = showSuccess;
window.showWarning = showWarning;
window.showError = showError;
