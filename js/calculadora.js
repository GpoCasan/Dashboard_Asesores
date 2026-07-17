// ==================== MÓDULO: CALCULADORA DE VENTAS ====================

console.log('🧮 Cargando módulo de calculadora de ventas...');

// ==================== DOM ELEMENTS ====================
const calcCredicel = document.getElementById('calcCredicel');
const calcPayjoy = document.getElementById('calcPayjoy');
const calcSpay = document.getElementById('calcSpay');
const calcPaguitos = document.getElementById('calcPaguitos');
const calcMenor1500 = document.getElementById('calcMenor1500');
const calcMayor1500 = document.getElementById('calcMayor1500');
const calcLineasEquipo = document.getElementById('calcLineasEquipo');
const calcLineasSinEquipo = document.getElementById('calcLineasSinEquipo');
const calcCoce = document.getElementById('calcCoce');
const calcMeta = document.getElementById('calcMeta');

const calcCalcularBtn = document.getElementById('calcCalcularBtn');
const calcLimpiarBtn = document.getElementById('calcLimpiarBtn');
const calcResultados = document.getElementById('calcResultados');
const calcEmpty = document.getElementById('calcEmpty');
const calcAsesor = document.getElementById('calcAsesor');
const calcSucursal = document.getElementById('calcSucursal');

// ==================== ELEMENTOS PARA CONSULTA ====================
const calcMonthSelector = document.getElementById('calcMonthSelector');
const calcConsultarBtn = document.getElementById('calcConsultarBtn');
const calcAutoLoading = document.getElementById('calcAutoLoading');
const calcAutoStatus = document.getElementById('calcAutoStatus');

// ==================== CONSTANTES ====================
const PUNTOS = {
    LINEA_EQUIPO: 4,
    LINEA_SIN_EQUIPO: 2,
    COCE: 2
};

// IDs de clasificación de teléfonos (según contado.js)
const PHONE_CLASSIFICATION_IDS = [3, 9];

// ==================== CRÉDITO PROVIDERS MAP ====================
const CREDIT_PROVIDERS = {
    CREDICEL: 'Credicel',
    PAYJOY: 'Payjoy',
    SPAY: 'Spay',
    PAGUITOS: 'Paguitos'
};

// ==================== OBTENER USUARIO ====================

function getUsuarioActual() {
    try {
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (user) return user;
        const stored = sessionStorage.getItem('dashboard_user');
        if (stored) return JSON.parse(stored);
        return null;
    } catch (e) {
        console.warn('⚠️ Error obteniendo usuario:', e);
        return null;
    }
}

function getSucursalActual() {
    try {
        const branches = window.getUserBranches ? window.getUserBranches() : [];
        if (branches && branches.length > 0) {
            return branches[0].name || branches[0].branch_name || 'Sin sucursal';
        }
        const stored = sessionStorage.getItem('dashboard_branches');
        if (stored) {
            const branches = JSON.parse(stored);
            if (branches && branches.length > 0) {
                return branches[0].name || branches[0].branch_name || 'Sin sucursal';
            }
        }
        return 'Sin sucursal';
    } catch (e) {
        return 'Sin sucursal';
    }
}

// ==================== FUNCIONES DE FECHA ====================

function getMonthRange(year, month) {
    const startDate = new Date(year, month, 1, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    
    function formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }
    
    return {
        start: formatDateTimeLocal(startDate),
        end: formatDateTimeLocal(endDate),
        startDate: startDate,
        endDate: endDate,
        monthName: startDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    };
}

// ==================== CONSULTAR VENTAS A CRÉDITO ====================

async function fetchCreditSalesByMonth(userId, startDateTime, endDateTime) {
    try {
        let allSales = [];
        let currentPage = 1;
        const perPage = 100;
        let hasMorePages = true;
        let totalPages = 1;
        
        console.log('📡 [CALC] Consultando ventas a CRÉDITO');
        console.log('📅 Rango:', startDateTime, 'a', endDateTime);
        console.log('👤 Usuario ID:', userId);
        
        while (hasMorePages) {
            const url = CONFIG.API_SALES + 
                '?page=' + currentPage + 
                '&per_page=' + perPage + 
                '&total=1' +
                '&sale_type=credit' +
                '&start_date=' + encodeURIComponent(startDateTime) + 
                '&end_date=' + encodeURIComponent(endDateTime);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Error ' + response.status + ' al obtener ventas a crédito');
            }
            
            const data = await response.json();
            const pageSales = data.data || [];
            
            if (data.meta && data.meta.last_page) {
                totalPages = data.meta.last_page;
            } else if (data.pagination && data.pagination.total_pages) {
                totalPages = data.pagination.total_pages;
            } else if (data.last_page) {
                totalPages = data.last_page;
            } else if (data.total && data.per_page) {
                totalPages = Math.ceil(data.total / data.per_page);
            } else {
                if (pageSales.length < perPage) {
                    hasMorePages = false;
                    break;
                }
            }
            
            const filteredSales = pageSales.filter(sale => 
                sale.user_id == userId || 
                sale.created_by == userId || 
                sale.seller_id == userId
            );
            
            allSales = allSales.concat(filteredSales);
            console.log(`📄 [CALC] Página ${currentPage}: ${filteredSales.length} ventas a crédito (Total: ${allSales.length})`);
            
            if (currentPage >= totalPages) {
                hasMorePages = false;
            } else {
                currentPage++;
            }
        }
        
        console.log('✅ [CALC] Total de ventas a crédito:', allSales.length);
        return allSales;
        
    } catch (error) {
        console.error('❌ [CALC] Error obteniendo ventas a crédito:', error);
        throw error;
    }
}

// ==================== CONSULTAR TODOS LOS EQUIPOS (line_id=4 y line_id=5) ====================

async function fetchAllEquipos(userId, startDateTime, endDateTime) {
    try {
        let totalMenor1500 = 0;
        let totalMayor1500 = 0;
        
        // Consultar ambos line_id: 4 y 5
        const lineIds = [4, 5];
        
        for (let li = 0; li < lineIds.length; li++) {
            const lineId = lineIds[li];
            let currentPage = 1;
            const perPage = 100;
            let hasMorePages = true;
            let totalPages = 1;
            
            console.log(`📡 [CALC] Consultando equipos (line_id=${lineId})`);
            
            while (hasMorePages) {
                const url = CONFIG.API_SALES + 
                    '?page=' + currentPage + 
                    '&per_page=' + perPage + 
                    '&total=1' +
                    '&start_date=' + encodeURIComponent(startDateTime) + 
                    '&end_date=' + encodeURIComponent(endDateTime) +
                    '&user_ids[]=' + userId +
                    '&sale_type=products' +
                    '&line_id=' + lineId;
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status} al obtener equipos line_id=${lineId}`);
                }
                
                const data = await response.json();
                const pageSales = data.data || [];
                
                // Obtener total de páginas
                if (data.meta && data.meta.last_page) {
                    totalPages = data.meta.last_page;
                } else if (data.pagination && data.pagination.total_pages) {
                    totalPages = data.pagination.total_pages;
                } else if (data.last_page) {
                    totalPages = data.last_page;
                } else if (data.total && data.per_page) {
                    totalPages = Math.ceil(data.total / data.per_page);
                } else {
                    if (pageSales.length < perPage) {
                        hasMorePages = false;
                        break;
                    }
                }
                
                // Procesar cada venta y contar unidades de equipos
                let pageMenor1500 = 0;
                let pageMayor1500 = 0;
                
                for (let i = 0; i < pageSales.length; i++) {
                    const sale = pageSales[i];
                    // Verificar que la venta sea del usuario
                    if (sale.user_id != userId && sale.created_by != userId && sale.seller_id != userId) {
                        continue;
                    }
                    
                    const details = sale.details || [];
                    for (let d = 0; d < details.length; d++) {
                        const detail = details[d];
                        const product = detail.product || {};
                        const classificationId = product.classification_id || null;
                        
                        // Solo contar equipos (classification_id 3 o 9)
                        if (PHONE_CLASSIFICATION_IDS.includes(classificationId)) {
                            const quantity = detail.quantity || 1;
                            
                            // Obtener el precio para clasificar
                            const price = parseFloat(detail.unit_price) || 
                                         parseFloat(detail.price) || 
                                         parseFloat(product.price) || 0;
                            
                            // Clasificar por precio
                            if (price < 1500) {
                                pageMenor1500 += quantity;
                            } else {
                                pageMayor1500 += quantity;
                            }
                        }
                    }
                }
                
                // Acumular totales
                totalMenor1500 += pageMenor1500;
                totalMayor1500 += pageMayor1500;
                
                console.log(`📄 [CALC] line_id=${lineId} Página ${currentPage}/${totalPages}: ${pageMenor1500} < $1,500, ${pageMayor1500} ≥ $1,500 (Total acumulado: ${totalMenor1500} < $1,500, ${totalMayor1500} ≥ $1,500)`);
                
                if (currentPage >= totalPages) {
                    hasMorePages = false;
                } else {
                    currentPage++;
                }
            }
            
            console.log(`✅ [CALC] line_id=${lineId} completado: ${totalMenor1500} < $1,500, ${totalMayor1500} ≥ $1,500`);
        }
        
        console.log(`✅ [CALC] TOTAL EQUIPOS: ${totalMenor1500} < $1,500, ${totalMayor1500} ≥ $1,500`);
        return {
            menor1500: totalMenor1500,
            mayor1500: totalMayor1500
        };
        
    } catch (error) {
        console.error('❌ [CALC] Error obteniendo equipos:', error);
        throw error;
    }
}

// ==================== FUNCIÓN PARA CONTAR VENTAS A CRÉDITO ====================

function processCreditSalesForCalculator(sales) {
    let credicelCount = 0;
    let payjoyCount = 0;
    let spayCount = 0;
    let paguitosCount = 0;
    let coceCount = 0;
    
    for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        
        let creditPlatform = null;
        let creditProviderId = null;
        
        if (sale.credit_provider) {
            creditPlatform = sale.credit_provider.equipment_value || null;
            creditProviderId = sale.credit_provider.id || null;
        }
        
        // Verificar si es COCE (Renovación Telcel) - credit_providers_ids = 6
        const isCoce = (creditProviderId === 6) || 
                       (creditPlatform && creditPlatform.toLowerCase().includes('renovación')) ||
                       (creditPlatform && creditPlatform.toLowerCase().includes('telcel')) ||
                       (sale.credit_provider && sale.credit_provider.name && 
                        (sale.credit_provider.name.toLowerCase().includes('renovación') || 
                         sale.credit_provider.name.toLowerCase().includes('telcel')));
        
        if (isCoce) {
            coceCount++;
            continue;
        }
        
        if (creditPlatform) {
            const platformLower = creditPlatform.toLowerCase();
            if (platformLower.includes('credicel')) {
                credicelCount++;
            } else if (platformLower.includes('payjoy')) {
                payjoyCount++;
            } else if (platformLower.includes('spay')) {
                spayCount++;
            } else if (platformLower.includes('paguitos')) {
                paguitosCount++;
            } else {
                if (creditPlatform === CREDIT_PROVIDERS.CREDICEL) {
                    credicelCount++;
                } else if (creditPlatform === CREDIT_PROVIDERS.PAYJOY) {
                    payjoyCount++;
                } else if (creditPlatform === CREDIT_PROVIDERS.SPAY) {
                    spayCount++;
                } else if (creditPlatform === CREDIT_PROVIDERS.PAGUITOS) {
                    paguitosCount++;
                }
            }
        }
    }
    
    return {
        credicel: credicelCount,
        payjoy: payjoyCount,
        spay: spayCount,
        paguitos: paguitosCount,
        coce: coceCount,
        total: credicelCount + payjoyCount + spayCount + paguitosCount + coceCount
    };
}

// ==================== CARGAR DATOS AL PRESIONAR CONSULTAR ====================

async function cargarDatosAutomaticos() {
    const monthValue = calcMonthSelector.value;
    if (!monthValue) {
        showAutoStatus('⚠️ Selecciona un mes', 'warning');
        return;
    }
    
    const [year, month] = monthValue.split('-').map(Number);
    const user = getUsuarioActual();
    
    if (!user || !user.id) {
        showAutoStatus('❌ Usuario no autenticado', 'error');
        return;
    }
    
    // Mostrar loading
    calcAutoLoading.style.display = 'inline-block';
    calcAutoStatus.textContent = '⏳ Consultando ventas del mes...';
    calcAutoStatus.style.color = '#3b82f6';
    calcConsultarBtn.disabled = true;
    
    try {
        const dateRange = getMonthRange(year, month - 1);
        
        console.log('📅 [CALC] Mes consultado:', dateRange.monthName);
        console.log('📅 [CALC] Rango:', dateRange.start, 'a', dateRange.end);
        
        // ====== 1. CONSULTAR VENTAS A CRÉDITO ======
        const creditSales = await fetchCreditSalesByMonth(user.id, dateRange.start, dateRange.end);
        const creditTotals = processCreditSalesForCalculator(creditSales);
        
        if (calcCredicel) {
            calcCredicel.value = creditTotals.credicel;
            calcCredicel.style.backgroundColor = '#f0fdf4';
            calcCredicel.style.borderColor = '#22c55e';
        }
        if (calcPayjoy) {
            calcPayjoy.value = creditTotals.payjoy;
            calcPayjoy.style.backgroundColor = '#f0fdf4';
            calcPayjoy.style.borderColor = '#22c55e';
        }
        if (calcSpay) {
            calcSpay.value = creditTotals.spay;
            calcSpay.style.backgroundColor = '#f0fdf4';
            calcSpay.style.borderColor = '#22c55e';
        }
        if (calcPaguitos) {
            calcPaguitos.value = creditTotals.paguitos;
            calcPaguitos.style.backgroundColor = '#f0fdf4';
            calcPaguitos.style.borderColor = '#22c55e';
        }
        if (calcCoce) {
            calcCoce.value = creditTotals.coce;
            calcCoce.style.backgroundColor = '#f0fdf4';
            calcCoce.style.borderColor = '#22c55e';
        }
        
        // ====== 2. CONSULTAR TODOS LOS EQUIPOS (line_id=4 y line_id=5) ======
        const equipos = await fetchAllEquipos(user.id, dateRange.start, dateRange.end);
        
        if (calcMenor1500) {
            calcMenor1500.value = equipos.menor1500;
            calcMenor1500.style.backgroundColor = '#f0fdf4';
            calcMenor1500.style.borderColor = '#22c55e';
        }
        if (calcMayor1500) {
            calcMayor1500.value = equipos.mayor1500;
            calcMayor1500.style.backgroundColor = '#f0fdf4';
            calcMayor1500.style.borderColor = '#22c55e';
        }
        
        // ====== 3. MOSTRAR ESTADO ======
        const totalCreditos = creditTotals.total;
        const totalEquipos = equipos.menor1500 + equipos.mayor1500;
        const statusMsg = `✅ Cargado: ${totalCreditos} créditos, ${totalEquipos} equipos (${equipos.menor1500} < $1,500, ${equipos.mayor1500} ≥ $1,500)`;
        showAutoStatus(statusMsg, 'success');
        
        if (totalCreditos > 0 || totalEquipos > 0) {
            calcAutoStatus.textContent += ' 🧮 Presiona "Calcular" para ver tus puntos';
        }
        
        console.log('✅ [CALC] Datos cargados correctamente:', {
            creditos: creditTotals,
            equipos: equipos
        });
        
    } catch (error) {
        console.error('❌ [CALC] Error cargando datos:', error);
        showAutoStatus('❌ Error al cargar datos: ' + error.message, 'error');
    } finally {
        calcAutoLoading.style.display = 'none';
        calcConsultarBtn.disabled = false;
    }
}

function showAutoStatus(message, type) {
    calcAutoStatus.textContent = message;
    if (type === 'success') {
        calcAutoStatus.style.color = '#16a34a';
    } else if (type === 'warning') {
        calcAutoStatus.style.color = '#eab308';
    } else if (type === 'error') {
        calcAutoStatus.style.color = '#dc2626';
    } else {
        calcAutoStatus.style.color = '#64748b';
    }
}

// ==================== FUNCIONES PRINCIPALES ====================

function calcularVentas() {
    const meta = parseInt(calcMeta?.value) || 0;
    const credicel = parseInt(calcCredicel?.value) || 0;
    const payjoy = parseInt(calcPayjoy?.value) || 0;
    const spay = parseInt(calcSpay?.value) || 0;
    const paguitos = parseInt(calcPaguitos?.value) || 0;
    const menor1500 = parseInt(calcMenor1500?.value) || 0;
    const mayor1500 = parseInt(calcMayor1500?.value) || 0;
    const lineasEquipo = parseInt(calcLineasEquipo?.value) || 0;
    const lineasSinEquipo = parseInt(calcLineasSinEquipo?.value) || 0;
    const coce = parseInt(calcCoce?.value) || 0;

    const totalVC = credicel + payjoy + spay + paguitos;
    const puntosMenor1500 = Math.floor(menor1500 / 4);
    const puntosMayor1500 = Math.floor(mayor1500 / 2);
    const totalKits = puntosMenor1500 + puntosMayor1500;
    const puntosLineasEquipo = lineasEquipo * PUNTOS.LINEA_EQUIPO;
    const puntosLineasSinEquipo = lineasSinEquipo * PUNTOS.LINEA_SIN_EQUIPO;
    const puntosCoce = coce * PUNTOS.COCE;
    const puntosTotales = totalVC + puntosMenor1500 + puntosMayor1500 + 
                          puntosLineasEquipo + puntosLineasSinEquipo + puntosCoce;

    let faltan = 0;
    let progreso = 0;
    let estado = 'sin-meta';
    
    if (meta > 0) {
        faltan = Math.max(0, meta - puntosTotales);
        progreso = Math.min(100, Math.round((puntosTotales / meta) * 100));
        
        if (puntosTotales >= meta) {
            estado = 'meta-alcanzada';
        } else if (progreso >= 70) {
            estado = 'cerca-meta';
        } else {
            estado = 'en-progreso';
        }
    }

    return {
        meta,
        credicel, payjoy, spay, paguitos,
        totalVC,
        menor1500, mayor1500,
        puntosMenor1500, puntosMayor1500,
        totalKits,
        lineasEquipo, lineasSinEquipo, coce,
        puntosLineasEquipo, puntosLineasSinEquipo, puntosCoce,
        puntosTotales,
        faltan,
        progreso,
        estado
    };
}

function mostrarResultados(resultados) {
    if (!resultados) return;
    
    if (calcResultados) calcResultados.style.display = 'block';
    if (calcEmpty) calcEmpty.style.display = 'none';
    
    document.getElementById('calcPuntosTotales').textContent = resultados.puntosTotales;
    
    const faltanEl = document.getElementById('calcFaltan');
    const metaStatusEl = document.getElementById('calcMetaStatus');
    
    if (resultados.estado === 'meta-alcanzada') {
        faltanEl.textContent = '🎉 ¡Meta alcanzada!';
        metaStatusEl.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else if (resultados.estado === 'cerca-meta') {
        faltanEl.textContent = `${resultados.faltan} puntos`;
        metaStatusEl.style.background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
    } else if (resultados.estado === 'sin-meta') {
        faltanEl.textContent = '⚠️ Sin meta definida';
        metaStatusEl.style.background = 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)';
    } else {
        faltanEl.textContent = `${resultados.faltan} puntos`;
        metaStatusEl.style.background = 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)';
    }
    
    document.getElementById('calcMetaLabel').textContent = `Meta: ${resultados.meta} puntos`;
    
    const barra = document.getElementById('calcBarraProgreso');
    const progresoText = document.getElementById('calcProgresoPorcentaje');
    
    barra.style.width = `${resultados.progreso}%`;
    barra.textContent = resultados.progreso >= 25 ? `${resultados.progreso}%` : '';
    progresoText.textContent = `${resultados.progreso}%`;
    
    if (resultados.progreso >= 100) {
        barra.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    } else if (resultados.progreso >= 70) {
        barra.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    } else {
        barra.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
    }
    
    const desgloseHtml = `
        <div class="calc-breakdown-item">
            <span class="label">💰 Total VC (${resultados.credicel + resultados.payjoy + resultados.spay + resultados.paguitos})</span>
            <span class="value">${resultados.totalVC}</span>
        </div>
        <div class="calc-breakdown-item">
            <span class="label">📱 Teléfonos &lt; $1,500 (${resultados.menor1500} ÷ 4)</span>
            <span class="value">${resultados.puntosMenor1500}</span>
        </div>
        <div class="calc-breakdown-item">
            <span class="label">📱 Teléfonos ≥ $1,500 (${resultados.mayor1500} ÷ 2)</span>
            <span class="value">${resultados.puntosMayor1500}</span>
        </div>
        <div class="calc-breakdown-item">
            <span class="label">📞 Líneas con equipo (${resultados.lineasEquipo} × 4)</span>
            <span class="value">${resultados.puntosLineasEquipo}</span>
        </div>
        <div class="calc-breakdown-item">
            <span class="label">📞 Líneas sin equipo (${resultados.lineasSinEquipo} × 2)</span>
            <span class="value">${resultados.puntosLineasSinEquipo}</span>
        </div>
        <div class="calc-breakdown-item">
            <span class="label">🔄 COCE (${resultados.coce} × 2)</span>
            <span class="value">${resultados.puntosCoce}</span>
        </div>
        <div class="calc-breakdown-item" style="border-top: 2px solid #1e40af; padding-top: 10px; margin-top: 4px; font-size: 1.05rem;">
            <span class="label" style="font-weight: 700;">⭐ TOTAL PUNTOS</span>
            <span class="value highlight">${resultados.puntosTotales}</span>
        </div>
    `;
    
    document.getElementById('calcDesglose').innerHTML = desgloseHtml;
    document.getElementById('calcProgreso').textContent = `${resultados.progreso}%`;
}

function limpiarCampos() {
    const inputs = document.querySelectorAll('#calculadoraModule .calc-field input');
    inputs.forEach(input => {
        if (input) {
            if (input.id === 'calcMeta') {
                input.value = '';
            } else if (input.id === 'calcCredicel' || input.id === 'calcPayjoy' || 
                       input.id === 'calcSpay' || input.id === 'calcPaguitos' || 
                       input.id === 'calcCoce' || input.id === 'calcMenor1500' || 
                       input.id === 'calcMayor1500') {
                input.value = 0;
                input.style.backgroundColor = '';
                input.style.borderColor = '';
            } else {
                input.value = 0;
            }
        }
    });
    
    if (calcResultados) calcResultados.style.display = 'none';
    if (calcEmpty) calcEmpty.style.display = 'block';
    document.getElementById('calcProgreso').textContent = '0%';
    showAutoStatus('🧹 Campos limpiados', '');
}

// ==================== INICIALIZAR ====================

function initCalculadora() {
    console.log('🧮 Inicializando calculadora de ventas...');
    
    const user = getUsuarioActual();
    if (user) {
        calcAsesor.textContent = user.name || 'Usuario';
    }
    calcSucursal.textContent = getSucursalActual();
    
    // ==================== INICIALIZAR SELECTOR DE MES ====================
    if (calcMonthSelector) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        let optionsHtml = '';
        for (let i = 0; i < 12; i++) {
            let year = currentYear;
            let month = currentMonth - i;
            if (month < 0) {
                month += 12;
                year--;
            }
            const monthName = new Date(year, month, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
            const value = `${year}-${String(month + 1).padStart(2, '0')}`;
            const selected = (i === 0) ? 'selected' : '';
            optionsHtml += `<option value="${value}" ${selected}>${monthName}</option>`;
        }
        calcMonthSelector.innerHTML = optionsHtml;
        
        // Evento SOLO al hacer clic en consultar (NO automático)
        if (calcConsultarBtn) {
            calcConsultarBtn.addEventListener('click', cargarDatosAutomaticos);
        }
    }
    
    // ==================== HACER CAMPOS NO EDITABLES ====================
    const autoFields = [calcCredicel, calcPayjoy, calcSpay, calcPaguitos, calcCoce, calcMenor1500, calcMayor1500];
    autoFields.forEach(field => {
        if (field) {
            field.readOnly = true;
            field.style.cursor = 'not-allowed';
            field.style.backgroundColor = '#f1f5f9';
        }
    });
    
    // ==================== EVENTOS ====================
    if (calcCalcularBtn) {
        calcCalcularBtn.addEventListener('click', function() {
            const resultados = calcularVentas();
            mostrarResultados(resultados);
        });
    }
    
    if (calcLimpiarBtn) {
        calcLimpiarBtn.addEventListener('click', limpiarCampos);
    }
    
    document.querySelectorAll('#calculadoraModule .calc-field input:not([readonly])').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (calcCalcularBtn) calcCalcularBtn.click();
            }
        });
    });
    
    // Estado inicial: mensaje de espera
    showAutoStatus('📅 Selecciona un mes y presiona "Consultar"', '');
    
    console.log('✅ Calculadora inicializada correctamente');
}

// ==================== EXPORTAR ====================
window.initCalculadora = initCalculadora;
window.calcularVentas = calcularVentas;
window.limpiarCampos = limpiarCampos;
window.cargarDatosAutomaticos = cargarDatosAutomaticos;

// ==================== INICIALIZAR ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initCalculadora, 500);
    });
} else {
    setTimeout(initCalculadora, 500);
}

console.log('🧮 Módulo de calculadora cargado correctamente');