// ==================== MÓDULO: CONSULTA DE CANCELACIONES DE VENTAS (SOLO INICIADO) ====================

console.log('🗑️ Cargando módulo de cancelaciones...');

let cancelacionesCargadas = false;
let cancelacionesInicializadas = false;
let cachedCancelacionesData = null;
let cachedBranchId = null;
let cachedUserId = null;

// Token de administrador (mismo que en transferencias.js)
const ADMIN_TOKEN = '87924|XoV4ZRpYQ69rF89PiZnAqggd1VmO8WjtOU4pXWwC';

// ==================== FUNCIÓN PRINCIPAL ====================

async function verificarCancelacionesPendientes(forzar = false) {
    console.log('🗑️ verificarCancelacionesPendientes() llamado - forzar:', forzar);

    // Si hay caché y no se fuerza, mostrar los datos en caché
    if (!forzar && cancelacionesCargadas && cachedCancelacionesData) {
        console.log('📦 Mostrando cancelaciones en caché...');
        mostrarModalCancelaciones(cachedCancelacionesData);
        return;
    }

    console.log('📦 Consultando cancelaciones de ventas (solo INICIADO)...');

    try {
        // 1. Obtener usuario y su sucursal
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        console.log('👤 Usuario obtenido:', user);
        
        if (!user || !user.id) {
            console.warn('⚠️ Usuario no disponible');
            mostrarErrorGenerico('No se pudo obtener la información del usuario.');
            return;
        }

        const branches = window.getUserBranches ? window.getUserBranches() : [];
        console.log('🏪 Sucursales del usuario:', branches);
        
        if (!branches || branches.length === 0) {
            console.warn('⚠️ Usuario sin sucursal asignada');
            mostrarSinSucursal();
            return;
        }

        const userBranch = branches[0];
        const branchId = userBranch.id || userBranch.branch_id;
        const userId = user.id;

        cachedBranchId = branchId;
        cachedUserId = userId;

        console.log(`🏪 Sucursal ID: ${branchId}, Usuario ID: ${userId}`);

        // 2. Configurar URL base
        const API_CANCELACIONES = 'https://sales.gcasan.com/api/sale-cancellation-requests';

        // 3. Paginación para obtener TODOS los registros
        let allRequests = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
            const url = `${API_CANCELACIONES}?page=${currentPage}&per_page=100&branch_ids[]=${branchId}&user_ids[]=${userId}`;
            console.log(`📡 Consultando página ${currentPage}:`, url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ Error al consultar cancelaciones: ${response.status}`);
                mostrarErrorGenerico(`Error ${response.status}: ${response.statusText}`);
                return;
            }

            const data = await response.json();
            console.log(`📊 Respuesta página ${currentPage}:`, data);
            
            const items = data.data || [];

            if (currentPage === 1) {
                lastPage = data.last_page || data.meta?.last_page || 1;
                const total = data.total || items.length;
                console.log(`📊 Total de cancelaciones en la API: ${total}`);
            }

            allRequests.push(...items);
            currentPage++;

            await new Promise(resolve => setTimeout(resolve, 200));

        } while (currentPage <= lastPage);

        console.log(`✅ ${allRequests.length} cancelaciones totales obtenidas`);

        // ===== FILTRO: SOLO "Iniciado" =====
        // Solo se muestran las que tienen status "Iniciado" (case insensitive)
        const filteredRequests = allRequests.filter(item => {
            const status = (item.status || '').toLowerCase();
            return status === 'iniciado' || status === 'initiated';
        });

        console.log(`✅ ${filteredRequests.length} cancelaciones con status "INICIADO" encontradas`);

        // Actualizar badge SOLO si hay datos
        actualizarBadgeCancelaciones(filteredRequests.length);

        if (filteredRequests.length === 0) {
            console.log('✅ No hay cancelaciones con status "Iniciado"');
            mostrarSinCancelaciones();
            return;
        }

        // 4. Guardar en caché y mostrar modal
        cachedCancelacionesData = {
            total: filteredRequests.length,
            totalAll: allRequests.length,
            items: filteredRequests,
            branchId: branchId,
            userId: userId
        };
        cancelacionesCargadas = true;

        mostrarModalCancelaciones(cachedCancelacionesData);

    } catch (error) {
        console.error('❌ Error consultando cancelaciones:', error);
        mostrarErrorGenerico(error.message);
    }
}

// ==================== ACTUALIZAR BADGE ====================

function actualizarBadgeCancelaciones(cantidad) {
    const badge = document.getElementById('badgeCancelaciones');
    console.log('🔔 Actualizando badge cancelaciones:', cantidad, 'Badge encontrado:', !!badge);
    
    if (!badge) return;

    if (cantidad > 0) {
        badge.textContent = cantidad;
        badge.style.display = 'block';
        badge.classList.add('show');
        badge.style.animation = 'none';
        setTimeout(() => {
            badge.style.animation = 'badgePulse 0.5s ease';
        }, 10);
    } else {
        badge.style.display = 'none';
        badge.classList.remove('show');
    }
}

// ==================== FUNCIONES DE FORMATO ====================

function formatFechaCancelacion(fechaStr) {
    if (!fechaStr) return 'No disponible';
    try {
        const date = new Date(fechaStr);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return fechaStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFolio(id) {
    return String(id).padStart(6, '0');
}

// ==================== MOSTRAR MODAL ====================

function mostrarModalCancelaciones(data) {
    console.log('🗑️ Mostrando modal de cancelaciones con', data.items.length, 'items con status "INICIADO"');
    
    const modalExistente = document.getElementById('modalCancelaciones');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modalCancelaciones';
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    // Generar tabla de cancelaciones (solo INICIADO)
    let tablaHtml = '';
    if (data.items.length === 0) {
        tablaHtml = '<div style="text-align:center; padding:30px; color:#94a3b8;">No hay solicitudes de cancelación con status "Iniciado".</div>';
    } else {
        tablaHtml = `
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                <thead>
                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                        <th style="padding:10px; text-align:left;"># Solicitud</th>
                        <th style="padding:10px; text-align:left;">Venta</th>
                        <th style="padding:10px; text-align:left;">Fecha</th>
                        <th style="padding:10px; text-align:left;">Motivo</th>
                        <th style="padding:10px; text-align:left;">Nota</th>
                        <th style="padding:10px; text-align:center;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(item => {
                        // Todos son "Iniciado", pero por si acaso
                        let statusColor = '#3b82f6';
                        let statusLabel = '🚀 Iniciado';

                        return `
                            <tr style="border-bottom:1px solid #e2e8f0;">
                                <td style="padding:10px; font-weight:600; color:#1e40af;">#${item.id || 'N/A'}</td>
                                <td style="padding:10px;">
                                    <a href="https://sales.gcasan.com/api/sales/${item.sale_id || item.sale?.id || 'N/A'}/receipt" 
                                       target="_blank" 
                                       style="color: #3b82f6; text-decoration: none; font-weight: 600; padding: 4px 12px; background: #eff6ff; border-radius: 4px; border: 1px solid #bfdbfe; transition: all 0.2s; display: inline-block;"
                                       onmouseover="this.style.background='#bfdbfe'"
                                       onmouseout="this.style.background='#eff6ff'">
                                        #${formatFolio(item.sale_id || item.sale?.id || 0)} 🧾
                                    </a>
                                </td>
                                <td style="padding:10px;">${formatFechaCancelacion(item.created_at || item.requested_at)}</td>
                                <td style="padding:10px;">${escapeHtml(item.reason?.name || item.motivo || 'Sin especificar')}</td>
                                <td style="padding:10px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(item.note || '')}">
                                    ${escapeHtml(item.note || '-')}
                                </td>
                                <td style="padding:10px; text-align:center;">
                                    <span style="
                                        background: ${statusColor}20;
                                        color: ${statusColor};
                                        padding: 2px 12px;
                                        border-radius: 12px;
                                        font-size: 0.7rem;
                                        border: 1px solid ${statusColor}40;
                                    ">
                                        ${statusLabel}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; animation: modalFadeIn 0.3s ease-out;">
            <div class="modal-header" style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);">
                <h3 style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.8rem;">🚀</span>
                    <span>Solicitudes de Cancelación - Iniciadas</span>
                </h3>
                <span class="close-modal" id="cerrarModalCancelaciones" style="font-size: 32px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">
                    <div style="background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; border: 2px solid #3b82f6;">
                        <div style="font-size: 2rem; font-weight: 800; color: #3b82f6;">${data.total}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">🚀 Iniciadas</div>
                    </div>
                    <div style="background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e2e8f0;">
                        <div style="font-size: 2rem; font-weight: 800; color: #1e40af;">${data.totalAll}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">📊 Total en sistema</div>
                    </div>
                </div>
                <div style="border-top: 2px solid #e2e8f0; padding-top: 12px;">
                    ${tablaHtml}
                </div>
                ${data.total > 0 ? `
                    <div style="margin-top: 12px; font-size: 0.75rem; color: #94a3b8; text-align: center;">
                        💡 Mostrando solo solicitudes con status <strong>"INICIADO"</strong>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button id="btnActualizarCancelaciones" style="
                    background: #1e40af;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    🔄 Actualizar
                </button>
                <button id="btnCerrarModalCancelaciones" style="
                    background: #64748b;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Eventos de cierre
    document.getElementById('cerrarModalCancelaciones').addEventListener('click', cerrarModalCancelaciones);
    document.getElementById('btnCerrarModalCancelaciones').addEventListener('click', cerrarModalCancelaciones);

    // Evento actualizar
    document.getElementById('btnActualizarCancelaciones').addEventListener('click', function() {
        cancelacionesCargadas = false;
        cachedCancelacionesData = null;
        cerrarModalCancelaciones();
        setTimeout(() => verificarCancelacionesPendientes(true), 300);
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) cerrarModalCancelaciones();
    });
}

// ==================== MENSAJES DE ESTADO ====================

function mostrarSinCancelaciones() {
    const modal = document.getElementById('modalCancelaciones');
    if (modal) modal.remove();

    const newModal = document.createElement('div');
    newModal.id = 'modalCancelaciones';
    newModal.className = 'modal';
    newModal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    newModal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; animation: modalFadeIn 0.3s ease-out;">
            <div class="modal-header" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                <h3 style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.8rem;">✅</span>
                    <span>Sin Cancelaciones Pendientes</span>
                </h3>
                <span class="close-modal" onclick="cerrarModalCancelaciones()" style="font-size: 32px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 16px;">🗑️</div>
                <div style="font-size: 1.2rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
                    No hay solicitudes pendientes
                </div>
                <div style="color: #64748b; font-size: 0.9rem;">
                    No se encontraron solicitudes de cancelación pendientes de aprobación.
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalCancelaciones()" style="
                    background: #059669;
                    color: white;
                    border: none;
                    padding: 8px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    Entendido
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(newModal);
    newModal.addEventListener('click', function(e) {
        if (e.target === newModal) cerrarModalCancelaciones();
    });
}

function mostrarSinSucursal() {
    const modal = document.getElementById('modalCancelaciones');
    if (modal) modal.remove();

    const newModal = document.createElement('div');
    newModal.id = 'modalCancelaciones';
    newModal.className = 'modal';
    newModal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    newModal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">
                <h3>⚠️ Sin Sucursal Asignada</h3>
                <span class="close-modal" onclick="cerrarModalCancelaciones()" style="font-size: 32px; cursor: pointer;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 16px;">🏪</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">No tienes una sucursal asignada</div>
                <div style="color: #64748b; font-size: 0.9rem;">Para consultar cancelaciones, necesitas tener una sucursal asignada.</div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalCancelaciones()" style="background: #64748b; color: white; border: none; padding: 8px 30px; border-radius: 8px; cursor: pointer;">Entendido</button>
            </div>
        </div>
    `;

    document.body.appendChild(newModal);
    newModal.addEventListener('click', function(e) { if (e.target === newModal) cerrarModalCancelaciones(); });
}

function mostrarErrorGenerico(mensaje) {
    const modal = document.getElementById('modalCancelaciones');
    if (modal) modal.remove();

    const newModal = document.createElement('div');
    newModal.id = 'modalCancelaciones';
    newModal.className = 'modal';
    newModal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    newModal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
                <h3>❌ Error</h3>
                <span class="close-modal" onclick="cerrarModalCancelaciones()" style="font-size: 32px; cursor: pointer;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Error al consultar cancelaciones</div>
                <div style="color: #64748b; font-size: 0.9rem;">${escapeHtml(mensaje || 'Error desconocido')}</div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalCancelaciones()" style="background: #64748b; color: white; border: none; padding: 8px 30px; border-radius: 8px; cursor: pointer;">Entendido</button>
            </div>
        </div>
    `;

    document.body.appendChild(newModal);
    newModal.addEventListener('click', function(e) { if (e.target === newModal) cerrarModalCancelaciones(); });
}

// ==================== CERRAR MODAL ====================

function cerrarModalCancelaciones() {
    const modal = document.getElementById('modalCancelaciones');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

// ==================== ABRIR MODAL DESDE BOTÓN ====================

function abrirModalCancelaciones() {
    console.log('🗑️ abrirModalCancelaciones() llamado');
    
    if (cancelacionesCargadas && cachedCancelacionesData) {
        console.log('📦 Mostrando cancelaciones en caché...');
        mostrarModalCancelaciones(cachedCancelacionesData);
    } else {
        console.log('📦 No hay caché, consultando...');
        verificarCancelacionesPendientes(true);
    }
}

// ==================== INICIALIZACIÓN ====================

function initCancelacionesModule() {
    console.log('🗑️ initCancelacionesModule() llamado');
    
    if (cancelacionesInicializadas) {
        console.log('⏳ Módulo de cancelaciones ya inicializado');
        return;
    }

    cancelacionesInicializadas = true;
    console.log('🔔 Inicializando módulo de cancelaciones (sin consulta automática)...');

    const btnCancelaciones = document.getElementById('btnCancelaciones');
    console.log('🔍 Botón de cancelaciones encontrado:', !!btnCancelaciones);
    
    if (btnCancelaciones) {
        // Remover listeners anteriores para evitar duplicados
        const newBtn = btnCancelaciones.cloneNode(true);
        btnCancelaciones.parentNode.replaceChild(newBtn, btnCancelaciones);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en botón de cancelaciones');
            abrirModalCancelaciones();
        });
        console.log('✅ Evento click asignado al botón de cancelaciones');
    } else {
        console.warn('⚠️ Botón de cancelaciones no encontrado (id="btnCancelaciones")');
    }

    // NO se consulta automáticamente - solo se asigna el evento click
    console.log('✅ Módulo de cancelaciones listo. Esperando clic del usuario.');
    
}

// ==================== EXPORTAR FUNCIONES GLOBALES ====================
window.initCancelacionesModule = initCancelacionesModule;
window.verificarCancelacionesPendientes = verificarCancelacionesPendientes;
window.cerrarModalCancelaciones = cerrarModalCancelaciones;
window.abrirModalCancelaciones = abrirModalCancelaciones;

console.log('🗑️ Módulo de cancelaciones cargado correctamente');

// ==================== ANIMACIÓN BADGE ====================
(function agregarAnimacionBadge() {
    const styleId = 'badgeAnimationStyle';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        @keyframes badgePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.5); }
            100% { transform: scale(1); }
        }
        @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
})();

// ==================== LIMPIAR CACHÉ ====================

function limpiarCacheCancelaciones() {
    cancelacionesCargadas = false;
    cachedCancelacionesData = null;
    console.log('🧹 Caché de cancelaciones limpiado');
}

// Exportar función de limpieza
window.limpiarCacheCancelaciones = limpiarCacheCancelaciones;