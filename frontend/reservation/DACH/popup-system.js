/* ==================== SYSTÈME DE POPUP MODERNE RÉUTILISABLE ==================== */

// Fonction principale pour afficher un popup
function showModernPopup(type, title, message, onConfirm, onCancel, options = {}) {
    // Créer l'overlay s'il n'existe pas
    let overlay = document.getElementById('modern-popup-overlay');
    if (!overlay) {
        createPopupHTML();
        overlay = document.getElementById('modern-popup-overlay');
    }
    
    const popup = overlay.querySelector('.modern-popup-container');
    const icon = overlay.querySelector('.modern-popup-icon i');
    const titleEl = overlay.querySelector('.modern-popup-title');
    const messageEl = overlay.querySelector('.modern-popup-message');
    const confirmBtn = overlay.querySelector('#modern-popup-confirm');
    const cancelBtn = overlay.querySelector('#modern-popup-cancel');
    const closeBtn = overlay.querySelector('#modern-popup-close');
    
    // Réinitialiser les classes
    popup.className = 'modern-popup-container';
    
    // Configurer selon le type
    switch(type) {
        case 'success':
            popup.classList.add('modern-popup-success');
            icon.className = 'fas fa-check-circle';
            confirmBtn.textContent = options.confirmText || 'Continuer';
            if (onCancel) cancelBtn.style.display = 'inline-block';
            else cancelBtn.style.display = 'none';
            break;
        case 'error':
            popup.classList.add('modern-popup-error');
            icon.className = 'fas fa-times-circle';
            confirmBtn.textContent = options.confirmText || 'Réessayer';
            cancelBtn.style.display = 'none';
            break;
        case 'warning':
            popup.classList.add('modern-popup-warning');
            icon.className = 'fas fa-exclamation-triangle';
            confirmBtn.textContent = options.confirmText || 'Continuer';
            if (onCancel) cancelBtn.style.display = 'inline-block';
            else cancelBtn.style.display = 'none';
            break;
        case 'info':
            popup.classList.add('modern-popup-info');
            icon.className = 'fas fa-info-circle';
            confirmBtn.textContent = options.confirmText || 'OK';
            cancelBtn.style.display = 'none';
            break;
        case 'confirm':
            popup.classList.add('modern-popup-confirm');
            icon.className = 'fas fa-question-circle';
            confirmBtn.textContent = options.confirmText || 'Oui';
            cancelBtn.textContent = options.cancelText || 'Non';
            cancelBtn.style.display = 'inline-block';
            break;
    }
    
    // Définir le contenu
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Afficher le popup avec animation
    overlay.classList.remove('modern-popup-hide');
    overlay.classList.add('modern-popup-show');
    
    // Gestionnaires d'événements
    confirmBtn.onclick = function() {
        hideModernPopup();
        if (onConfirm) onConfirm();
    };
    
    cancelBtn.onclick = function() {
        hideModernPopup();
        if (onCancel) onCancel();
    };
    
    closeBtn.onclick = function() {
        hideModernPopup();
        if (onCancel) onCancel();
    };
    
    // Fermer en cliquant sur l'overlay
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            hideModernPopup();
            if (onCancel) onCancel();
        }
    };
    
    // Fermer avec Escape
    const escapeHandler = function(e) {
        if (e.keyCode === 27) {
            hideModernPopup();
            if (onCancel) onCancel();
            document.removeEventListener('keyup', escapeHandler);
        }
    };
    document.addEventListener('keyup', escapeHandler);
}

// Fonction pour cacher le popup
function hideModernPopup() {
    const overlay = document.getElementById('modern-popup-overlay');
    if (overlay) {
        overlay.classList.remove('modern-popup-show');
        overlay.classList.add('modern-popup-hide');
        
        setTimeout(() => {
            overlay.classList.remove('modern-popup-hide');
        }, 300);
    }
}

// Fonction pour créer le HTML du popup
function createPopupHTML() {
    const popupHTML = `
        <div id="modern-popup-overlay" class="modern-popup-overlay">
            <div class="modern-popup-container">
                <div class="modern-popup-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="modern-popup-content">
                    <h3 class="modern-popup-title">Titre</h3>
                    <p class="modern-popup-message">Message</p>
                </div>
                <div class="modern-popup-actions">
                    <button class="modern-popup-btn modern-popup-btn-primary" id="modern-popup-confirm">Confirmer</button>
                    <button class="modern-popup-btn modern-popup-btn-secondary" id="modern-popup-cancel">Annuler</button>
                </div>
                <button class="modern-popup-close" id="modern-popup-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

// Fonctions de convenance pour différents types de popups
function showSuccessPopup(title, message, onConfirm, options = {}) {
    showModernPopup('success', title, message, onConfirm, null, options);
}

function showErrorPopup(title, message, onConfirm, options = {}) {
    showModernPopup('error', title, message, onConfirm, null, options);
}

function showWarningPopup(title, message, onConfirm, onCancel, options = {}) {
    showModernPopup('warning', title, message, onConfirm, onCancel, options);
}

function showInfoPopup(title, message, onConfirm, options = {}) {
    showModernPopup('info', title, message, onConfirm, null, options);
}

function showConfirmPopup(title, message, onConfirm, onCancel, options = {}) {
    showModernPopup('confirm', title, message, onConfirm, onCancel, options);
}

// Notification toast (optionnel)
function showToast(type, message, duration = 3000) {
    // Créer le toast s'il n'existe pas
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check' : 
                 type === 'error' ? 'fa-times' : 
                 type === 'warning' ? 'fa-exclamation' : 'fa-info';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animation d'apparition
    setTimeout(() => toast.classList.add('toast-show'), 100);
    
    // Gestionnaire de fermeture
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => removeToast(toast);
    
    // Auto-suppression
    setTimeout(() => removeToast(toast), duration);
    
    return toast;
}

function removeToast(toast) {
    if (toast && toast.parentNode) {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Styles CSS injectés dynamiquement si pas déjà présents
function injectPopupStyles() {
    if (document.getElementById('modern-popup-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'modern-popup-styles';
    styles.textContent = `
        /* Popup overlay */
        .modern-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .modern-popup-overlay.modern-popup-show {
            opacity: 1;
            visibility: visible;
        }
        
        .modern-popup-overlay.modern-popup-hide {
            opacity: 0;
            visibility: hidden;
        }
        
        /* Container principal */
        .modern-popup-container {
            background: var(--container-bg, rgba(255, 255, 255, 0.95));
            backdrop-filter: blur(25px);
            border-radius: 20px;
            border: 2px solid var(--border-color, rgba(255, 255, 255, 0.2));
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            min-width: 400px;
            max-width: 500px;
            padding: 30px;
            position: relative;
            transform: scale(0.8) translateY(30px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .modern-popup-overlay.modern-popup-show .modern-popup-container {
            transform: scale(1) translateY(0);
        }
        
        /* Bouton de fermeture */
        .modern-popup-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            color: var(--text-secondary, #7f8c8d);
        }
        
        .modern-popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: rotate(90deg);
        }
        
        /* Icône */
        .modern-popup-icon {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .modern-popup-icon i {
            font-size: 3.5rem;
            transition: all 0.3s ease;
        }
        
        /* Contenu */
        .modern-popup-content {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .modern-popup-title {
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--text-primary, #2c3e50);
            margin-bottom: 15px;
            letter-spacing: 0.5px;
        }
        
        .modern-popup-message {
            font-size: 1rem;
            color: var(--text-secondary, #7f8c8d);
            line-height: 1.6;
            margin: 0;
        }
        
        /* Actions */
        .modern-popup-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .modern-popup-btn {
            padding: 12px 25px;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .modern-popup-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }
        
        .modern-popup-btn:hover::before {
            left: 100%;
        }
        
        .modern-popup-btn-primary {
            background: linear-gradient(135deg, var(--primary-color, #F59E0B), var(--accent-color, #EA580C));
            color: white;
            box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3);
        }
        
        .modern-popup-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
        }
        
        .modern-popup-btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary, #2c3e50);
            border: 2px solid var(--border-color, rgba(255, 255, 255, 0.2));
            backdrop-filter: blur(10px);
        }
        
        .modern-popup-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        /* Types spécifiques */
        .modern-popup-success .modern-popup-icon i {
            color: #27ae60;
            text-shadow: 0 0 20px rgba(39, 174, 96, 0.5);
            animation: successPulse 2s infinite;
        }
        
        .modern-popup-error .modern-popup-icon i {
            color: #e74c3c;
            text-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
            animation: errorShake 0.5s ease-in-out;
        }
        
        .modern-popup-warning .modern-popup-icon i {
            color: #f39c12;
            text-shadow: 0 0 20px rgba(243, 156, 18, 0.5);
            animation: warningBounce 1s infinite;
        }
        
        .modern-popup-info .modern-popup-icon i {
            color: #3498db;
            text-shadow: 0 0 20px rgba(52, 152, 219, 0.5);
        }
        
        .modern-popup-confirm .modern-popup-icon i {
            color: #9b59b6;
            text-shadow: 0 0 20px rgba(155, 89, 182, 0.5);
        }
        
        /* Animations */
        @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes errorShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes warningBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        /* Toast notifications */
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            pointer-events: none;
        }
        
        .toast {
            background: var(--container-bg, rgba(255, 255, 255, 0.95));
            backdrop-filter: blur(15px);
            border-radius: 12px;
            padding: 15px 20px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border-left: 4px solid;
            transform: translateX(400px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
        }
        
        .toast.toast-show {
            transform: translateX(0);
        }
        
        .toast.toast-hide {
            transform: translateX(400px);
            opacity: 0;
        }
        
        .toast-success { border-left-color: #27ae60; }
        .toast-error { border-left-color: #e74c3c; }
        .toast-warning { border-left-color: #f39c12; }
        .toast-info { border-left-color: #3498db; }
        
        .toast i {
            font-size: 1.2rem;
        }
        
        .toast-success i { color: #27ae60; }
        .toast-error i { color: #e74c3c; }
        .toast-warning i { color: #f39c12; }
        .toast-info i { color: #3498db; }
        
        .toast span {
            flex: 1;
            color: var(--text-primary, #2c3e50);
            font-weight: 500;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: var(--text-secondary, #7f8c8d);
            cursor: pointer;
            padding: 2px;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .toast-close:hover {
            background: rgba(0, 0, 0, 0.1);
            color: var(--text-primary, #2c3e50);
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .modern-popup-container {
                min-width: 90%;
                max-width: 90%;
                padding: 25px 20px;
                margin: 20px;
            }
            
            .modern-popup-actions {
                flex-direction: column;
                gap: 10px;
            }
            
            .modern-popup-btn {
                width: 100%;
                padding: 15px;
            }
            
            .toast {
                min-width: 280px;
                margin: 0 10px 10px 0;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

// Auto-initialisation
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', injectPopupStyles);
    // Fallback si DOMContentLoaded a déjà été déclenché
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPopupStyles);
    } else {
        injectPopupStyles();
    }
}
