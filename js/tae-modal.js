/**
 * Módulo para gestionar el inventario de TAE - Modal Simplificado con carga automática
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

// Token fijo de administrador
const TAE_ADMIN_TOKEN = '87924|XoV4ZRpYQ69rF89PiZnAqggd1VmO8WjtOU4pXWwC';

// Variables
let taeData = null;
let taeUpdateInterval = null;

// ==================== FUNCIONES ====================

/**
 * Obtiene los IDs del usuario
 */
function getUserIds() {
    let branchId = null;
    let warehouseId = null;
    
    // Intentar desde window.currentUser
    const user = window.currentUser || (window.getCurrentUser ? window.getCurrentUser() : null);
    
    if (user) {
        branchId = user.branch_id || user.sucursal_id || user.branchId;
        warehouseId = user.warehouse_id || user.almacen_id || user.warehouseId;
    }
    
    // Si no hay, intentar desde window.userBranches y window.userWarehouses
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
    
    // Si aún no hay, intentar desde sessionStorage
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

/**
 * Formatea un número como moneda con separador de miles
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX').format(value);
}

/**
 * Obtiene el inventario TAE
 */
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

/**
 * Actualiza el badge del botón
 */
function updateTaeBadge(count) {
    const badge = document.getElementById('badgeTae');
    if (!badge) {
        console.warn('⚠️ Badge TAE no encontrado');
        return;
    }
    
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

/**
 * Carga el inventario TAE y actualiza el badge
 */
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

/**
 * Abre el modal con el inventario TAE
 */
async function openTaeModal() {
    // Verificar si ya existe el modal
    let modal = document.getElementById('taeModal');
    if (modal) {
        modal.classList.add('active');
        // Si no hay datos, cargarlos
        if (!taeData) {
            await loadTaeInventory();
        }
        renderTaeModal(taeData);
        return;
    }
    
    // Si no hay datos, cargarlos
    if (!taeData) {
        await loadTaeInventory();
    }
    
    // Crear el modal
    modal = document.createElement('div');
    modal.id = 'taeModal';
    modal.className = 'modal-tae active';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
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
            <div class="modal-body" id="taeModalBody" style="padding: 30px 24px; text-align: center; min-height: 120px;">
                <div class="tae-loading">
                    <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
                    <p style="color: #64748b; margin: 0;">Cargando...</p>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; gap: 10px; padding: 16px 24px; border-top: 1px solid #e2e8f0;">
                <button id="taeRefreshBtn" style="
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    padding: 8px 24px;
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
                    padding: 8px 24px;
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
    
    // Eventos
    document.getElementById('closeTaeModal').addEventListener('click', closeTaeModal);
    document.getElementById('taeCloseBtn').addEventListener('click', closeTaeModal);
    document.getElementById('taeRefreshBtn').addEventListener('click', async function() {
        renderTaeLoading();
        await loadTaeInventory();
        renderTaeModal(taeData);
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeTaeModal();
    });
    
    // Renderizar datos
    renderTaeModal(taeData);
}

/**
 * Cierra el modal
 */
function closeTaeModal() {
    const modal = document.getElementById('taeModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * Renderiza el estado de carga
 */
function renderTaeLoading() {
    const body = document.getElementById('taeModalBody');
    if (!body) return;
    
    body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; padding: 20px 0;">
            <div style="width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <span style="margin-left: 16px; color: #64748b;">Cargando...</span>
        </div>
    `;
}

/**
 * Renderiza el estado de error
 */
function renderTaeError(message) {
    const body = document.getElementById('taeModalBody');
    if (!body) return;
    
    body.innerHTML = `
        <div style="padding: 10px 0;">
            <div style="font-size: 3rem; margin-bottom: 8px;">❌</div>
            <p style="color: #64748b; margin: 0; font-size: 0.95rem;">${message}</p>
        </div>
    `;
}

/**
 * Calcula el total de stock
 */
function getTotalStock(data) {
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) return 0;
    return parseInt(data.data[0].quantity) || 0;
}

/**
 * Renderiza el modal con los datos
 */
function renderTaeModal(data) {
    const body = document.getElementById('taeModalBody');
    if (!body) return;
    
    const totalStock = getTotalStock(data);
    const formattedStock = formatCurrency(totalStock);
    
    // Obtener información de ubicación
    const branchName = data?.data?.[0]?.branch_name || 'No disponible';
    const warehouseName = data?.data?.[0]?.warehouse_name || 'No disponible';
    const productName = data?.data?.[0]?.product_name || 'TAE';
    
    body.innerHTML = `
        <div style="padding: 10px 0;">
            <!-- Cantidad grande -->
            <div style="font-size: 4.5rem; font-weight: 800; color: #7c3aed; margin-bottom: 4px; line-height: 1.1;">
                ${formattedStock}
            </div>
            <div style="font-size: 1rem; color: #64748b; margin-bottom: 16px;">
                ${productName}
            </div>
            
            <!-- Línea divisoria -->
            <div style="border-top: 2px solid #e2e8f0; margin: 12px 0;"></div>
            
            <!-- Información de ubicación -->
            <div style="display: flex; justify-content: center; gap: 20px; font-size: 0.85rem; color: #475569; flex-wrap: wrap;">
                <span>🏪 ${branchName}</span>
                <span>🏭 ${warehouseName}</span>
            </div>
            
            <!-- Fecha de actualización -->
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 8px;">
                Actualizado: ${new Date().toLocaleString('es-MX')}
            </div>
        </div>
    `;
}

/**
 * Inicializa el módulo TAE - Carga el inventario automáticamente
 */
function initTaeModal() {
    console.log('📱 Inicializando TAE Modal...');
    
    const btnTae = document.getElementById('btnTaeInventory');
    
    if (btnTae) {
        // Remover listeners anteriores
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
        console.warn('⚠️ Botón TAE no encontrado (id="btnTaeInventory")');
    }
    
    // ===== CARGAR INVENTARIO AUTOMÁTICAMENTE =====
    console.log('📱 Cargando inventario TAE automáticamente...');
    
    // Cargar después de 1.5 segundos para asegurar que el usuario esté listo
    setTimeout(async function() {
        await loadTaeInventory();
        
        // Programar actualización cada 60 segundos
        if (taeUpdateInterval) {
            clearInterval(taeUpdateInterval);
        }
        taeUpdateInterval = setInterval(async function() {
            console.log('📱 Actualizando TAE automáticamente...');
            await loadTaeInventory();
        }, 60000); // 60 segundos
    }, 1500);
    
    console.log('✅ TAE Modal inicializado');
}

/**
 * Limpia los recursos del módulo TAE
 */
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
    cleanup: cleanupTaeModal
};

console.log('📱 === TAE MODAL LISTO ===');