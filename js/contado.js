// ==================== MÓDULO: CONTADO ====================

// ==================== DOM ELEMENTS ====================
var contadoDatePicker = document.getElementById('contadoDatePicker');
var contadoApplyBtn = document.getElementById('contadoApplyBtn');
var contadoPeriodInfo = document.getElementById('contadoPeriodInfo');
var contadoWelcomeMessage = document.getElementById('contadoWelcomeMessage');
var contadoResultsContainer = document.getElementById('contadoResultsContainer');

// Variables para las gráficas
var salesChart = null;
var classificationChart = null;
var simChart = null;

// Variables de configuración
var selectedStartDate = null;
var PERIOD_DAYS = 14;
var isDataLoaded = false;
var isLoading = false;
var lastLoadParams = null;

// Cache de datos
var dataCache = {};

// Cache de detalles por clasificación
var classificationCachedDetails = {
    accesorios: [],
    menos1500: [],
    mas1500: []
};

// ==================== FUNCIONES DE FORMATO ====================

function formatCurrency(value, decimals) {
    if (decimals === undefined) decimals = 0;
    var number = parseFloat(value) || 0;
    return number.toLocaleString('es-MX', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatNumber(value) {
    var number = parseFloat(value) || 0;
    return number.toLocaleString('es-MX');
}

function formatDateInput(date) {
    if (!date) return '';
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return 'No disponible';
    try {
        var date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch(e) {
        return dateStr;
    }
}

function formatDateShort(dateStr) {
    if (!dateStr) return 'No disponible';
    try {
        var date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch(e) {
        return dateStr;
    }
}

function formatFolio(saleId) {
    return String(saleId).padStart(6, '0');
}

function formatDateForChart(date) {
    var options = { day: '2-digit', month: 'short' };
    return date.toLocaleDateString('es-MX', options);
}

// ==================== FUNCIONES DE FECHAS ====================

function getDateRange(startDate) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!startDate) {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 15);
    }
    
    var startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    var endDate = new Date(startDateTime);
    endDate.setDate(endDate.getDate() + PERIOD_DAYS);
    endDate.setHours(0, 0, 0, 0);
    
    function formatDateTimeLocal(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        var hours = String(date.getHours()).padStart(2, '0');
        var minutes = String(date.getMinutes()).padStart(2, '0');
        var seconds = String(date.getSeconds()).padStart(2, '0');
        return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }
    
    var completeDays = [];
    var current = new Date(startDateTime);
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    var lastDayOfPeriod = new Date(startDateTime);
    lastDayOfPeriod.setDate(lastDayOfPeriod.getDate() + PERIOD_DAYS);
    lastDayOfPeriod.setHours(0, 0, 0, 0);
    
    var upperLimit = new Date(Math.min(yesterday.getTime(), lastDayOfPeriod.getTime()));
    
    while (current <= upperLimit) {
        completeDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    var allDays = [];
    current = new Date(startDateTime);
    var end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    while (current < end) {
        allDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    return {
        start: formatDateTimeLocal(startDateTime),
        end: formatDateTimeLocal(endDate),
        startDate: startDateTime,
        endDate: endDate,
        completeDays: completeDays,
        allDays: allDays,
        totalCompleteDays: completeDays.length,
        totalDays: allDays.length
    };
}

// ==================== FUNCIONES DE API OPTIMIZADAS ====================

// Cache para ventas de productos
var productsCache = {};

async function fetchProductsSalesOptimized(userId, startDateTime, endDateTime) {
    var cacheKey = 'products_' + userId + '_' + startDateTime + '_' + endDateTime;
    
    if (productsCache[cacheKey]) {
        console.log('📦 Usando cache de ventas productos');
        return productsCache[cacheKey];
    }
    
    try {
        var allSales = [];
        var currentPage = 1;
        var perPage = 100;
        var totalPages = 1;
        
        console.log('📡 Consultando ventas de productos (optimizado)');
        console.log('  Inicio: ' + startDateTime);
        console.log('  Fin: ' + endDateTime);
        
        // Primera petición para obtener total de páginas
        var url = CONFIG.API_SALES + 
            '?page=1' + 
            '&per_page=' + perPage + 
            '&total=1' +
            '&sale_type=products' +
            '&start_date=' + startDateTime + 
            '&end_date=' + endDateTime +
            '&user_id=' + userId;
        
        var response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error ' + response.status);
        }
        
        var data = await response.json();
        
        // Obtener total de páginas
        if (data.meta && data.meta.last_page) {
            totalPages = data.meta.last_page;
        } else if (data.pagination && data.pagination.total_pages) {
            totalPages = data.pagination.total_pages;
        } else if (data.last_page) {
            totalPages = data.last_page;
        } else {
            totalPages = 1;
        }
        
        // Obtener todas las páginas
        for (var page = 1; page <= totalPages; page++) {
            var pageUrl = CONFIG.API_SALES + 
                '?page=' + page + 
                '&per_page=' + perPage + 
                '&total=0' +
                '&sale_type=products' +
                '&start_date=' + startDateTime + 
                '&end_date=' + endDateTime +
                '&user_id=' + userId;
            
            var pageResponse = await fetch(pageUrl, {
                headers: {
                    'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                    'Accept': 'application/json'
                }
            });
            
            if (!pageResponse.ok) continue;
            
            var pageData = await pageResponse.json();
            var pageSales = pageData.data || [];
            
            // Filtrar por usuario (por si acaso)
            var filtered = pageSales.filter(function(sale) {
                return sale.user_id == userId || 
                       sale.created_by == userId || 
                       sale.seller_id == userId;
            });
            
            allSales = allSales.concat(filtered);
            console.log('📄 Página ' + page + ': ' + filtered.length + ' ventas');
        }
        
        productsCache[cacheKey] = allSales;
        console.log('✅ Ventas de productos cargadas: ' + allSales.length);
        return allSales;
        
    } catch (error) {
        console.error('❌ Error en fetchProductsSalesOptimized:', error);
        return [];
    }
}

// ==================== FUNCIONES SIM EXPRESS OPTIMIZADAS ====================

var SIM_CONCEPT_COLORS = {
    "Chip Express Plus": "#059669",
    "Activacion ESIM": "#f59e0b",
    "Portabilidad Servicel": "#3b82f6",
    "Portabilidad Telcel": "#ea580c",
    "Recuperacion de numero": "#8b5cf6",
    "Express Numero Nuevo": "#ec489a"
};

var SIM_CONCEPT_ORDER = ["Chip Express Plus", "Activacion ESIM", "Portabilidad Servicel", "Portabilidad Telcel", "Recuperacion de numero", "Express Numero Nuevo"];
var SIM_PRODUCT_IDS = [1032, 217, 237, 238];
var E_SIM_IDS = [1060];

var simCachedDetailsByConcept = {};

// Función para obtener concepto según product_id
function getSimConceptByProductId(productId) {
    if (productId === 1032) return "Chip Express Plus";
    if (productId === 238) return "Portabilidad Servicel";
    if (productId === 237) return "Portabilidad Telcel";
    if (productId === 217) return "Recuperacion de numero";
    return null;
}

// Función para obtener la fecha sin hora
function getDateKey(dateStr) {
    if (!dateStr) return null;
    try {
        var date = new Date(dateStr);
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    } catch(e) {
        return null;
    }
}

// Función optimizada para SIM Express - solo productos específicos
async function fetchSimExpressDataOptimized(userId, startDateTime, endDateTime) {
    var cacheKey = 'sim_optimized_' + userId + '_' + startDateTime + '_' + endDateTime;
    
    if (dataCache[cacheKey]) {
        console.log('📦 Usando cache de SIM Express optimizado');
        return dataCache[cacheKey];
    }
    
    try {
        var allSimDetails = [];
        
        // 1. Obtener ventas de SIM Express (productos específicos)
        var simUrl = CONFIG.API_SALES + 
            '?page=1&per_page=100&total=0' +
            '&start_date=' + startDateTime + 
            '&end_date=' + endDateTime +
            '&sale_type=products' +
            '&user_id=' + userId;
        
        // Agregar product_ids
        SIM_PRODUCT_IDS.forEach(function(id) {
            simUrl += '&product_ids[]=' + id;
        });
        
        console.log('📡 Consultando SIM Express (productos específicos)');
        
        var simResponse = await fetch(simUrl, { 
            headers: { 
                'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            } 
        });
        
        if (simResponse.ok) {
            var simData = await simResponse.json();
            var simSales = simData.data || [];
            console.log('📱 Ventas SIM Express obtenidas:', simSales.length);
            
            for (var s = 0; s < simSales.length; s++) {
                var sale = simSales[s];
                // Verificar usuario
                if (sale.user_id != userId && sale.created_by != userId && sale.seller_id != userId) {
                    continue;
                }
                
                var details = sale.details || [];
                for (var d = 0; d < details.length; d++) {
                    var detail = details[d];
                    var productId = detail.product_id;
                    var quantity = detail.quantity || 1;
                    var concept = getSimConceptByProductId(productId);
                    
                    if (concept) {
                        var saleDate = sale.created_at || sale.sale_date;
                        var dateKey = getDateKey(saleDate);
                        
                        allSimDetails.push({
                            concept: concept,
                            quantity: quantity,
                            saleId: sale.id,
                            sellerId: sale.user ? sale.user.id : null,
                            seller: sale.user ? sale.user.name : 'No disponible',
                            branchName: sale.warehouse ? (sale.warehouse.branch ? sale.warehouse.branch.name : null) : (sale.branch_name || 'No disponible'),
                            saleDate: saleDate,
                            dateKey: dateKey
                        });
                    }
                }
            }
        }
        
        // 2. Obtener Activacion ESIM
        var esimUrl = CONFIG.API_SALES + 
            '?page=1&per_page=100&total=0' +
            '&start_date=' + startDateTime + 
            '&end_date=' + endDateTime +
            '&user_id=' + userId;
        
        E_SIM_IDS.forEach(function(id) {
            esimUrl += '&product_ids[]=' + id + '&service_ids[]=' + id;
        });
        
        console.log('📡 Consultando Activacion ESIM');
        
        var esimResponse = await fetch(esimUrl, { 
            headers: { 
                'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            } 
        });
        
        if (esimResponse.ok) {
            var esimData = await esimResponse.json();
            var esimSales = esimData.data || [];
            console.log('📱 ESIM ventas obtenidas:', esimSales.length);
            
            for (var e = 0; e < esimSales.length; e++) {
                var sale = esimSales[e];
                if (sale.user_id != userId && sale.created_by != userId && sale.seller_id != userId) {
                    continue;
                }
                
                var details = sale.details || [];
                for (var d = 0; d < details.length; d++) {
                    var detail = details[d];
                    var quantity = detail.quantity || 1;
                    var saleDate = sale.created_at || sale.sale_date;
                    var dateKey = getDateKey(saleDate);
                    
                    allSimDetails.push({
                        concept: "Activacion ESIM",
                        quantity: quantity,
                        saleId: sale.id,
                        sellerId: sale.user ? sale.user.id : null,
                        seller: sale.user ? sale.user.name : 'No disponible',
                        branchName: sale.warehouse ? (sale.warehouse.branch ? sale.warehouse.branch.name : null) : (sale.branch_name || 'No disponible'),
                        saleDate: saleDate,
                        dateKey: dateKey
                    });
                }
            }
        }
        
        // 3. Obtener Express Numero Nuevo (kits)
        try {
            var kitUrl = CONFIG.API_REPORTS + '/kits/sales/details/total?page=1&per_page=100&total=0&user_ids[]=' + userId + '&kit_ids[]=12';
            
            var formatDateForKits = function(dateStr) {
                return dateStr.replace(' ', 'T');
            };
            
            var startFormatted = formatDateForKits(startDateTime);
            var endFormatted = formatDateForKits(endDateTime);
            
            kitUrl += '&dates[]=' + startFormatted + '&dates[]=' + endFormatted;
            
            console.log('📡 Consultando Express Numero Nuevo');
            
            var kitResponse = await fetch(kitUrl, { 
                headers: { 
                    'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                } 
            });
            
            if (kitResponse.ok) {
                var kitData = await kitResponse.json();
                var ventas = kitData.data || kitData || [];
                console.log('📱 Express Nuevo ventas obtenidas:', ventas.length);
                
                for (var k = 0; k < ventas.length; k++) {
                    var venta = ventas[k];
                    if (venta.user_id != userId && venta.created_by != userId && venta.seller_id != userId) {
                        continue;
                    }
                    
                    var saleDate = venta.created_at || venta.sale_date;
                    var dateKey = getDateKey(saleDate);
                    
                    allSimDetails.push({
                        concept: "Express Numero Nuevo",
                        quantity: 1,
                        saleId: venta.id,
                        sellerId: venta.user_id || null,
                        seller: venta.user_name || 'No disponible',
                        branchName: venta.branch_name || 'No disponible',
                        saleDate: saleDate,
                        dateKey: dateKey
                    });
                }
            }
        } catch (kitError) {
            console.warn('⚠️ Error en kits:', kitError);
        }
        
        dataCache[cacheKey] = allSimDetails;
        console.log('📱 Total detalles SIM Express:', allSimDetails.length);
        return allSimDetails;
        
    } catch (error) {
        console.error('❌ Error en fetchSimExpressDataOptimized:', error);
        return [];
    }
}

// ==================== PROCESAR VENTAS ====================

function processSalesData(sales, dateRange) {
    var dailyData = {};
    
    dateRange.forEach(function(date) {
        var key = date.toISOString().split('T')[0];
        dailyData[key] = 0;
    });
    
    sales.forEach(function(sale) {
        var saleDate = new Date(sale.created_at || sale.sale_date);
        var key = saleDate.toISOString().split('T')[0];
        
        if (dailyData.hasOwnProperty(key)) {
            var total = 0;
            var details = sale.details || [];
            
            details.forEach(function(detail) {
                var amount = parseFloat(detail.total_amount) || parseFloat(detail.total) || 0;
                total += amount;
            });
            
            dailyData[key] += total;
        }
    });
    
    var labels = [];
    var values = [];
    
    for (var key in dailyData) {
        var date = new Date(key + 'T00:00:00');
        labels.push(formatDateForChart(date));
        values.push(dailyData[key]);
    }
    
    var totalSales = values.reduce(function(sum, v) { return sum + v; }, 0);
    var totalCompleteDays = dateRange.length;
    var daysWithSales = values.filter(function(v) { return v > 0; });
    var average = totalCompleteDays > 0 ? totalSales / totalCompleteDays : 0;
    
    return {
        labels: labels,
        values: values,
        totalSales: totalSales,
        daysWithSales: daysWithSales.length,
        totalCompleteDays: totalCompleteDays,
        average: average
    };
}

// ==================== PROCESAR CLASIFICACIONES CON DETALLES (CORREGIDO) ====================

function processSalesByClassificationWithDetails(sales, dateRange) {
    var dailyCount = {};
    
    dateRange.forEach(function(date) {
        var key = date.toISOString().split('T')[0];
        dailyCount[key] = {
            accesorios: 0,
            menos1500: 0,
            mas1500: 0
        };
    });
    
    // Limpiar cache de detalles
    classificationCachedDetails = {
        accesorios: [],
        menos1500: [],
        mas1500: []
    };
    
    sales.forEach(function(sale) {
        var saleDate = new Date(sale.created_at || sale.sale_date);
        var key = saleDate.toISOString().split('T')[0];
        
        if (dailyCount.hasOwnProperty(key)) {
            var details = sale.details || [];
            
            details.forEach(function(detail) {
                var product = detail.product || {};
                var classificationId = product.classification_id || null;
                var quantity = detail.quantity || 1;
                
                // CORREGIDO: Usar unit_price en lugar de price (que viene null)
                var price = parseFloat(detail.unit_price) || parseFloat(detail.price) || parseFloat(product.price) || 0;
                var total = parseFloat(detail.total_amount) || parseFloat(detail.total) || 0;
                
                var classificationType = null;
                
                if (classificationId === 2) {
                    classificationType = 'accesorios';
                    dailyCount[key].accesorios += quantity;
                } else if (classificationId === 3 || classificationId === 9) {
                    // CORREGIDO: Usar price correctamente
                    if (price >= 1500) {
                        classificationType = 'mas1500';
                        dailyCount[key].mas1500 += quantity;
                    } else {
                        classificationType = 'menos1500';
                        dailyCount[key].menos1500 += quantity;
                    }
                }
                
                // Guardar detalle para el modal si tiene clasificación
                if (classificationType) {
                    var classificationLabel = '';
                    if (classificationType === 'accesorios') classificationLabel = 'Accesorios';
                    else if (classificationType === 'menos1500') classificationLabel = 'Teléfonos < $1,500';
                    else if (classificationType === 'mas1500') classificationLabel = 'Teléfonos ≥ $1,500';
                    
                    classificationCachedDetails[classificationType].push({
                        saleId: sale.id,
                        folio: formatFolio(sale.id),
                        date: sale.created_at || sale.sale_date,
                        seller: sale.user ? sale.user.name : 'No disponible',
                        product: product.name || 'Producto',
                        quantity: quantity,
                        price: price,
                        total: total,
                        classification: classificationLabel
                    });
                }
            });
        }
    });
    
    var labels = [];
    var accesoriosData = [];
    var menos1500Data = [];
    var mas1500Data = [];
    
    for (var key in dailyCount) {
        var date = new Date(key + 'T00:00:00');
        labels.push(formatDateForChart(date));
        accesoriosData.push(dailyCount[key].accesorios);
        menos1500Data.push(dailyCount[key].menos1500);
        mas1500Data.push(dailyCount[key].mas1500);
    }
    
    var hasData = false;
    var datasets = [];
    
    var hasAccesorios = accesoriosData.some(function(v) { return v > 0; });
    var hasMenos1500 = menos1500Data.some(function(v) { return v > 0; });
    var hasMas1500 = mas1500Data.some(function(v) { return v > 0; });
    
    if (hasAccesorios) {
        hasData = true;
        datasets.push({
            label: 'Accesorios',
            data: accesoriosData,
            backgroundColor: '#f59e0b70',
            borderColor: '#f59e0b',
            borderWidth: 1
        });
    }
    
    if (hasMenos1500) {
        hasData = true;
        datasets.push({
            label: 'Teléfonos < $1,500',
            data: menos1500Data,
            backgroundColor: '#3b82f670',
            borderColor: '#3b82f6',
            borderWidth: 1
        });
    }
    
    if (hasMas1500) {
        hasData = true;
        datasets.push({
            label: 'Teléfonos ≥ $1,500',
            data: mas1500Data,
            backgroundColor: '#10b98170',
            borderColor: '#10b981',
            borderWidth: 1
        });
    }
    
    // Calcular totales
    var totals = {
        accesorios: classificationCachedDetails.accesorios.length,
        menos1500: classificationCachedDetails.menos1500.length,
        mas1500: classificationCachedDetails.mas1500.length
    };
    
    return {
        labels: labels,
        datasets: datasets,
        hasData: hasData,
        totals: totals,
        details: classificationCachedDetails
    };
}

// ==================== PROCESAR PIEZAS POR PRECIO (CORREGIDO) ====================

function processPiecesByClassification(sales, dateRange) {
    var totals = {
        accesorios: 0,
        menos1500: 0,
        mas1500: 0
    };
    
    var validDates = new Set();
    dateRange.forEach(function(date) {
        var key = date.toISOString().split('T')[0];
        validDates.add(key);
    });
    
    sales.forEach(function(sale) {
        var saleDate = new Date(sale.created_at || sale.sale_date);
        var key = saleDate.toISOString().split('T')[0];
        
        if (validDates.has(key)) {
            var details = sale.details || [];
            
            details.forEach(function(detail) {
                var product = detail.product || {};
                var classificationId = product.classification_id || null;
                var quantity = detail.quantity || 1;
                // CORREGIDO: Usar unit_price
                var price = parseFloat(detail.unit_price) || parseFloat(detail.price) || parseFloat(product.price) || 0;
                
                if (classificationId === 2) {
                    totals.accesorios += quantity;
                } else if (classificationId === 3 || classificationId === 9) {
                    if (price >= 1500) {
                        totals.mas1500 += quantity;
                    } else {
                        totals.menos1500 += quantity;
                    }
                }
            });
        }
    });
    
    return {
        accesorios: totals.accesorios,
        menos1500: totals.menos1500,
        mas1500: totals.mas1500
    };
}

// ==================== PROCESAR SIM EXPRESS POR DÍA (CORREGIDO) ====================

function processSimExpressByDay(simDetails, dateRange) {
    console.log('📱 Procesando SIM Express por día...');
    console.log('📱 Detalles a procesar:', simDetails.length);
    
    if (simDetails.length === 0) {
        console.log('📱 No hay detalles de SIM Express para procesar');
        return {
            labels: [],
            datasets: [],
            conceptTotals: {},
            totalUnidades: 0,
            hasData: false
        };
    }
    
    // Mostrar todos los detalles con sus fechas para depuración
    console.log('📱 Detalles con fechas:');
    simDetails.forEach(function(d, i) {
        if (i < 10) console.log('  - ' + d.concept + ' | ' + d.dateKey + ' | qty: ' + d.quantity);
    });
    if (simDetails.length > 10) console.log('  ... y ' + (simDetails.length - 10) + ' más');
    
    // Obtener TODAS las fechas únicas de los detalles
    var availableDates = [];
    simDetails.forEach(function(d) {
        if (d.dateKey && availableDates.indexOf(d.dateKey) === -1) {
            availableDates.push(d.dateKey);
        }
    });
    console.log('📱 Fechas disponibles en detalles:', availableDates.sort());
    
    // Si no hay fechas disponibles, intentar extraer de saleDate
    if (availableDates.length === 0) {
        console.log('⚠️ No se encontraron dateKey, intentando extraer de saleDate...');
        simDetails.forEach(function(d) {
            if (d.saleDate) {
                var dateKey = getDateKey(d.saleDate);
                if (dateKey && availableDates.indexOf(dateKey) === -1) {
                    availableDates.push(dateKey);
                }
            }
        });
        console.log('📱 Fechas extraídas de saleDate:', availableDates.sort());
    }
    
    // Si aún no hay fechas, usar las del rango
    if (availableDates.length === 0) {
        console.log('⚠️ No se encontraron fechas, usando rango');
        dateRange.forEach(function(date) {
            var key = date.toISOString().split('T')[0];
            availableDates.push(key);
        });
    }
    
    // Ordenar las fechas
    var sortedKeys = availableDates.sort();
    console.log('📱 Fechas ordenadas a mostrar:', sortedKeys);
    
    // Inicializar estructura de datos con todas las fechas
    var dailyData = {};
    sortedKeys.forEach(function(key) {
        dailyData[key] = {};
        SIM_CONCEPT_ORDER.forEach(function(concept) {
            dailyData[key][concept] = 0;
        });
    });
    
    // Procesar cada detalle y acumular por fecha y concepto
    var processedCount = 0;
    simDetails.forEach(function(detail) {
        // Obtener la fecha del detalle
        var dateKey = detail.dateKey;
        if (!dateKey && detail.saleDate) {
            dateKey = getDateKey(detail.saleDate);
        }
        
        if (!dateKey) {
            console.warn('⚠️ Detalle sin fecha:', detail);
            return;
        }
        
        var concept = detail.concept;
        var quantity = detail.quantity || 1;
        
        if (dailyData.hasOwnProperty(dateKey)) {
            if (dailyData[dateKey].hasOwnProperty(concept)) {
                dailyData[dateKey][concept] += quantity;
                processedCount++;
            } else {
                console.warn('⚠️ Concepto no encontrado para fecha:', dateKey, concept);
            }
        } else {
            // Si la fecha no existe, la agregamos
            console.log('📱 Agregando fecha no prevista:', dateKey);
            dailyData[dateKey] = {};
            SIM_CONCEPT_ORDER.forEach(function(c) {
                dailyData[dateKey][c] = 0;
            });
            dailyData[dateKey][concept] = quantity;
            processedCount++;
            // Reordenar keys
            sortedKeys = Object.keys(dailyData).sort();
        }
    });
    
    console.log('📱 Detalles procesados:', processedCount);
    
    // Verificar datos acumulados
    console.log('📱 Datos acumulados por día:');
    var conceptLabels = SIM_CONCEPT_ORDER.join(', ');
    sortedKeys.forEach(function(key) {
        var values = SIM_CONCEPT_ORDER.map(function(c) { return dailyData[key][c]; });
        var total = values.reduce(function(a, b) { return a + b; }, 0);
        if (total > 0) {
            console.log('  ' + key + ': ' + values.join(', ') + ' (total: ' + total + ')');
        }
    });
    
    // Preparar labels (formateados para la gráfica)
    var labels = [];
    sortedKeys.forEach(function(key) {
        var date = new Date(key + 'T00:00:00');
        // Formato: "26 Jun" o "27 Jun"
        var month = date.toLocaleString('es-MX', { month: 'short' });
        var day = date.getDate();
        labels.push(day + ' ' + month);
    });
    console.log('📱 Labels para gráfica:', labels);
    
    // Crear datasets por concepto
    var datasets = [];
    SIM_CONCEPT_ORDER.forEach(function(concept) {
        var data = [];
        var hasData = false;
        
        sortedKeys.forEach(function(key) {
            var value = dailyData[key][concept] || 0;
            data.push(value);
            if (value > 0) hasData = true;
        });
        
        if (hasData) {
            console.log('📊 ' + concept + ' datos:', data);
            datasets.push({
                label: concept,
                data: data,
                backgroundColor: SIM_CONCEPT_COLORS[concept] + '70',
                borderColor: SIM_CONCEPT_COLORS[concept],
                borderWidth: 2,
                borderRadius: 4
            });
        } else {
            console.log('📊 ' + concept + ' no tiene datos');
        }
    });
    
    // Calcular totales por concepto
    var conceptTotals = {};
    SIM_CONCEPT_ORDER.forEach(function(concept) {
        conceptTotals[concept] = 0;
        sortedKeys.forEach(function(key) {
            conceptTotals[concept] += dailyData[key][concept] || 0;
        });
    });
    
    var totalUnidades = 0;
    SIM_CONCEPT_ORDER.forEach(function(concept) {
        totalUnidades += conceptTotals[concept];
    });
    
    console.log('📱 Total unidades:', totalUnidades);
    console.log('📱 Datasets a renderizar:', datasets.length);
    console.log('📱 Concept totals:', conceptTotals);
    
    return {
        labels: labels,
        datasets: datasets,
        conceptTotals: conceptTotals,
        totalUnidades: totalUnidades,
        hasData: datasets.length > 0
    };
}

// ==================== RENDER GRÁFICA SIM EXPRESS (CORREGIDO) ====================

function renderSimChart(simData) {
    var ctx = document.getElementById('contadoSimChart');
    if (!ctx) {
        console.warn('⚠️ No se encontró el canvas contadoSimChart');
        return;
    }
    
    if (simChart) {
        simChart.destroy();
        simChart = null;
    }
    
    console.log('📊 Renderizando gráfica SIM Express...');
    console.log('📊 Labels:', simData.labels);
    console.log('📊 Datasets:', simData.datasets.length);
    console.log('📊 HasData:', simData.hasData);
    
    if (!simData || !simData.hasData || simData.datasets.length === 0 || simData.labels.length === 0) {
        console.log('📱 No hay datos de SIM Express para mostrar');
        var parent = ctx.parentElement;
        if (parent) {
            parent.innerHTML = 
                '<div style="text-align: center; padding: 40px; color: #94a3b8;">' +
                '<div style="font-size: 3rem; margin-bottom: 12px;">📱</div>' +
                '<p>No hay ventas de SIM Express en el período seleccionado</p>' +
                '</div>';
        }
        return;
    }
    
    console.log('📊 Creando gráfica con:', simData.labels.length, 'días y', simData.datasets.length, 'conceptos');
    
    simChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: simData.labels,
            datasets: simData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatNumber(context.raw) + ' unidades';
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: false
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return formatNumber(value);
                        },
                        font: { size: 10 }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfica SIM Express renderizada correctamente');
}

// ==================== GRÁFICAS ====================

function renderSalesChart(labels, values) {
    var ctx = document.getElementById('contadoSalesChart');
    if (!ctx) return;
    
    if (salesChart) {
        salesChart.destroy();
        salesChart = null;
    }
    
    var totalDays = values.length;
    var average = totalDays > 0 ? 
        values.reduce(function(sum, v) { return sum + v; }, 0) / totalDays : 0;
    
    var averageLine = values.map(function() { return average; });
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventas de Contado',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    order: 1
                },
                {
                    label: 'Promedio Diario',
                    data: averageLine,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.0)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return '📊 Promedio: $' + formatCurrency(context.raw, 2);
                            }
                            return '💰 $' + formatCurrency(context.raw, 2) + ' MXN';
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + formatCurrency(value, 0);
                        },
                        font: { size: 10 }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderClassificationChart(labels, datasets, hasData) {
    var ctx = document.getElementById('contadoClassificationChart');
    if (!ctx) return;
    
    if (classificationChart) {
        classificationChart.destroy();
        classificationChart = null;
    }
    
    if (!hasData || datasets.length === 0) {
        var parent = ctx.parentElement;
        if (parent) {
            parent.innerHTML = 
                '<div style="text-align: center; padding: 40px; color: #94a3b8;">' +
                '<div style="font-size: 3rem; margin-bottom: 12px;">📊</div>' +
                '<p>No hay ventas por clasificación en el período seleccionado</p>' +
                '</div>';
        }
        return;
    }
    
    classificationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var count = context.raw;
                            return context.dataset.label + ': ' + formatNumber(count) + ' venta' + (count !== 1 ? 's' : '');
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return formatNumber(value);
                        },
                        font: { size: 10 }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                }
            }
        }
    });
}

function renderSimChart(simData) {
    var ctx = document.getElementById('contadoSimChart');
    if (!ctx) return;
    
    if (simChart) {
        simChart.destroy();
        simChart = null;
    }
    
    if (!simData || !simData.hasData || simData.datasets.length === 0) {
        var parent = ctx.parentElement;
        if (parent) {
            parent.innerHTML = 
                '<div style="text-align: center; padding: 40px; color: #94a3b8;">' +
                '<div style="font-size: 3rem; margin-bottom: 12px;">📱</div>' +
                '<p>No hay ventas de SIM Express en el período seleccionado</p>' +
                '</div>';
        }
        return;
    }
    
    simChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: simData.labels,
            datasets: simData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatNumber(context.raw) + ' unidades';
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return formatNumber(value);
                        },
                        font: { size: 10 }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                }
            }
        }
    });
}

// ==================== FUNCIONES DEL MODAL ====================

function openClassificationModal(classificationType) {
    var details = classificationCachedDetails[classificationType] || [];
    
    if (details.length === 0) {
        alert('No hay ventas de esta clasificación en el período seleccionado');
        return;
    }
    
    var classificationLabels = {
        accesorios: 'Accesorios',
        menos1500: 'Teléfonos < $1,500',
        mas1500: 'Teléfonos ≥ $1,500'
    };
    
    var classificationColors = {
        accesorios: '#f59e0b',
        menos1500: '#3b82f6',
        mas1500: '#10b981'
    };
    
    var label = classificationLabels[classificationType] || classificationType;
    var color = classificationColors[classificationType] || '#64748b';
    
    var totalVentas = details.length;
    var totalUnidades = details.reduce(function(sum, d) { return sum + d.quantity; }, 0);
    var totalMonto = details.reduce(function(sum, d) { return sum + d.total; }, 0);
    
    details.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    
    var modal = document.getElementById('contadoClassificationModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contadoClassificationModal';
        modal.className = 'modal';
        modal.innerHTML = 
            '<div class="modal-content" style="max-width: 950px;">' +
            '<div class="modal-header">' +
            '<h3 id="contadoClassificationModalTitle">📊 Detalle de ventas</h3>' +
            '<span class="close-modal">&times;</span>' +
            '</div>' +
            '<div class="modal-body" id="contadoClassificationModalBody"></div>' +
            '<div class="modal-footer">Clasificación de ventas</div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.querySelector('.close-modal').onclick = function() { modal.style.display = 'none'; };
        window.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
    }
    
    document.getElementById('contadoClassificationModalTitle').innerHTML = '📊 ' + label + ' - ' + totalVentas + ' ventas';
    
    var tableHtml = 
        '<div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">' +
        '<div style="background: ' + color + '; color: white; padding: 12px 20px; border-radius: 8px; flex: 1; text-align: center; min-width: 120px;">' +
        '<div style="font-size: 1.5rem; font-weight: 700;">' + totalVentas + '</div>' +
        '<div style="font-size: 0.8rem; opacity: 0.85;">Ventas realizadas</div>' +
        '</div>' +
        '<div style="background: ' + color + '; color: white; padding: 12px 20px; border-radius: 8px; flex: 1; text-align: center; min-width: 120px;">' +
        '<div style="font-size: 1.5rem; font-weight: 700;">' + totalUnidades + '</div>' +
        '<div style="font-size: 0.8rem; opacity: 0.85;">Total Unidades</div>' +
        '</div>' +
        '<div style="background: ' + color + '; color: white; padding: 12px 20px; border-radius: 8px; flex: 1; text-align: center; min-width: 120px;">' +
        '<div style="font-size: 1.5rem; font-weight: 700;">$' + formatCurrency(totalMonto, 0) + '</div>' +
        '<div style="font-size: 0.8rem; opacity: 0.85;">Total Monto</div>' +
        '</div>' +
        '</div>' +
        '<div style="max-height: 450px; overflow-y: auto;">' +
        '<table style="width: 100%; border-collapse: collapse;">' +
        '<thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">' +
        '<tr>' +
        '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">#</th>' +
        '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Fecha</th>' +
        '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Asesor</th>' +
        '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Producto</th>' +
        '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">Cantidad</th>' +
        '<th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>' +
        '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">Folio</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
    
    var index = 1;
    for (var i = 0; i < details.length; i++) {
        var detalle = details[i];
        var ticketUrl = 'https://sales.gcasan.com/api/sales/' + detalle.saleId + '/receipt';
        var fechaFormateada = formatDateShort(detalle.date);
        var rowBg = (i % 2 === 0) ? '#ffffff' : '#f8fafc';
        
        tableHtml += 
            '<tr style="border-bottom: 1px solid #e2e8f0; background-color: ' + rowBg + ';">' +
            '<td style="padding: 8px; text-align: center;">' + index + '</td>' +
            '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + fechaFormateada + '</td>' +
            '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + escapeHtml(detalle.seller) + '</td>' +
            '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + escapeHtml(detalle.product) + '</td>' +
            '<td style="padding: 8px; text-align: center; font-weight: bold;">' + detalle.quantity + '</td>' +
            '<td style="padding: 8px; text-align: right; font-weight: bold;">$' + formatCurrency(detalle.total, 0) + '</td>' +
            '<td style="padding: 8px; text-align: center;">' +
            '<a href="' + ticketUrl + '" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 0.9rem; padding: 4px 12px; background: #eff6ff; border-radius: 4px; border: 1px solid #bfdbfe; transition: all 0.2s; display: inline-block;" onmouseover="this.style.background=\'#bfdbfe\'" onmouseout="this.style.background=\'#eff6ff\'">' +
            '#' + detalle.folio +
            ' 🧾' +
            '</a>' +
            '</td>' +
            '</tr>';
        index++;
    }
    
    tableHtml += 
        '</tbody>' +
        '</table>' +
        '</div>' +
        '<div style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8; text-align: center;">' +
        '💡 Haz clic en el folio 🧾 para ver el ticket de la venta' +
        '</div>';
    
    document.getElementById('contadoClassificationModalBody').innerHTML = tableHtml;
    modal.style.display = 'block';
}

function openSimConceptModal(concept) {
    var detalles = simCachedDetailsByConcept[concept] || [];
    
    if (detalles.length === 0) {
        alert('No hay ventas de ' + concept + ' para este período');
        return;
    }
    
    var totalUnidades = detalles.reduce(function(sum, d) { return sum + d.quantity; }, 0);
    var conceptColor = SIM_CONCEPT_COLORS[concept] || "#64748b";
    
    detalles.sort(function(a, b) {
        return new Date(b.saleDate) - new Date(a.saleDate);
    });
    
    var modal = document.getElementById('contadoSimConceptModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contadoSimConceptModal';
        modal.className = 'modal';
        modal.innerHTML = 
            '<div class="modal-content" style="max-width: 850px;">' +
            '<div class="modal-header">' +
            '<h3 id="contadoSimConceptModalTitle">📱 Detalle de ventas</h3>' +
            '<span class="close-modal">&times;</span>' +
            '</div>' +
            '<div class="modal-body" id="contadoSimConceptModalBody"></div>' +
            '<div class="modal-footer">SIM Express - Ventas del período</div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.querySelector('.close-modal').onclick = function() { modal.style.display = 'none'; };
        window.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
    }
    
    document.getElementById('contadoSimConceptModalTitle').innerHTML = '📱 ' + concept + ' - ' + totalUnidades + ' unidades';
    
    var tableHtml = 
        '<div style="margin-bottom: 16px; display: flex; gap: 12px;">' +
        '<div style="background: ' + conceptColor + '; color: white; padding: 12px 20px; border-radius: 8px; flex: 1; text-align: center;">' +
        '<div style="font-size: 1.5rem; font-weight: 700;">' + detalles.length + '</div>' +
        '<div style="font-size: 0.8rem; opacity: 0.85;">Ventas realizadas</div>' +
        '</div>' +
        '<div style="background: ' + conceptColor + '; color: white; padding: 12px 20px; border-radius: 8px; flex: 1; text-align: center;">' +
        '<div style="font-size: 1.5rem; font-weight: 700;">' + totalUnidades + '</div>' +
        '<div style="font-size: 0.8rem; opacity: 0.85;">Total Unidades</div>' +
        '</div>' +
        '</div>' +
        '<div style="max-height: 450px; overflow-y: auto;">' +
        '<table style="width: 100%; border-collapse: collapse;">' +
        '<thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">' +
        '<tr>' +
        '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">#</th>' +
        '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Fecha</th>' +
        '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Asesor</th>' +
        '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">Folio</th>' +
        '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">Unidades</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
    
    var index = 1;
    for (var i = 0; i < detalles.length; i++) {
        var detalle = detalles[i];
        var folio = formatFolio(detalle.saleId);
        var ticketUrl = 'https://sales.gcasan.com/api/sales/' + detalle.saleId + '/receipt';
        var fechaFormateada = formatDateShort(detalle.saleDate);
        var rowBg = (i % 2 === 0) ? '#ffffff' : '#f8fafc';
        
        tableHtml += 
            '<tr style="border-bottom: 1px solid #e2e8f0; background-color: ' + rowBg + ';">' +
            '<td style="padding: 8px; text-align: center;">' + index + '</td>' +
            '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + fechaFormateada + '</td>' +
            '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + escapeHtml(detalle.seller) + '</td>' +
            '<td style="padding: 8px; text-align: center;">' +
            '<a href="' + ticketUrl + '" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 0.9rem; padding: 4px 12px; background: #eff6ff; border-radius: 4px; border: 1px solid #bfdbfe; transition: all 0.2s; display: inline-block;" onmouseover="this.style.background=\'#bfdbfe\'" onmouseout="this.style.background=\'#eff6ff\'">' +
            '#' + folio +
            ' 🧾' +
            '</a>' +
            '</td>' +
            '<td style="padding: 8px; text-align: center; font-weight: bold;">' + detalle.quantity + '</td>' +
            '</tr>';
        index++;
    }
    
    tableHtml += 
        '</tbody>' +
        '</table>' +
        '</div>' +
        '<div style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8; text-align: center;">' +
        '💡 Haz clic en el folio 🧾 para ver el ticket de la venta' +
        '</div>';
    
    document.getElementById('contadoSimConceptModalBody').innerHTML = tableHtml;
    modal.style.display = 'block';
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== CONFIGURAR TARJETAS ====================

function setupSimExpressCards() {
    var concepts = [
        { id: 'contadoSimChipExpress', concept: 'Chip Express Plus' },
        { id: 'contadoSimActivacionESIM', concept: 'Activacion ESIM' },
        { id: 'contadoSimPortabilidadServicel', concept: 'Portabilidad Servicel' },
        { id: 'contadoSimPortabilidadTelcel', concept: 'Portabilidad Telcel' },
        { id: 'contadoSimRecuperacion', concept: 'Recuperacion de numero' },
        { id: 'contadoSimExpressNuevo', concept: 'Express Numero Nuevo' }
    ];
    
    for (var i = 0; i < concepts.length; i++) {
        var item = concepts[i];
        var card = document.getElementById(item.id);
        if (card) {
            card.addEventListener('click', function() {
                var concept = this.getAttribute('data-concept');
                openSimConceptModal(concept);
            });
        }
    }
}

function setupClassificationCards() {
    var classifications = [
        { id: 'contadoStatAccesorios', type: 'accesorios' },
        { id: 'contadoStatMenos1500', type: 'menos1500' },
        { id: 'contadoStatMas1500', type: 'mas1500' }
    ];
    
    for (var i = 0; i < classifications.length; i++) {
        var item = classifications[i];
        var card = document.getElementById(item.id);
        if (card) {
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s';
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.02)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
            card.addEventListener('click', function() {
                var type = this.getAttribute('data-classification-type');
                if (!type) {
                    var id = this.id;
                    if (id === 'contadoStatAccesorios') type = 'accesorios';
                    else if (id === 'contadoStatMenos1500') type = 'menos1500';
                    else if (id === 'contadoStatMas1500') type = 'mas1500';
                }
                openClassificationModal(type);
            });
        }
    }
}

// ==================== CARGAR DATOS DE CONTADO ====================

async function loadContadoData() {
    if (isLoading) {
        console.log('⏳ Carga en progreso, ignorando...');
        return;
    }
    
    try {
        var user = window.getCurrentUser ? window.getCurrentUser() : null;
        
        if (!user || !user.id) {
            console.warn('⚠️ Usuario no disponible');
            return;
        }
        
        if (!selectedStartDate) {
            if (contadoPeriodInfo) contadoPeriodInfo.textContent = '⚠️ Por favor selecciona una fecha de inicio';
            return;
        }
        
        var dateRangeObj = getDateRange(selectedStartDate);
        
        var loadKey = user.id + '_' + dateRangeObj.start + '_' + dateRangeObj.end;
        if (lastLoadParams === loadKey && isDataLoaded) {
            console.log('📦 Datos ya cargados');
            return;
        }
        
        isLoading = true;
        lastLoadParams = loadKey;
        
        console.log('📊 Cargando datos para: ' + user.name);
        
        if (contadoWelcomeMessage) contadoWelcomeMessage.style.display = 'none';
        if (contadoResultsContainer) contadoResultsContainer.style.display = 'block';
        
        // Mostrar loading
        var ventasEl = document.getElementById('contadoStatVentas');
        var promedioEl = document.getElementById('contadoStatPromedio');
        var diasEl = document.getElementById('contadoStatDias');
        var diasTotalesEl = document.getElementById('contadoStatDiasTotales');
        
        if (ventasEl) ventasEl.textContent = '...';
        if (promedioEl) promedioEl.textContent = '...';
        if (diasEl) diasEl.textContent = '...';
        if (diasTotalesEl) diasTotalesEl.textContent = '...';
        
        var completeDays = dateRangeObj.completeDays;
        
        if (completeDays.length === 0) {
            if (contadoPeriodInfo) contadoPeriodInfo.textContent = '⚠️ No hay días completos';
            if (contadoResultsContainer) contadoResultsContainer.style.display = 'none';
            if (contadoWelcomeMessage) {
                contadoWelcomeMessage.style.display = 'block';
                contadoWelcomeMessage.innerHTML = 
                    '<h3>⏳ Esperando días completos</h3>' +
                    '<p>Espera a que termine el día para ver datos.</p>';
            }
            isLoading = false;
            return;
        }
        
        var startFormatted = formatDateDisplay(dateRangeObj.startDate);
        var endFormatted = formatDateDisplay(dateRangeObj.endDate);
        if (contadoPeriodInfo) {
            contadoPeriodInfo.textContent = '📅 Período: ' + startFormatted + ' - ' + endFormatted + ' (' + completeDays.length + ' días completos)';
        }
        
        // ========== OBTENER VENTAS PRODUCTOS (OPTIMIZADO) ==========
        var allSales = await fetchProductsSalesOptimized(user.id, dateRangeObj.start, dateRangeObj.end);
        console.log('📊 Ventas de productos obtenidas: ' + allSales.length);
        
        // Procesar datos
        var classificationData = processSalesByClassificationWithDetails(allSales, completeDays);
        var processedData = processSalesData(allSales, completeDays);
        var piecesData = processPiecesByClassification(allSales, completeDays);
        
        // Renderizar gráficas
        renderSalesChart(processedData.labels, processedData.values);
        renderClassificationChart(
            classificationData.labels, 
            classificationData.datasets, 
            classificationData.hasData
        );
        
        // Actualizar estadísticas
        if (ventasEl) ventasEl.textContent = '$' + formatCurrency(processedData.totalSales, 0);
        if (promedioEl) promedioEl.textContent = '$' + formatCurrency(processedData.average, 0);
        if (diasEl) diasEl.textContent = formatNumber(processedData.daysWithSales);
        if (diasTotalesEl) diasTotalesEl.textContent = formatNumber(processedData.totalCompleteDays);
        
        // Actualizar tarjetas de clasificación
        var accesoriosEl = document.getElementById('contadoStatAccesorios');
        var menos1500El = document.getElementById('contadoStatMenos1500');
        var mas1500El = document.getElementById('contadoStatMas1500');
        
        if (accesoriosEl) {
            accesoriosEl.setAttribute('data-classification-type', 'accesorios');
            accesoriosEl.textContent = formatNumber(piecesData.accesorios);
        }
        if (menos1500El) {
            menos1500El.setAttribute('data-classification-type', 'menos1500');
            menos1500El.textContent = formatNumber(piecesData.menos1500);
        }
        if (mas1500El) {
            mas1500El.setAttribute('data-classification-type', 'mas1500');
            mas1500El.textContent = formatNumber(piecesData.mas1500);
        }
        
        // ========== SIM EXPRESS (OPTIMIZADO) ==========
        try {
            console.log('📱 Cargando SIM Express optimizado...');
            
            var allSimDetails = await fetchSimExpressDataOptimized(user.id, dateRangeObj.start, dateRangeObj.end);
            console.log('📱 Total detalles SIM obtenidos:', allSimDetails.length);
            
            // Guardar detalles para el modal
            simCachedDetailsByConcept = {};
            SIM_CONCEPT_ORDER.forEach(function(concept) {
                simCachedDetailsByConcept[concept] = allSimDetails.filter(function(d) {
                    return d.concept === concept;
                });
                console.log('📱 ' + concept + ': ' + simCachedDetailsByConcept[concept].length + ' detalles');
            });
            
            // Procesar SIM Express por día
            var simData = processSimExpressByDay(allSimDetails, completeDays);
            console.log('📱 SIM Express procesado:', simData.totalUnidades, 'unidades');
            
            // Actualizar tarjetas SIM Express
            var totalUnidadesEl = document.getElementById('contadoSimTotalUnidades');
            var chipExpressEl = document.getElementById('contadoSimChipExpressCount');
            var esimEl = document.getElementById('contadoSimActivacionESIMCount');
            var portabilidadServicelEl = document.getElementById('contadoSimPortabilidadServicelCount');
            var portabilidadTelcelEl = document.getElementById('contadoSimPortabilidadTelcelCount');
            var recuperacionEl = document.getElementById('contadoSimRecuperacionCount');
            var expressNuevoEl = document.getElementById('contadoSimExpressNuevoCount');
            
            if (totalUnidadesEl) totalUnidadesEl.textContent = simData.totalUnidades;
            if (chipExpressEl) chipExpressEl.textContent = simData.conceptTotals["Chip Express Plus"] || 0;
            if (esimEl) esimEl.textContent = simData.conceptTotals["Activacion ESIM"] || 0;
            if (portabilidadServicelEl) portabilidadServicelEl.textContent = simData.conceptTotals["Portabilidad Servicel"] || 0;
            if (portabilidadTelcelEl) portabilidadTelcelEl.textContent = simData.conceptTotals["Portabilidad Telcel"] || 0;
            if (recuperacionEl) recuperacionEl.textContent = simData.conceptTotals["Recuperacion de numero"] || 0;
            if (expressNuevoEl) expressNuevoEl.textContent = simData.conceptTotals["Express Numero Nuevo"] || 0;
            
            // Renderizar gráfica SIM Express
            renderSimChart(simData);
            
        } catch (simError) {
            console.error('❌ Error en SIM Express:', simError);
        }
        
        isDataLoaded = true;
        isLoading = false;
        
    } catch (error) {
        console.error('❌ Error:', error);
        if (contadoPeriodInfo) contadoPeriodInfo.textContent = '❌ Error al cargar los datos';
        if (contadoResultsContainer) contadoResultsContainer.style.display = 'none';
        if (contadoWelcomeMessage) {
            contadoWelcomeMessage.style.display = 'block';
            contadoWelcomeMessage.innerHTML = 
                '<h3>❌ Error</h3>' +
                '<p>' + error.message + '</p>';
        }
        isLoading = false;
    }
}

// ==================== SELECCIONAR FECHA ====================

function setupContadoDatePicker() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() - 15);
    
    if (!selectedStartDate) {
        selectedStartDate = defaultDate;
        if (contadoDatePicker) contadoDatePicker.value = formatDateInput(selectedStartDate);
        sessionStorage.setItem('selected_start_date', selectedStartDate.toISOString());
    } else {
        if (contadoDatePicker) contadoDatePicker.value = formatDateInput(selectedStartDate);
    }
    
    if (contadoApplyBtn) {
        contadoApplyBtn.addEventListener('click', function() {
            var dateValue = contadoDatePicker ? contadoDatePicker.value : '';
            if (dateValue) {
                var parts = dateValue.split('-');
                selectedStartDate = new Date(parts[0], parts[1] - 1, parts[2]);
                sessionStorage.setItem('selected_start_date', selectedStartDate.toISOString());
                // Limpiar cache al cambiar fecha
                dataCache = {};
                productsCache = {};
                loadContadoData();
            } else {
                if (contadoPeriodInfo) contadoPeriodInfo.textContent = '⚠️ Por favor selecciona una fecha';
            }
        });
    }
    
    if (contadoDatePicker) {
        contadoDatePicker.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (contadoApplyBtn) contadoApplyBtn.click();
            }
        });
    }
    
    // Estado inicial
    if (contadoResultsContainer) contadoResultsContainer.style.display = 'none';
    if (contadoWelcomeMessage) {
        contadoWelcomeMessage.style.display = 'block';
        contadoWelcomeMessage.innerHTML = 
            '<h3>👋 ¡Bienvenido!</h3>' +
            '<p>Selecciona una fecha de inicio y presiona "Consultar" para ver los datos</p>';
    }
    
    if (contadoPeriodInfo) {
        contadoPeriodInfo.textContent = '📅 Selecciona una fecha y presiona "Consultar"';
    }
}

// ==================== INICIALIZAR ====================

function initContadoModule() {
    console.log('🚀 Inicializando módulo de contado...');
    setupContadoDatePicker();
    setupSimExpressCards();
    setupClassificationCards();
}

function setContadoDefaultDate(date) {
    selectedStartDate = date;
    if (contadoDatePicker) {
        contadoDatePicker.value = formatDateInput(date);
    }
    sessionStorage.setItem('selected_start_date', date.toISOString());
}

// ==================== EXPORTAR ====================
window.loadContadoData = loadContadoData;
window.initContadoModule = initContadoModule;
window.setContadoDefaultDate = setContadoDefaultDate;

// ==================== INICIALIZAR ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initContadoModule, 500);
    });
} else {
    setTimeout(initContadoModule, 500);
}