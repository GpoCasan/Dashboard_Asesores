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
let isUpdating = false;
let taeCurrentTotal = 0;

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

function updateTaeBadge(count, isLoading = false) {
    const badge = document.getElementById('badgeTae');
    if (!badge) return;
    
    taeCurrentTotal = count;
    
    if (isLoading) {
        badge.textContent = '...';
        badge.style.backgroundColor = '#f59e0b';
        badge.style.color = 'white';
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

async function loadTaeInventory(showLogs = true) {
    if (isUpdating) {
        if (showLogs) console.log('📱 Ya hay una actualización en curso...');
        return taeCurrentTotal;
    }
    
    isUpdating = true;
    if (showLogs) console.log('📱 Cargando inventario TAE...');
    
    // Mostrar loading en el badge
    updateTaeBadge(0, true);
    
    try {
        const data = await fetchTaeInventory();
        if (data && data.data && data.data.length > 0) {
            const totalStock = parseInt(data.data[0].quantity) || 0;
            taeData = data;
            updateTaeBadge(totalStock, false);
            if (showLogs) console.log(`📱 TAE actualizado: ${formatCurrency(totalStock)} unidades`);
            return totalStock;
        } else {
            if (showLogs) console.warn('⚠️ No se recibieron datos de TAE');
            updateTaeBadge(0, false);
            return 0;
        }
    } catch (error) {
        console.error('❌ Error cargando TAE:', error);
        updateTaeBadge(0, false);
        return 0;
    } finally {
        isUpdating = false;
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
 * FUNCIÓN DE CAPTURA - SIEMPRE ACTUALIZA ANTES DE CAPTURAR
 * ============================================================
 */
async function tomarCapturaTAE() {
    console.log('📸 Tomando captura de pantalla...');
    
    // ===== PRIMERO: ACTUALIZAR EL INVENTARIO =====
    console.log('📱 Actualizando inventario antes de capturar...');
    const btnCaptura = document.getElementById('taeCapturaBtn');
    if (btnCaptura) {
        btnCaptura.textContent = '⏳ Actualizando...';
        btnCaptura.disabled = true;
    }
    
    // Actualizar datos
    await loadTaeInventory(true);
    
    // Actualizar el modal con los datos nuevos
    renderTaeModal(taeData);
    
    // Pequeña pausa para que el DOM se actualice
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (btnCaptura) {
        btnCaptura.textContent = '📸 Capturando...';
    }
    
    if (typeof html2canvas === 'undefined') {
        await cargarHtml2Canvas();
    }
    
    try {
        // Obtener el modal completo
        const modal = document.getElementById('taeModal');
        if (!modal) {
            mostrarNotificacion('No se encontró el modal', 'error');
            if (btnCaptura) {
                btnCaptura.textContent = '📸 Capturar';
                btnCaptura.disabled = false;
            }
            return;
        }
        
        // Obtener el contenido del modal
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) {
            mostrarNotificacion('No se encontró el contenido del modal', 'error');
            if (btnCaptura) {
                btnCaptura.textContent = '📸 Capturar';
                btnCaptura.disabled = false;
            }
            return;
        }
        
        const nombreAsesor = getCurrentUserName();
        
        // ===== CAPTURAR DIRECTAMENTE EL MODAL VISIBLE =====
        // Primero, asegurar que el modal esté visible y en su posición
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        
        // Forzar que el modal esté en la posición correcta para la captura
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '10000';
        modal.style.backgroundColor = 'rgba(0,0,0,0.01)';
        
        // Asegurar que el contenido esté centrado
        modalContent.style.position = 'relative';
        modalContent.style.margin = 'auto';
        modalContent.style.top = '50%';
        modalContent.style.transform = 'translateY(-50%)';
        
        // Pequeña pausa para que los estilos se apliquen
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Capturar con html2canvas - capturar SOLO el contenido del modal
        const canvas = await html2canvas(modalContent, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: modalContent.scrollWidth,
            height: modalContent.scrollHeight,
            onclone: function(doc) {
                // HEADER: letras blancas totalmente
                const headerEl = doc.querySelector('.modal-header');
                if (headerEl) {
                    headerEl.style.background = 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)';
                    headerEl.style.color = 'white';
                    // Forzar que todos los textos del header sean blancos
                    const headerTexts = headerEl.querySelectorAll('*');
                    headerTexts.forEach(el => {
                        el.style.color = 'white !important';
                    });
                    // Forzar el h3
                    const h3 = headerEl.querySelector('h3');
                    if (h3) {
                        h3.style.color = 'white';
                        h3.style.setProperty('color', 'white', 'important');
                    }
                    // Forzar el span
                    const spans = headerEl.querySelectorAll('span');
                    spans.forEach(span => {
                        span.style.color = 'white';
                        span.style.setProperty('color', 'white', 'important');
                    });
                }
                
                // NÚMERO: solo letras moradas, sin fondo
                const numEl = doc.querySelector('.modal-body div div:first-child');
                if (numEl) {
                    // Quitar cualquier fondo
                    numEl.style.background = 'none';
                    numEl.style.webkitBackgroundClip = 'unset';
                    numEl.style.webkitTextFillColor = '#7c3aed';
                    numEl.style.backgroundClip = 'unset';
                    numEl.style.color = '#7c3aed';
                    numEl.style.fontSize = '5rem';
                    numEl.style.fontWeight = '800';
                    numEl.style.lineHeight = '1.1';
                    numEl.style.marginBottom = '2px';
                }
                
                // Asegurar que el footer no se muestre (los botones)
                const footerEl = doc.querySelector('.modal-footer');
                if (footerEl) {
                    footerEl.style.display = 'none';
                }
            }
        });
        
        // Restaurar estilos originales del modal
        modal.style.position = '';
        modal.style.top = '';
        modal.style.left = '';
        modal.style.width = '';
        modal.style.height = '';
        modal.style.zIndex = '';
        modal.style.backgroundColor = '';
        modalContent.style.position = '';
        modalContent.style.margin = '';
        modalContent.style.top = '';
        modalContent.style.transform = '';
        
        // Crear un nuevo canvas para agregar la barra de asesor y el footer
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        
        // Configurar dimensiones
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const footerHeight = 90; // Aumentado para el nombre más grande
        const totalHeight = imgHeight + footerHeight;
        
        finalCanvas.width = imgWidth;
        finalCanvas.height = totalHeight;
        
        // Dibujar la captura del modal
        ctx.drawImage(canvas, 0, 0);
        
        // ===== AGREGAR BARRA DE ASESOR EN LA PARTE INFERIOR =====
        const fechaHora = formatDateTime(new Date());
        
        // Fondo de la barra (gradiente)
        const gradient = ctx.createLinearGradient(0, imgHeight, 0, totalHeight);
        gradient.addColorStop(0, '#f5f3ff');
        gradient.addColorStop(1, '#ede9fe');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, imgHeight, imgWidth, footerHeight);
        
        // Línea superior morada
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(0, imgHeight, imgWidth, 3);
        
        // Configurar texto
        ctx.textBaseline = 'middle';
        
        // ===== INFORMACIÓN DEL ASESOR (IZQUIERDA) - NOMBRE MÁS GRANDE =====
        ctx.textAlign = 'left';
        
        // Badge ASESOR
        const badgeX = 24;
        const badgeY = imgHeight + footerHeight / 2;
        const badgeWidth = 80;
        const badgeHeight = 32;
        const radius = 20;
        
        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY - badgeHeight/2);
        ctx.lineTo(badgeX + badgeWidth - radius, badgeY - badgeHeight/2);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY - badgeHeight/2, badgeX + badgeWidth, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight/2, badgeX + badgeWidth - radius, badgeY + badgeHeight/2);
        ctx.lineTo(badgeX + radius, badgeY + badgeHeight/2);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight/2, badgeX, badgeY);
        ctx.quadraticCurveTo(badgeX, badgeY - badgeHeight/2, badgeX + radius, badgeY - badgeHeight/2);
        ctx.closePath();
        ctx.fillStyle = '#8b5cf6';
        ctx.fill();
        
        // Texto del badge
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👤 ASESOR', badgeX + badgeWidth/2, badgeY + 1);
        
        // ===== NOMBRE DEL ASESOR - MÁS GRANDE =====
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4c1d95';
        ctx.font = 'bold 18px "Segoe UI", sans-serif'; // Tamaño aumentado de 14 a 18
        ctx.fillText(nombreAsesor, badgeX + badgeWidth + 16, badgeY + 1);
        
        // ===== FECHA (DERECHA) =====
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '600 12px "Segoe UI", sans-serif';
        
        // Badge de fecha
        const dateBadgeX = imgWidth - 24;
        const dateBadgeY = imgHeight + footerHeight / 2;
        const dateBadgeWidth = 180;
        const dateBadgeHeight = 32;
        
        ctx.beginPath();
        ctx.moveTo(dateBadgeX - dateBadgeWidth + radius, dateBadgeY - dateBadgeHeight/2);
        ctx.lineTo(dateBadgeX - radius, dateBadgeY - dateBadgeHeight/2);
        ctx.quadraticCurveTo(dateBadgeX, dateBadgeY - dateBadgeHeight/2, dateBadgeX, dateBadgeY);
        ctx.quadraticCurveTo(dateBadgeX, dateBadgeY + dateBadgeHeight/2, dateBadgeX - radius, dateBadgeY + dateBadgeHeight/2);
        ctx.lineTo(dateBadgeX - dateBadgeWidth + radius, dateBadgeY + dateBadgeHeight/2);
        ctx.quadraticCurveTo(dateBadgeX - dateBadgeWidth, dateBadgeY + dateBadgeHeight/2, dateBadgeX - dateBadgeWidth, dateBadgeY);
        ctx.quadraticCurveTo(dateBadgeX - dateBadgeWidth, dateBadgeY - dateBadgeHeight/2, dateBadgeX - dateBadgeWidth + radius, dateBadgeY - dateBadgeHeight/2);
        ctx.closePath();
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        
        // Texto de la fecha
        ctx.fillStyle = '#475569';
        ctx.font = '600 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`📅 ${fechaHora}`, dateBadgeX - dateBadgeWidth/2, dateBadgeY + 1);
        
        // ===== AGREGAR FOOTER =====
        const footerY = imgHeight + footerHeight;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b5cf6';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillText('SERVICEL - Grupo Casan © 2026', imgWidth/2, footerY + 28);
        
        // Descargar imagen
        const link = document.createElement('a');
        link.download = `TAE_${nombreAsesor.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = finalCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        if (btnCaptura) {
            btnCaptura.textContent = '📸 Capturar';
            btnCaptura.disabled = false;
        }
        
        mostrarNotificacion('✅ Captura guardada', 'success');
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarNotificacion('❌ Error al capturar: ' + error.message, 'error');
        
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
            <span style="margin-left: 16px; color: #64748b; font-weight: 500;">Actualizando...</span>
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
            
            <!-- Fecha de actualización -->
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 12px;">
                Actualizado: ${fechaActual}
            </div>
        </div>
    `;
}

/**
 * ============================================================
 * ABRIR MODAL - SIEMPRE ACTUALIZA ANTES DE ABRIR
 * ============================================================
 */
async function openTaeModal() {
    console.log('📱 Abriendo modal TAE - Actualizando inventario...');
    
    // ===== PRIMERO: ACTUALIZAR EL INVENTARIO =====
    // Mostrar loading en el badge
    updateTaeBadge(0, true);
    
    // Cargar datos actualizados
    await loadTaeInventory(true);
    
    // Restaurar color del badge
    if (taeCurrentTotal > 0) {
        updateTaeBadge(taeCurrentTotal, false);
    } else {
        updateTaeBadge(0, false);
    }
    
    let modal = document.getElementById('taeModal');
    if (modal) {
        modal.classList.add('active');
        renderTaeModal(taeData);
        return;
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
        await loadTaeInventory(true);
        renderTaeModal(taeData);
        // Actualizar badge
        if (taeCurrentTotal > 0) {
            updateTaeBadge(taeCurrentTotal, false);
        }
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
        await loadTaeInventory(true);
        
        if (taeUpdateInterval) {
            clearInterval(taeUpdateInterval);
        }
        taeUpdateInterval = setInterval(async function() {
            console.log('📱 Actualizando TAE automáticamente...');
            await loadTaeInventory(false);
        }, 300000);
    }, 1500);
    
    console.log('✅ TAE Modal inicializado');
}

function cleanupTaeModal() {
    if (taeUpdateInterval) {
        clearInterval(taeUpdateInterval);
        taeUpdateInterval = null;
    }
    isUpdating = false;
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
    capturar: tomarCapturaTAE,
    getTotal: function() { return taeCurrentTotal; }
};

console.log('📱 === TAE MODAL LISTO ===');