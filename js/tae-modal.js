/**
 * Módulo para gestionar el inventario de TAE - Con colores mejorados
 */

console.log('📱 === CARGANDO TAE MODAL ===');

// ==================== CONFIGURACIÓN ====================
const TAE_CONFIG = {
    API_URL: 'https://inventory.gcasan.com/api/stock',
    PRODUCT_ID: 220,
    PER_PAGE: 100,
    PAGE: 1,
    TOTAL: 0
};

const TAE_ADMIN_TOKEN = '87924|XoV4ZRpYQ69rF89PiZnAqggd1VmO8WjtOU4pXWwC';

let taeData = null;
let taeUpdateInterval = null;

// ==================== FUNCIONES ====================

function getUserIds() {
    let branchId = null;
    let warehouseId = null;
    
    const user = window.currentUser || (window.getCurrentUser ? window.getCurrentUser() : null);
    
    if (user) {
        branchId = user.branch_id || user.sucursal_id || user.branchId;
        warehouseId = user.warehouse_id || user.almacen_id || user.warehouseId;
    }
    
    if (!branchId) {
        const branches = window.getUserBranches ? window.getUserBranches() : [];
        if (branches && branches.length > 0) {
            branchId = branches[0].id || branches[0].branch_id;
        }
    }
    
    if (!warehouseId) {
        const warehouses = window.getUserWarehouses ? window.getUserWarehouses() : [];
        if (warehouses && warehouses.length > 0) {
            warehouseId = warehouses[0].id || warehouses[0].warehouse_id;
        }
    }
    
    if (!branchId || !warehouseId) {
        try {
            const storedBranches = sessionStorage.getItem('dashboard_branches');
            const storedWarehouses = sessionStorage.getItem('dashboard_warehouses');
            
            if (storedBranches) {
                const branches = JSON.parse(storedBranches);
                if (branches && branches.length > 0) {
                    branchId = branches[0].id || branches[0].branch_id;
                }
            }
            
            if (storedWarehouses) {
                const warehouses = JSON.parse(storedWarehouses);
                if (warehouses && warehouses.length > 0) {
                    warehouseId = warehouses[0].id || warehouses[0].warehouse_id;
                }
            }
        } catch (e) {
            console.warn('⚠️ Error leyendo sessionStorage:', e);
        }
    }
    
    return { 
        branchId: parseInt(branchId), 
        warehouseId: parseInt(warehouseId) 
    };
}

function getCurrentUserName() {
    try {
        const user = window.currentUser || (window.getCurrentUser ? window.getCurrentUser() : null);
        if (user) {
            return user.name || user.full_name || user.username || 'Usuario';
        }
        const stored = sessionStorage.getItem('dashboard_user');
        if (stored) {
            const userData = JSON.parse(stored);
            return userData.name || userData.full_name || userData.username || 'Usuario';
        }
        return 'Usuario';
    } catch (e) {
        return 'Usuario';
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX').format(value);
}

function formatDateTime(date) {
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

async function fetchTaeInventory() {
    const ids = getUserIds();
    const branchId = ids.branchId;
    const warehouseId = ids.warehouseId;
    
    if (!branchId || !warehouseId || isNaN(branchId) || isNaN(warehouseId) || branchId <= 0 || warehouseId <= 0) {
        console.warn('⚠️ IDs inválidos para TAE:', { branchId, warehouseId });
        return null;
    }
    
    const url = new URL(TAE_CONFIG.API_URL);
    url.searchParams.append('page', TAE_CONFIG.PAGE);
    url.searchParams.append('per_page', TAE_CONFIG.PER_PAGE);
    url.searchParams.append('total', TAE_CONFIG.TOTAL);
    url.searchParams.append('product_id', TAE_CONFIG.PRODUCT_ID);
    url.searchParams.append('branch_id', branchId);
    url.searchParams.append('warehouse_id', warehouseId);
    
    console.log('📱 Consultando TAE:', url.toString());
    
    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TAE_ADMIN_TOKEN}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error TAE:', errorText);
            return null;
        }
        
        const data = await response.json();
        console.log('✅ TAE datos recibidos');
        return data;
    } catch (error) {
        console.error('❌ Error en fetchTaeInventory:', error);
        return null;
    }
}

function updateTaeBadge(count) {
    const badge = document.getElementById('badgeTae');
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = formatCurrency(count);
        badge.style.display = 'block';
        badge.style.backgroundColor = '#8b5cf6';
        badge.style.color = 'white';
    } else {
        badge.textContent = '0';
        badge.style.display = 'block';
        badge.style.backgroundColor = '#64748b';
        badge.style.color = 'white';
    }
}

async function loadTaeInventory() {
    console.log('📱 Cargando inventario TAE...');
    
    try {
        const data = await fetchTaeInventory();
        if (data && data.data && data.data.length > 0) {
            const totalStock = parseInt(data.data[0].quantity) || 0;
            taeData = data;
            updateTaeBadge(totalStock);
            console.log(`📱 TAE actualizado: ${formatCurrency(totalStock)} unidades`);
            return totalStock;
        } else {
            console.warn('⚠️ No se recibieron datos de TAE');
            updateTaeBadge(0);
            return 0;
        }
    } catch (error) {
        console.error('❌ Error cargando TAE:', error);
        updateTaeBadge(0);
        return 0;
    }
}

function cargarHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (typeof html2canvas !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = () => {
            console.log('✅ html2canvas cargado correctamente');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Error al cargar html2canvas');
            reject(new Error('No se pudo cargar la librería de captura'));
        };
        document.head.appendChild(script);
    });
}

function mostrarNotificacion(mensaje, tipo) {
    const existing = document.querySelector('.tae-notification');
    if (existing) existing.remove();
    
    const notif = document.createElement('div');
    notif.className = 'tae-notification';
    notif.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 14px 20px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 10001;
        animation: calcSlideUp 0.3s ease-out;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        max-width: 400px;
        background: ${tipo === 'success' ? '#10b981' : '#ef4444'};
        color: white;
    `;
    notif.textContent = mensaje;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

/**
 * ============================================================
 * FUNCIÓN DE CAPTURA MEJORADA CON COLORES
 * ============================================================
 */
async function tomarCapturaTAE() {
    console.log('📸 Tomando captura de pantalla...');
    
    if (typeof html2canvas === 'undefined') {
        await cargarHtml2Canvas();
    }
    
    try {
        const modalContent = document.querySelector('#taeModal .modal-content');
        if (!modalContent) {
            mostrarNotificacion('No se encontró el contenido del modal', 'error');
            return;
        }
        
        const btnCaptura = document.getElementById('taeCapturaBtn');
        if (btnCaptura) {
            btnCaptura.textContent = '⏳ Capturando...';
            btnCaptura.disabled = true;
        }
        
        const nombreAsesor = getCurrentUserName();
        const fechaHora = formatDateTime(new Date());
        
        // Crear contenedor temporal
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: ${modalContent.scrollWidth}px;
            background: white;
            z-index: -1;
            opacity: 0;
            pointer-events: none;
        `;
        document.body.appendChild(tempContainer);
        
        // Clonar contenido
        const clone = modalContent.cloneNode(true);
        clone.style.width = modalContent.scrollWidth + 'px';
        clone.style.maxWidth = 'none';
        clone.style.margin = '0';
        clone.style.borderRadius = '12px';
        clone.style.boxShadow = '0 20px 60px rgba(0,0,0,0.15)';
        clone.style.position = 'relative';
        clone.style.overflow = 'visible';
        clone.style.background = 'white';
        
        // Mantener el header con colores originales
        const header = clone.querySelector('.modal-header');
        if (header) {
            header.style.background = 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)';
            header.style.color = 'white';
            header.style.borderRadius = '12px 12px 0 0';
            header.style.padding = '20px 24px';
        }
        
        // Remover botón cerrar
        const closeBtn = clone.querySelector('.close-modal');
        if (closeBtn) closeBtn.style.display = 'none';
        
        // Mejorar el body
        const body = clone.querySelector('.modal-body');
        if (body) {
            body.style.padding = '30px 24px';
            body.style.background = 'white';
        }
        
        // Mejorar el footer
        const footer = clone.querySelector('.modal-footer');
        if (footer) {
            footer.innerHTML = '';
            footer.style.padding = '12px 24px';
            footer.style.borderTop = '2px solid #e2e8f0';
            footer.style.background = '#f8fafc';
            footer.style.textAlign = 'center';
            footer.style.fontSize = '0.75rem';
            footer.style.fontWeight = '600';
            footer.style.color = '#8b5cf6';
            footer.style.borderRadius = '0 0 12px 12px';
            footer.textContent = 'SERVICEL - Grupo Casan © 2026';
        }
        
        // ===== BARRA DE INFORMACIÓN DEL ASESOR CON COLORES =====
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
            border-top: 3px solid #8b5cf6;
            font-size: 0.9rem;
            color: #1e293b;
            font-family: 'Segoe UI', sans-serif;
        `;
        infoDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="
                    background: #8b5cf6;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                ">👤 ASESOR</span>
                <span style="font-weight: 700; color: #4c1d95;">${nombreAsesor}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; color: #64748b;">
                <span style="
                    background: #e2e8f0;
                    color: #475569;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                ">📅 ${fechaHora}</span>
            </div>
        `;
        clone.appendChild(infoDiv);
        
        tempContainer.appendChild(clone);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: clone.scrollWidth,
            height: clone.scrollHeight,
            onclone: function(doc) {
                // Asegurar que el header mantenga el gradiente
                const headerEl = doc.querySelector('.modal-header');
                if (headerEl) {
                    headerEl.style.background = 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)';
                }
            }
        });
        
        tempContainer.remove();
        
        const link = document.createElement('a');
        link.download = `TAE_${nombreAsesor.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        if (btnCaptura) {
            btnCaptura.textContent = '📸 Capturar';
            btnCaptura.disabled = false;
        }
        
        mostrarNotificacion('✅ Captura guardada', 'success');
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarNotificacion('❌ Error al capturar', 'error');
        
        const btnCaptura = document.getElementById('taeCapturaBtn');
        if (btnCaptura) {
            btnCaptura.textContent = '📸 Capturar';
            btnCaptura.disabled = false;
        }
    }
}

function getTotalStock(data) {
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) return 0;
    return parseInt(data.data[0].quantity) || 0;
}

function renderTaeLoading() {
    const body = document.getElementById('taeModalBody');
    if (!body) return;
    
    body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; padding: 30px 0;">
            <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <span style="margin-left: 16px; color: #64748b; font-weight: 500;">Cargando...</span>
        </div>
    `;
}

function renderTaeModal(data) {
    const body = document.getElementById('taeModalBody');
    if (!body) return;
    
    const totalStock = getTotalStock(data);
    const formattedStock = formatCurrency(totalStock);
    const nombreAsesor = getCurrentUserName();
    const fechaActual = formatDateTime(new Date());
    
    const branchName = data?.data?.[0]?.branch_name || 'No disponible';
    const warehouseName = data?.data?.[0]?.warehouse_name || 'No disponible';
    const productName = data?.data?.[0]?.product_name || 'TAE';
    
    body.innerHTML = `
        <div style="padding: 10px 0;">
            <!-- Cantidad grande con color -->
            <div style="
                font-size: 5rem; 
                font-weight: 800; 
                background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 2px; 
                line-height: 1.1;
            ">
                ${formattedStock}
            </div>
            <div style="font-size: 1.1rem; color: #64748b; font-weight: 500; margin-bottom: 16px;">
                📱 ${productName}
            </div>
            
            <!-- Línea divisoria -->
            <div style="border-top: 2px solid #e2e8f0; margin: 16px 0;"></div>
            
            <!-- Información de ubicación con iconos -->
            <div style="
                display: flex; 
                justify-content: center; 
                gap: 24px; 
                font-size: 0.9rem; 
                color: #475569; 
                flex-wrap: wrap;
                background: #f8fafc;
                padding: 12px;
                border-radius: 8px;
            ">
                <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 1.2rem;">🏪</span> 
                    ${branchName}
                </span>
                <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 1.2rem;">🏭</span> 
                    ${warehouseName}
                </span>
            </div>
        </div>
    `;
}

async function openTaeModal() {
    let modal = document.getElementById('taeModal');
    if (modal) {
        modal.classList.add('active');
        if (!taeData) {
            await loadTaeInventory();
        }
        renderTaeModal(taeData);
        return;
    }
    
    if (!taeData) {
        await loadTaeInventory();
    }
    
    modal = document.createElement('div');
    modal.id = 'taeModal';
    modal.className = 'modal-tae active';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);">
                <h3 style="display: flex; align-items: center; gap: 10px; margin: 0; font-size: 1.1rem;">
                    <span>📱</span>
                    <span>Inventario TAE</span>
                </h3>
                <button class="close-modal" id="closeTaeModal" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                ">&times;</button>
            </div>
            <div class="modal-body" id="taeModalBody" style="padding: 24px; text-align: center; min-height: 140px;">
                <div class="tae-loading">
                    <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
                    <p style="color: #64748b; margin: 0;">Cargando...</p>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0;">
                <button id="taeCapturaBtn" style="
                    background: linear-gradient(135deg, #dc2626, #ef4444);
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                ">
                    📸 Capturar
                </button>
                <button id="taeRefreshBtn" style="
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                ">
                    🔄 Actualizar
                </button>
                <button id="taeCloseBtn" style="
                    background: #64748b;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                ">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeTaeModal').addEventListener('click', closeTaeModal);
    document.getElementById('taeCloseBtn').addEventListener('click', closeTaeModal);
    document.getElementById('taeRefreshBtn').addEventListener('click', async function() {
        renderTaeLoading();
        await loadTaeInventory();
        renderTaeModal(taeData);
    });
    document.getElementById('taeCapturaBtn').addEventListener('click', tomarCapturaTAE);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeTaeModal();
    });
    
    renderTaeModal(taeData);
}

function closeTaeModal() {
    const modal = document.getElementById('taeModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function initTaeModal() {
    console.log('📱 Inicializando TAE Modal...');
    
    cargarHtml2Canvas().catch(() => console.warn('⚠️ html2canvas no cargado'));
    
    const btnTae = document.getElementById('btnTaeInventory');
    
    if (btnTae) {
        const newBtn = btnTae.cloneNode(true);
        btnTae.parentNode.replaceChild(newBtn, btnTae);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en botón TAE');
            openTaeModal();
        });
        console.log('✅ Evento click asignado al botón TAE');
    } else {
        console.warn('⚠️ Botón TAE no encontrado');
    }
    
    setTimeout(async function() {
        await loadTaeInventory();
        
        if (taeUpdateInterval) {
            clearInterval(taeUpdateInterval);
        }
        taeUpdateInterval = setInterval(async function() {
            console.log('📱 Actualizando TAE automáticamente...');
            await loadTaeInventory();
        }, 60000);
    }, 1500);
    
    console.log('✅ TAE Modal inicializado');
}

function cleanupTaeModal() {
    if (taeUpdateInterval) {
        clearInterval(taeUpdateInterval);
        taeUpdateInterval = null;
    }
    console.log('🧹 TAE Modal limpiado');
}

// ==================== EXPORTAR ====================
window.TaeModal = {
    init: initTaeModal,
    open: openTaeModal,
    close: closeTaeModal,
    fetch: fetchTaeInventory,
    load: loadTaeInventory,
    cleanup: cleanupTaeModal,
    capturar: tomarCapturaTAE
};

console.log('📱 === TAE MODAL LISTO ===');