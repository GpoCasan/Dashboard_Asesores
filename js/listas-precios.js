// ==================== MÓDULO: LISTAS DE PRECIOS ====================

console.log('📋 Cargando módulo de listas de precios...');

// ==================== CONFIGURACIÓN ====================
const LISTAS_CONFIG = {
    BASE_PATH: 'img/listas-precios/',
    tabs: [
        {
            id: 'contado-payjoy',
            label: 'CONTADO / PAYJOY',
            icon: '💰',
            folder: 'contado-payjoy',
            imageFile: '1.jpg',
            description: 'Lista de precios para ventas de contado y PAYJOY'
        },
        {
            id: 'spay',
            label: 'SPAY',
            icon: '💳',
            folder: 'spay',
            imageFile: '1.jpg',
            description: 'Lista de precios para SPAY'
        },
        {
            id: 'credicel',
            label: 'CREDICEL',
            icon: '🏦',
            folder: 'credicel',
            imageFile: '1.jpg',
            description: 'Lista de precios para CREDICEL'
        }
    ]
};

// ==================== DOM ELEMENTS ====================
let listasContainer = null;
let listasTabsContainer = null;
let listasContentContainer = null;
let listasLoading = null;

// ==================== FUNCIÓN PRINCIPAL ====================

function initListasPrecios() {
    console.log('📋 Inicializando módulo de listas de precios...');
    
    // Obtener referencias a los elementos DOM
    listasContainer = document.getElementById('listasPreciosModule');
    listasTabsContainer = document.getElementById('listasTabsContainer');
    listasContentContainer = document.getElementById('listasContentContainer');
    listasLoading = document.getElementById('listasLoading');
    
    if (!listasContainer) {
        console.warn('⚠️ Módulo de listas de precios no encontrado en el DOM');
        return;
    }
    
    // Renderizar pestañas
    renderTabs();
    
    // Activar primera pestaña por defecto
    const firstTab = document.querySelector('.listas-tab');
    if (firstTab) {
        firstTab.classList.add('active');
        const tabId = firstTab.dataset.tab;
        loadTabContent(tabId);
    }
}

// ==================== RENDERIZAR PESTAÑAS ====================

function renderTabs() {
    if (!listasTabsContainer) return;
    
    let tabsHtml = '';
    
    LISTAS_CONFIG.tabs.forEach((tab, index) => {
        const isActive = index === 0 ? 'active' : '';
        tabsHtml += `
            <button class="listas-tab ${isActive}" 
                    data-tab="${tab.id}"
                    onclick="switchListasTab('${tab.id}')">
                <span class="tab-icon">${tab.icon}</span>
                <span class="tab-label">${tab.label}</span>
            </button>
        `;
    });
    
    listasTabsContainer.innerHTML = tabsHtml;
}

// ==================== CAMBIAR DE PESTAÑA ====================

function switchListasTab(tabId) {
    console.log('📋 Cambiando a pestaña:', tabId);
    
    // Actualizar pestañas activas
    document.querySelectorAll('.listas-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Cargar contenido de la pestaña
    loadTabContent(tabId);
}

// ==================== CARGAR CONTENIDO DE PESTAÑA ====================

function loadTabContent(tabId) {
    if (!listasContentContainer) return;
    
    // Mostrar loading
    if (listasLoading) {
        listasLoading.style.display = 'block';
    }
    listasContentContainer.innerHTML = '';
    
    // Encontrar la configuración de la pestaña
    const tabConfig = LISTAS_CONFIG.tabs.find(t => t.id === tabId);
    if (!tabConfig) {
        showError('Pestaña no encontrada');
        return;
    }
    
    // Construir ruta de la imagen
    const imagePath = LISTAS_CONFIG.BASE_PATH + tabConfig.folder + '/' + tabConfig.imageFile;
    
    // Verificar si la imagen existe
    const img = new Image();
    img.onload = function() {
        // La imagen existe, mostrarla
        renderImage(imagePath, tabConfig);
    };
    img.onerror = function() {
        // La imagen no existe, mostrar estado vacío
        showEmptyState(tabConfig);
    };
    img.src = imagePath;
}

// ==================== RENDERIZAR IMAGEN ====================

function renderImage(imagePath, tabConfig) {
    if (!listasContentContainer) return;
    
    listasContentContainer.innerHTML = `
        <div class="listas-header">
            <h3>${tabConfig.icon} ${tabConfig.label}</h3>
            <p class="listas-description">${tabConfig.description}</p>
        </div>
        <div class="listas-image-container">
            <div class="listas-image-wrapper" onclick="openImageModal('${imagePath}', '${tabConfig.label}')">
                <img src="${imagePath}" 
                     alt="${tabConfig.label}" 
                     class="listas-main-image"
                     loading="lazy">
                <div class="listas-image-overlay">
                    <span class="listas-zoom-icon">🔍</span>
                    <span class="listas-zoom-text">Click para ampliar</span>
                </div>
            </div>
            <div class="listas-image-footer">
                <span class="listas-image-info">📄 ${tabConfig.label}</span>
                <button onclick="openImageModal('${imagePath}', '${tabConfig.label}')" class="btn-zoom">
                    🔍 Ampliar
                </button>
            </div>
        </div>
    `;
    
    if (listasLoading) {
        listasLoading.style.display = 'none';
    }
}

// ==================== ESTADOS VACÍOS Y ERRORES ====================

function showEmptyState(tabConfig) {
    if (!listasContentContainer) return;
    
    listasContentContainer.innerHTML = `
        <div class="listas-header">
            <h3>${tabConfig.icon} ${tabConfig.label}</h3>
            <p class="listas-description">${tabConfig.description}</p>
        </div>
        <div class="listas-empty">
            <div class="listas-empty-icon">📭</div>
            <h4>No hay imagen disponible</h4>
            <p>No se encontró la imagen en la carpeta <strong>${tabConfig.folder}</strong></p>
            <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 8px;">
                💡 Coloca la imagen en: <code>img/listas-precios/${tabConfig.folder}/1.jpg</code>
            </p>
            <div style="margin-top: 16px;">
                <button onclick="refreshListasTab()" class="btn-secondary">
                    🔄 Actualizar
                </button>
            </div>
        </div>
    `;
    
    if (listasLoading) {
        listasLoading.style.display = 'none';
    }
}

function showError(message) {
    if (!listasContentContainer) return;
    
    listasContentContainer.innerHTML = `
        <div class="listas-empty">
            <div class="listas-empty-icon">❌</div>
            <h4>Error</h4>
            <p>${message}</p>
            <button onclick="refreshListasTab()" class="btn-secondary">
                🔄 Intentar de nuevo
            </button>
        </div>
    `;
    
    if (listasLoading) {
        listasLoading.style.display = 'none';
    }
}

// ==================== MODAL DE IMAGEN COMPLETA ====================

function openImageModal(imageSrc, caption) {
    // Eliminar modal existente
    const existingModal = document.getElementById('listasImageModal');
    if (existingModal) existingModal.remove();
    
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'listasImageModal';
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            max-width: 95vw;
            max-height: 95vh;
            background: transparent;
            box-shadow: none;
            animation: modalFadeIn 0.3s ease-out;
            margin: 0;
            padding: 0;
        ">
            <div style="
                display: flex;
                justify-content: flex-end;
                padding: 8px 16px;
                background: rgba(0,0,0,0.5);
                border-radius: 12px 12px 0 0;
            ">
                <span onclick="closeImageModal()" style="
                    font-size: 2rem;
                    cursor: pointer;
                    color: white;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    line-height: 1;
                ">×</span>
            </div>
            <div style="
                background: rgba(0,0,0,0.7);
                padding: 16px;
                border-radius: 0 0 12px 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                max-height: 85vh;
            ">
                <img src="${imageSrc}" 
                     alt="${caption}" 
                     style="
                         max-width: 100%;
                         max-height: 70vh;
                         object-fit: contain;
                         border-radius: 8px;
                         box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                     "
                     onerror="this.parentElement.innerHTML='<div style=\\'color:white;padding:40px;text-align:center;\\'><div style=\\'font-size:3rem;\\'>🖼️</div><p>No se pudo cargar la imagen</p></div>'">
                <div style="
                    color: white;
                    margin-top: 12px;
                    font-size: 0.9rem;
                    opacity: 0.8;
                    text-align: center;
                ">${caption}</div>
                <div style="
                    margin-top: 8px;
                    display: flex;
                    gap: 8px;
                ">
                    <button onclick="closeImageModal()" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: none;
                        padding: 6px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: background 0.2s;
                    "
                    onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageModal();
        }
    });
}

function closeImageModal() {
    const modal = document.getElementById('listasImageModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

// ==================== REFRESCAR ====================

function refreshListasTab() {
    const activeTab = document.querySelector('.listas-tab.active');
    if (activeTab) {
        const tabId = activeTab.dataset.tab;
        loadTabContent(tabId);
    } else {
        const firstTab = document.querySelector('.listas-tab');
        if (firstTab) {
            firstTab.classList.add('active');
            loadTabContent(firstTab.dataset.tab);
        }
    }
}

// ==================== EXPORTAR FUNCIONES GLOBALES ====================
window.initListasPrecios = initListasPrecios;
window.switchListasTab = switchListasTab;
window.refreshListasTab = refreshListasTab;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

console.log('📋 Módulo de listas de precios cargado correctamente');