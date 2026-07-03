// ==================== ALERTA DE TRANSFERENCIAS PENDIENTES (MODAL CON PESTAÑAS POR ALMACÉN, FILTRO POR SUCURSAL Y ALMACÉN) ====================

let alertaTransferenciasCargada = false;
let alertaTransferenciasInicializada = false;
let cachedTransferenciasData = null;

// ==================== FUNCIÓN PRINCIPAL ====================

async function verificarTransferenciasPendientes(forzar = false) {
    // Si se fuerza o no hay datos en caché, consultar nuevamente
    if (!forzar && alertaTransferenciasCargada && cachedTransferenciasData) {
        console.log('📦 Mostrando datos en caché...');
        mostrarModalTransferencias(cachedTransferenciasData);
        return;
    }

    console.log('📦 Verificando transferencias pendientes...');

    try {
        // 1. Obtener usuario y sus sucursal/almacén
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user || !user.id) {
            console.warn('⚠️ Usuario no disponible');
            return;
        }

        const branches = window.getUserBranches ? window.getUserBranches() : [];
        const warehouses = window.getUserWarehouses ? window.getUserWarehouses() : [];

        if (!branches || branches.length === 0) {
            console.warn('⚠️ Usuario sin sucursal asignada');
            mostrarSinSucursal();
            return;
        }

        if (!warehouses || warehouses.length === 0) {
            console.warn('⚠️ Usuario sin almacén asignado');
            mostrarSinAlmacen();
            return;
        }

        const userBranch = branches[0];
        const userBranchId = userBranch.id || userBranch.branch_id;
        const userBranchName = userBranch.name || userBranch.branch_name || 'Sin sucursal';

        const userWarehouse = warehouses[0];
        const userWarehouseId = userWarehouse.id || userWarehouse.warehouse_id;

        console.log('🏪 Sucursal:', userBranchName, '(ID:', userBranchId + ')');
        console.log('🏭 Almacén ID:', userWarehouseId);

        if (!CONFIG.API_TRANSFERS) {
            console.error('❌ CONFIG.API_TRANSFERS no está definido');
            mostrarErrorGenerico('API de transferencias no configurada');
            return;
        }

        // 2. Token fijo de administrador
        const ADMIN_TOKEN = '87924|XoV4ZRpYQ69rF89PiZnAqggd1VmO8WjtOU4pXWwC';

        // 3. Obtener todas las transferencias en tránsito filtradas por target_branch_id y target_warehouse_id
        let allTransfers = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
            const url = `${CONFIG.API_TRANSFERS}?page=${currentPage}&per_page=100&status=En+tr%C3%A1nsito&target_branch_id=${userBranchId}&target_warehouse_id=${userWarehouseId}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ Error al consultar transferencias: ${response.status}`);
                mostrarErrorGenerico(`Error ${response.status}: ${response.statusText}`);
                return;
            }

            const data = await response.json();
            const transfers = data.data || [];

            if (currentPage === 1) {
                lastPage = data.last_page || data.meta?.last_page || 1;
            }

            allTransfers.push(...transfers);
            currentPage++;

            await new Promise(resolve => setTimeout(resolve, 200));

        } while (currentPage <= lastPage);

        console.log(`✅ ${allTransfers.length} transferencias en tránsito encontradas`);

        // Actualizar badge (opcional)
        actualizarBadgeTransferencias(allTransfers.length);

        if (allTransfers.length === 0) {
            console.log('✅ No hay transferencias pendientes');
            mostrarSinTransferencias();
            return;
        }

        // 4. Clasificar por almacén origen (TAE, Equipos Matriz, Accesorios Matriz, Otros)
        const almacenesMap = new Map();

        allTransfers.forEach(transfer => {
            let almacenOrigen = 'Otros';
            if (transfer.origin_warehouse?.name) {
                const nombreAlmacen = transfer.origin_warehouse.name.toLowerCase();
                if (nombreAlmacen.includes('tae')) {
                    almacenOrigen = 'TAE';
                } else if (nombreAlmacen.includes('equipos matriz') || nombreAlmacen.includes('equipos matrix')) {
                    almacenOrigen = 'Equipos Matriz';
                } else if (nombreAlmacen.includes('accesorios matriz') || nombreAlmacen.includes('accesorios matrix')) {
                    almacenOrigen = 'Accesorios Matriz';
                }
            }

            let tiendaNombre = 'Sin tienda asignada';
            if (transfer.target_warehouse?.branch?.name) {
                tiendaNombre = transfer.target_warehouse.branch.name;
            } else if (transfer.target_warehouse?.name) {
                tiendaNombre = transfer.target_warehouse.name;
            }

            const fecha = transfer.dispatched_at ? formatDateOnly(transfer.dispatched_at) :
                          transfer.created_at ? formatDateOnly(transfer.created_at) : 'No disponible';

            if (!almacenesMap.has(almacenOrigen)) {
                almacenesMap.set(almacenOrigen, new Map());
            }

            const tiendasMap = almacenesMap.get(almacenOrigen);
            if (!tiendasMap.has(tiendaNombre)) {
                tiendasMap.set(tiendaNombre, {
                    tienda: tiendaNombre,
                    cantidad: 0,
                    transferencias: []
                });
            }

            const tienda = tiendasMap.get(tiendaNombre);
            tienda.cantidad++;
            tienda.transferencias.push({
                id: transfer.id,
                origen: transfer.origin_warehouse?.name || 'No disponible',
                fecha: fecha,
                status: transfer.status || 'En tránsito'
            });
        });

        // 5. Construir estructura final
        const resultado = {
            total: allTransfers.length,
            sucursal: userBranchName,
            almacenes: {}
        };

        const ordenAlmacenes = ['TAE', 'Equipos Matriz', 'Accesorios Matriz', 'Otros'];

        for (const almacen of ordenAlmacenes) {
            if (almacenesMap.has(almacen)) {
                const tiendasMap = almacenesMap.get(almacen);
                const tiendas = Array.from(tiendasMap.values())
                    .sort((a, b) => a.tienda.localeCompare(b.tienda));

                resultado.almacenes[almacen] = {
                    tiendas: tiendas,
                    totalTiendas: tiendas.length,
                    totalTransferencias: tiendas.reduce((sum, t) => sum + t.cantidad, 0)
                };
            }
        }

        cachedTransferenciasData = resultado;
        alertaTransferenciasCargada = true;

        // 6. Mostrar modal
        mostrarModalTransferencias(resultado);

    } catch (error) {
        console.error('❌ Error verificando transferencias:', error);
        mostrarErrorGenerico(error.message);
    }
}

// ==================== BADGE (OPCIONAL) ====================

function actualizarBadgeTransferencias(cantidad) {
    const badge = document.getElementById('badgeTransferencias');
    if (!badge) return;

    if (cantidad > 0) {
        badge.textContent = cantidad;
        badge.style.display = 'block';
        badge.style.animation = 'none';
        setTimeout(() => {
            badge.style.animation = 'badgePulse 0.5s ease';
        }, 10);
    } else {
        badge.style.display = 'none';
    }
}

// ==================== FUNCIONES DE FORMATO (ya existentes) ====================

function formatDateOnly(dateStr) {
    if (!dateStr) return 'No disponible';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== MOSTRAR MODAL CON PESTAÑAS (sin cambios) ====================

function mostrarModalTransferencias(data) {
    // ... (código idéntico al original, solo se añade la variable 'sucursal' en el encabezado)
    // Para evitar duplicar todo, mantengo la misma lógica que en el archivo original,
    // pero añado en el encabezado el nombre de la sucursal (data.sucursal).

    // Verificar si ya existe el modal
    const modalExistente = document.getElementById('modalTransferenciasPendientes');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modalTransferenciasPendientes';
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const ordenAlmacenes = ['TAE', 'Equipos Matriz', 'Accesorios Matriz', 'Otros'];
    const iconosAlmacenes = {
        'TAE': '📱',
        'Equipos Matriz': '📱',
        'Accesorios Matriz': '🔌',
        'Otros': '📦'
    };
    const coloresAlmacenes = {
        'TAE': '#8b5cf6',
        'Equipos Matriz': '#3b82f6',
        'Accesorios Matriz': '#f97316',
        'Otros': '#64748b'
    };

    let tabsHtml = '';
    let contentHtml = '';
    let primeraPestana = true;

    for (const almacen of ordenAlmacenes) {
        if (data.almacenes[almacen]) {
            const almacenData = data.almacenes[almacen];
            const activeClass = primeraPestana ? 'active' : '';
            const displayStyle = primeraPestana ? 'block' : 'none';
            const color = coloresAlmacenes[almacen] || '#64748b';
            const icono = iconosAlmacenes[almacen] || '📦';

            let tiendasHtml = '';
            if (almacenData.tiendas.length === 0) {
                tiendasHtml = `
                    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">
                        ✅ No hay transferencias pendientes desde este almacén
                    </div>
                `;
            } else {
                tiendasHtml = `
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0;">
                        ${almacenData.tiendas.map(tienda => `
                            <div class="tienda-pendiente"
                                 data-tienda="${escapeHtml(tienda.tienda)}"
                                 data-transferencias='${JSON.stringify(tienda.transferencias).replace(/'/g, "&#39;")}'
                                 style="
                                    background: #f8fafc;
                                    border: 1px solid #e2e8f0;
                                    border-radius: 8px;
                                    padding: 8px 14px;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    flex: 0 1 auto;
                                    font-size: 0.85rem;
                                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                                 "
                                 onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                                 onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';">
                                <span style="font-size: 1rem;">🏪</span>
                                <span style="font-weight: 500; color: #1e293b;">${escapeHtml(tienda.tienda)}</span>
                                <span style="
                                    background: ${color};
                                    color: white;
                                    border-radius: 50%;
                                    padding: 0 8px;
                                    font-size: 0.7rem;
                                    font-weight: 700;
                                    min-width: 20px;
                                    text-align: center;
                                ">${tienda.cantidad}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            tabsHtml += `
                <button class="almacen-tab ${activeClass}"
                        data-almacen="${almacen}"
                        style="
                            background: ${activeClass ? color : 'transparent'};
                            color: ${activeClass ? 'white' : color};
                            border: none;
                            padding: 8px 16px;
                            border-radius: 8px 8px 0 0;
                            font-weight: 600;
                            font-size: 0.8rem;
                            cursor: pointer;
                            transition: all 0.2s;
                            border-bottom: ${activeClass ? 'none' : `2px solid ${color}30`};
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                        "
                        onmouseover="if(!this.classList.contains('active')){this.style.background='${color}20';}"
                        onmouseout="if(!this.classList.contains('active')){this.style.background='transparent';}">
                    <span>${icono}</span>
                    ${almacen}
                    <span style="
                        background: ${activeClass ? 'rgba(255,255,255,0.2)' : color};
                        color: ${activeClass ? 'white' : 'white'};
                        border-radius: 50%;
                        padding: 0 8px;
                        font-size: 0.65rem;
                        min-width: 18px;
                        text-align: center;
                    ">${almacenData.totalTransferencias}</span>
                </button>
            `;

            contentHtml += `
                <div class="almacen-content" data-almacen="${almacen}" style="display: ${displayStyle}; padding: 16px 0;">
                    ${tiendasHtml}
                </div>
            `;

            primeraPestana = false;
        }
    }

    if (!tabsHtml) {
        mostrarSinTransferencias();
        return;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 750px; animation: modalFadeIn 0.3s ease-out;">
            <div class="modal-header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
                <h3 style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.8rem;">📦</span>
                    <span>Transferencias Pendientes de Recibir</span>
                </h3>
                <span class="close-modal" id="cerrarModalTransferencias" style="font-size: 32px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 16px; background: #f8fafc; border-radius: 8px; padding: 12px;">
                    <div style="font-size: 2rem; font-weight: 800; color: #ea580c;">${data.total}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">
                        Transferencia(s) en tránsito para <strong>${escapeHtml(data.sucursal)}</strong>
                    </div>
                </div>

                <div style="border-top: 2px solid #e2e8f0; padding-top: 12px;">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 2px solid #e2e8f0;">
                        ${tabsHtml}
                    </div>
                    <div style="padding-top: 8px;">
                        ${contentHtml}
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button id="btnActualizarTransferencias" style="
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
                <button id="btnCerrarModalTransferencias" style="
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

    // Eventos de pestañas
    document.querySelectorAll('.almacen-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const almacen = this.dataset.almacen;
            const color = this.dataset.color || '#64748b';

            document.querySelectorAll('.almacen-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = 'transparent';
                t.style.color = t.dataset.color || '#64748b';
                t.style.borderBottom = `2px solid ${t.dataset.color || '#64748b'}30`;
            });

            this.classList.add('active');
            this.style.background = color;
            this.style.color = 'white';
            this.style.borderBottom = 'none';

            document.querySelectorAll('.almacen-content').forEach(c => c.style.display = 'none');
            const content = document.querySelector(`.almacen-content[data-almacen="${almacen}"]`);
            if (content) content.style.display = 'block';
        });

        const color = coloresAlmacenes[tab.textContent.trim().split(' ')[0]] || '#64748b';
        tab.dataset.color = color;
    });

    // Cerrar
    document.getElementById('cerrarModalTransferencias').addEventListener('click', cerrarModalTransferencias);
    document.getElementById('btnCerrarModalTransferencias').addEventListener('click', cerrarModalTransferencias);

    // Actualizar
    document.getElementById('btnActualizarTransferencias').addEventListener('click', function() {
        alertaTransferenciasCargada = false;
        cachedTransferenciasData = null;
        cerrarModalTransferencias();
        setTimeout(() => verificarTransferenciasPendientes(true), 300);
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) cerrarModalTransferencias();
    });

    // Click en tarjetas de tiendas
    document.querySelectorAll('.tienda-pendiente').forEach(el => {
        el.addEventListener('click', function() {
            const tiendaNombre = this.dataset.tienda;
            const transferencias = JSON.parse(this.dataset.transferencias);
            abrirDetalleTienda(tiendaNombre, transferencias);
        });
    });
}

// ==================== ABRIR DETALLE DE TIENDA (sin cambios) ====================

function abrirDetalleTienda(tiendaNombre, transferencias) {
    let modal = document.getElementById('detalleTiendaTransferencias');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'detalleTiendaTransferencias';
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    let tablaHtml = '';
    if (transferencias.length === 0) {
        tablaHtml = '<div style="text-align: center; padding: 20px; color: #64748b;">No hay transferencias pendientes para esta tienda</div>';
    } else {
        tablaHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 10px; text-align: left;"># Transferencia</th>
                        <th style="padding: 10px; text-align: left;">Almacén Origen</th>
                        <th style="padding: 10px; text-align: left;">Fecha</th>
                        <th style="padding: 10px; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${transferencias.map(t => `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px; font-weight: 600; color: #1e40af;">#${t.id}</td>
                            <td style="padding: 10px;">${escapeHtml(t.origen)}</td>
                            <td style="padding: 10px;">${t.fecha}</td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="background: #f59e0b20; color: #f59e0b; padding: 2px 12px; border-radius: 12px; font-size: 0.7rem; border: 1px solid #f59e0b40;">🚚 ${t.status}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; animation: modalFadeIn 0.3s ease-out;">
            <div class="modal-header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">
                <h3 style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem;">🏪</span>
                    <span>Detalle de Transferencias - ${escapeHtml(tiendaNombre)}</span>
                </h3>
                <span class="close-modal" onclick="cerrarDetalleTienda()" style="font-size: 32px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                <div style="margin-bottom: 16px; display: flex; gap: 16px; flex-wrap: wrap;">
                    <div style="background: #f8fafc; padding: 8px 16px; border-radius: 8px;">
                        <span style="color: #64748b; font-size: 0.75rem;">Total Transferencias</span>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #1e40af;">${transferencias.length}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 8px 16px; border-radius: 8px;">
                        <span style="color: #64748b; font-size: 0.75rem;">Tienda</span>
                        <div style="font-size: 1rem; font-weight: 600; color: #1e293b;">${escapeHtml(tiendaNombre)}</div>
                    </div>
                </div>
                ${tablaHtml}
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarDetalleTienda()" style="
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

    modal.addEventListener('click', function(e) {
        if (e.target === modal) cerrarDetalleTienda();
    });
}

// ==================== MOSTRAR MENSAJE SIN TRANSFERENCIAS ====================

function mostrarSinTransferencias() {
    const modal = document.getElementById('modalTransferenciasPendientes');
    if (modal) modal.remove();

    const newModal = document.createElement('div');
    newModal.id = 'modalTransferenciasPendientes';
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
                    <span>Sin Transferencias Pendientes</span>
                </h3>
                <span class="close-modal" onclick="cerrarModalTransferencias()" style="font-size: 32px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 16px;">📦</div>
                <div style="font-size: 1.2rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
                    No hay transferencias en tránsito
                </div>
                <div style="color: #64748b; font-size: 0.9rem;">
                    Todas las transferencias han sido recibidas correctamente.
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalTransferencias()" style="
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
        if (e.target === newModal) cerrarModalTransferencias();
    });
}

// ==================== MENSAJES DE ERROR ====================

function mostrarSinSucursal() {
    const modal = document.createElement('div');
    modal.id = 'modalTransferenciasPendientes';
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">
                <h3>⚠️ Sin Sucursal Asignada</h3>
                <span class="close-modal" onclick="cerrarModalTransferencias()" style="font-size: 32px; cursor: pointer;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 16px;">🏪</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">No tienes una sucursal asignada</div>
                <div style="color: #64748b; font-size: 0.9rem;">Para ver tus transferencias pendientes, necesitas tener una sucursal asignada en el sistema.</div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalTransferencias()" style="background: #64748b; color: white; border: none; padding: 8px 30px; border-radius: 8px; cursor: pointer;">Entendido</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) cerrarModalTransferencias(); });
}

function mostrarSinAlmacen() {
    const modal = document.createElement('div');
    modal.id = 'modalTransferenciasPendientes';
    modal.className = 'modal';
    modal.style.cssText = `
        display: flex !important;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);">
                <h3>⚠️ Sin Almacén Asignado</h3>
                <span class="close-modal" onclick="cerrarModalTransferencias()" style="font-size: 32px; cursor: pointer;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 16px;">🏭</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">No tienes un almacén asignado</div>
                <div style="color: #64748b; font-size: 0.9rem;">Para ver tus transferencias pendientes, necesitas tener un almacén asignado en el sistema.</div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalTransferencias()" style="background: #64748b; color: white; border: none; padding: 8px 30px; border-radius: 8px; cursor: pointer;">Entendido</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) cerrarModalTransferencias(); });
}

function mostrarErrorGenerico(mensaje) {
    const modal = document.getElementById('modalTransferenciasPendientes');
    if (modal) modal.remove();

    const newModal = document.createElement('div');
    newModal.id = 'modalTransferenciasPendientes';
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
                <span class="close-modal" onclick="cerrarModalTransferencias()" style="font-size: 32px; cursor: pointer;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 30px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Error al consultar transferencias</div>
                <div style="color: #64748b; font-size: 0.9rem;">${escapeHtml(mensaje || 'Error desconocido')}</div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: center; padding: 12px 20px; border-top: 1px solid #e2e8f0;">
                <button onclick="cerrarModalTransferencias()" style="background: #64748b; color: white; border: none; padding: 8px 30px; border-radius: 8px; cursor: pointer;">Entendido</button>
            </div>
        </div>
    `;

    document.body.appendChild(newModal);
    newModal.addEventListener('click', function(e) { if (e.target === newModal) cerrarModalTransferencias(); });
}

// ==================== CERRAR MODALES ====================

function cerrarModalTransferencias() {
    const modal = document.getElementById('modalTransferenciasPendientes');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

function cerrarDetalleTienda() {
    const modal = document.getElementById('detalleTiendaTransferencias');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

// ==================== ABRIR MODAL DESDE BOTÓN ====================

function abrirModalTransferencias() {
    if (cachedTransferenciasData) {
        console.log('📦 Mostrando datos en caché...');
        mostrarModalTransferencias(cachedTransferenciasData);
    } else {
        verificarTransferenciasPendientes(true);
    }
}

// ==================== INICIALIZACIÓN ====================

function initAlertasTransferencias() {
    if (alertaTransferenciasInicializada) return;
    alertaTransferenciasInicializada = true;
    console.log('🔔 Inicializando alerta de transferencias...');

    const btnTransferencias = document.getElementById('btnTransferencias');
    if (btnTransferencias) {
        btnTransferencias.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModalTransferencias();
        });
    }

    // Esperar autenticación
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (user && user.id) {
        setTimeout(() => verificarTransferenciasPendientes(true), 1500);
    } else {
        const checkLogin = setInterval(() => {
            const userCheck = window.getCurrentUser ? window.getCurrentUser() : null;
            if (userCheck && userCheck.id) {
                clearInterval(checkLogin);
                setTimeout(() => verificarTransferenciasPendientes(true), 1500);
            }
        }, 500);
    }
}

// ==================== EXPORTAR FUNCIONES GLOBALES ====================
window.initAlertasTransferencias = initAlertasTransferencias;
window.verificarTransferenciasPendientes = verificarTransferenciasPendientes;
window.cerrarModalTransferencias = cerrarModalTransferencias;
window.cerrarDetalleTienda = cerrarDetalleTienda;
window.abrirModalTransferencias = abrirModalTransferencias;

// ==================== ANIMACIÓN BADGE (OPCIONAL) ====================
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

function limpiarCacheTransferencias() {
    alertaTransferenciasCargada = false;
    cachedTransferenciasData = null;
    console.log('🧹 Caché de transferencias limpiado');
}

// Exportar función de limpieza
window.limpiarCacheTransferencias = limpiarCacheTransferencias;