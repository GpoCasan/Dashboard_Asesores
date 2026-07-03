// ==================== MÓDULO: VENTAS A CRÉDITO (ASESORES) ====================

// ==================== DOM ELEMENTS ====================
var creditDatePicker = document.getElementById('creditDatePicker');
var creditApplyBtn = document.getElementById('creditApplyBtn');
var creditPeriodInfo = document.getElementById('creditPeriodInfo');
var creditStats = document.getElementById('creditStats');
var creditResults = document.getElementById('creditResults');
var creditLoading = document.getElementById('creditLoading');
var creditEmpty = document.getElementById('creditEmpty');
var creditChartContainer = document.getElementById('creditChartContainer');

// Variables de caché
var cachedCreditData = null;
var creditChart = null;

// ==================== FUNCIONES DE UTILIDAD ====================

function getCreditDateRange(startDate) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!startDate) {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 15);
    }
    
    var startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    var endDate = new Date(startDateTime);
    endDate.setDate(endDate.getDate() + 14);
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
    
    return {
        start: formatDateTimeLocal(startDateTime),
        end: formatDateTimeLocal(endDate),
        startDate: startDateTime,
        endDate: endDate
    };
}

function isValidImei(value) {
    if (!value) return false;
    var str = String(value).trim();
    if (str.length < 14 || str.length > 16) return false;
    return /^[0-9]{14,16}$/.test(str);
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function formatDateInput(date) {
    if (!date) return '';
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function formatFolio(saleId) {
    return String(saleId).padStart(6, '0');
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

// ==================== COLORES PARA PLATAFORMAS ====================

var platformColors = [
    '#7c3aed',
    '#059669',
    '#dc2626',
    '#f59e0b',
    '#3b82f6',
    '#ec4899',
    '#14b8a6',
    '#8b5cf6',
    '#f97316',
    '#06b6d4'
];

function getPlatformColor(index) {
    return platformColors[index % platformColors.length];
}

// ==================== MOSTRAR ERRORES ====================

function showCreditError(message) {
    var errorDiv = document.getElementById('creditError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'creditError';
        errorDiv.className = 'login-error';
        errorDiv.style.marginTop = '10px';
        var parent = document.getElementById('creditoModule');
        if (parent) {
            parent.insertBefore(errorDiv, parent.firstChild);
        }
    }
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#fee2e2';
    errorDiv.style.color = '#dc2626';
    errorDiv.style.padding = '12px';
    errorDiv.style.borderRadius = '10px';
    errorDiv.style.fontSize = '0.85rem';
    errorDiv.style.margin = '10px';
    setTimeout(function() {
        errorDiv.style.display = 'none';
    }, 6000);
}

// ==================== CONSULTAR VENTAS A CRÉDITO ====================

async function loadCreditData() {
    console.log('🔄 loadCreditData() llamado');
    
    try {
        var user = window.getCurrentUser ? window.getCurrentUser() : null;
        
        if (!user || !user.id) {
            console.warn('⚠️ Usuario no disponible');
            showCreditError('No hay usuario autenticado. Inicia sesión primero.');
            return;
        }
        
        var dateValue = creditDatePicker.value;
        if (!dateValue) {
            creditPeriodInfo.textContent = '⚠️ Por favor selecciona una fecha de inicio';
            showCreditError('Por favor selecciona una fecha');
            return;
        }
        
        var parts = dateValue.split('-');
        var selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        
        console.log('📊 Cargando datos de crédito para: ' + user.name);
        console.log('📅 Fecha seleccionada: ' + dateValue);
        
        // Mostrar loading
        creditLoading.style.display = 'block';
        creditResults.style.display = 'none';
        creditEmpty.style.display = 'none';
        creditStats.innerHTML = '';
        creditStats.style.display = 'none';
        if (creditChartContainer) {
            creditChartContainer.style.display = 'none';
        }
        
        var dateRange = getCreditDateRange(selectedDate);
        
        console.log('📅 Período crédito:');
        console.log('  Inicio: ' + dateRange.start);
        console.log('  Fin: ' + dateRange.end);
        
        var startFormatted = formatDateDisplay(dateRange.startDate);
        var endFormatted = formatDateDisplay(dateRange.endDate);
        creditPeriodInfo.textContent = '📅 Período: ' + startFormatted + ' - ' + endFormatted + ' (15 días)';
        
        // Consultar ventas a crédito con filtro de asesor
        var allCreditSales = await fetchAllCreditSales(user.id, dateRange.start, dateRange.end);
        console.log('📊 ' + allCreditSales.length + ' ventas a crédito obtenidas');
        
        if (allCreditSales.length === 0) {
            creditLoading.style.display = 'none';
            creditEmpty.style.display = 'block';
            creditStats.innerHTML = '';
            creditStats.style.display = 'none';
            if (creditChartContainer) {
                creditChartContainer.style.display = 'none';
            }
            return;
        }
        
        // Procesar datos de crédito
        var creditData = processCreditSales(allCreditSales);
        cachedCreditData = creditData;
        
        // Renderizar estadísticas
        renderCreditStats(creditData);
        
        // Renderizar gráfica
        renderCreditChart(creditData);
        
        // Renderizar tabla
        renderCreditTable(creditData);
        
        creditLoading.style.display = 'none';
        creditEmpty.style.display = 'none';
        
        console.log('✅ Datos de crédito cargados correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos de crédito:', error);
        creditPeriodInfo.textContent = '❌ Error al cargar los datos';
        creditLoading.style.display = 'none';
        showCreditError('Error al cargar datos de crédito: ' + error.message);
    }
}

// ==================== CONSULTAR VENTAS A CRÉDITO FILTRADAS POR ASESOR ====================

async function fetchAllCreditSales(userId, startDateTime, endDateTime) {
    try {
        var allSales = [];
        var currentPage = 1;
        var perPage = 100;
        var hasMorePages = true;
        var totalPages = 1;
        
        console.log('📡 Consultando ventas a crédito');
        console.log('  Inicio: ' + startDateTime);
        console.log('  Fin: ' + endDateTime);
        console.log('  Usuario ID: ' + userId);
        
        while (hasMorePages) {
            var url = CONFIG.API_SALES + 
                '?page=' + currentPage + 
                '&per_page=' + perPage + 
                '&total=1' +
                '&sale_type=credit' +
                '&start_date=' + encodeURIComponent(startDateTime) + 
                '&end_date=' + encodeURIComponent(endDateTime);
            
            console.log('📡 Obteniendo página ' + currentPage);
            
            var response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Error ' + response.status + ' al obtener ventas a crédito');
            }
            
            var data = await response.json();
            var pageSales = data.data || [];
            
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
            
            // Filtrar por asesor
            var filteredSales = pageSales.filter(function(sale) {
                return sale.user_id == userId || 
                       sale.created_by == userId || 
                       sale.seller_id == userId;
            });
            
            allSales = allSales.concat(filteredSales);
            console.log('📄 Página ' + currentPage + ': ' + filteredSales.length + ' ventas del asesor (Total: ' + allSales.length + ')');
            
            if (currentPage >= totalPages) {
                hasMorePages = false;
            } else {
                currentPage++;
            }
        }
        
        console.log('✅ Total de ventas a crédito: ' + allSales.length);
        return allSales;
        
    } catch (error) {
        console.error('❌ Error obteniendo ventas a crédito:', error);
        return [];
    }
}

// ==================== PROCESAR VENTAS A CRÉDITO ====================

function processCreditSales(sales) {
    var imeiMap = new Map();
    var platformData = new Map();
    var allImeis = [];
    
    for (var s = 0; s < sales.length; s++) {
        var sale = sales[s];
        
        // Obtener la plataforma de crédito
        var creditPlatform = 'No especificada';
        if (sale.credit_provider && sale.credit_provider.equipment_value) {
            creditPlatform = sale.credit_provider.equipment_value;
        }
        
        // Inicializar plataforma si no existe
        if (!platformData.has(creditPlatform)) {
            platformData.set(creditPlatform, {
                name: creditPlatform,
                count: 0,
                imeis: []
            });
        }
        
        var platformInfo = platformData.get(creditPlatform);
        platformInfo.count++;
        
        // Obtener asesor
        var advisorName = sale.user ? sale.user.name : 'No disponible';
        
        // Extraer IMEIs
        var details = sale.details || [];
        for (var d = 0; d < details.length; d++) {
            var detail = details[d];
            var specGroups = detail.specification_groups || [];
            for (var g = 0; g < specGroups.length; g++) {
                var group = specGroups[g];
                var specs = group.specification_details || [];
                for (var sp = 0; sp < specs.length; sp++) {
                    var spec = specs[sp];
                    if (spec.specification && spec.specification.name === 'IMEI' && isValidImei(spec.value) && !imeiMap.has(spec.value)) {
                        var isLibre = (detail.product && detail.product.name || '').toLowerCase().includes('libre');
                        var productName = detail.product ? detail.product.name : 'Desconocido';
                        
                        var imeiData = {
                            imei: spec.value,
                            product: productName,
                            productId: detail.product ? detail.product.id : null,
                            saleId: sale.id,
                            seller: advisorName,
                            line: isLibre ? 'Libre' : 'Telcel',
                            creditPlatform: creditPlatform,
                            saleDate: sale.created_at
                        };
                        
                        imeiMap.set(spec.value, imeiData);
                        platformInfo.imeis.push(imeiData);
                        allImeis.push(imeiData);
                    }
                }
            }
        }
    }
    
    // Convertir platformData a array y ordenar por cantidad
    var platformStats = Array.from(platformData.values())
        .sort(function(a, b) { return b.count - a.count; });
    
    // Ordenar todos los IMEIs por fecha (más reciente primero)
    allImeis.sort(function(a, b) {
        return new Date(b.saleDate) - new Date(a.saleDate);
    });
    
    return {
        results: allImeis,
        platformStats: platformStats,
        totalImeis: allImeis.length
    };
}

// ==================== RENDERIZAR ESTADÍSTICAS ====================

function renderCreditStats(creditData) {
    var platformStats = creditData.platformStats;
    var totalImeis = creditData.totalImeis;
    
    // Tarjeta de total - CON EVENTO CLICK PARA MOSTRAR TODOS
    var statsHtml = 
        '<div class="stat-card total-card" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); cursor: pointer;">' +
            '<div class="stat-number">' + totalImeis + '</div>' +
            '<div class="stat-label">📱 Total Equipos</div>' +
            '<div style="font-size: 0.65rem; opacity: 0.7; margin-top: 4px;">👆 Click para ver todos</div>' +
        '</div>';
    
    // Tarjetas por plataforma
    platformStats.forEach(function(platform, index) {
        var color = getPlatformColor(index);
        statsHtml += 
            '<div class="stat-card platform-card" data-platform="' + escapeHtml(platform.name) + '" style="background: linear-gradient(135deg, ' + color + ' 0%, ' + color + 'cc 100%); cursor: pointer;">' +
                '<div class="stat-number">' + platform.count + '</div>' +
                '<div class="stat-label">🏦 ' + escapeHtml(platform.name) + '</div>' +
            '</div>';
    });
    
    creditStats.innerHTML = statsHtml;
    creditStats.style.display = 'grid';
    
    // Evento para la tarjeta Total - MUESTRA TODOS
    var totalCard = document.querySelector('.total-card');
    if (totalCard) {
        totalCard.addEventListener('click', function() {
            clearCreditFilter();
        });
    }
    
    // Eventos para las tarjetas de plataforma - filtran la tabla
    document.querySelectorAll('.platform-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var platformName = this.getAttribute('data-platform');
            filterCreditTable(platformName);
        });
    });
}

// ==================== RENDERIZAR GRÁFICA DE BARRAS ====================

function renderCreditChart(creditData) {
    console.log('📊 Renderizando gráfica de crédito...');
    
    // Verificar que el contenedor exista
    if (!creditChartContainer) {
        console.error('❌ creditChartContainer no encontrado');
        return;
    }
    
    // Verificar que el canvas exista
    var canvas = document.getElementById('creditChart');
    if (!canvas) {
        console.error('❌ Canvas creditChart no encontrado');
        return;
    }
    
    // Destruir gráfica anterior si existe
    if (creditChart) {
        creditChart.destroy();
        creditChart = null;
    }
    
    var platformStats = creditData.platformStats;
    var labels = [];
    var data = [];
    var colors = [];
    
    platformStats.forEach(function(platform, index) {
        labels.push(platform.name);
        data.push(platform.count);
        colors.push(getPlatformColor(index));
    });
    
    if (data.length === 0) {
        creditChartContainer.style.display = 'block';
        creditChartContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">No hay datos para mostrar</p>';
        return;
    }
    
    // Mostrar el contenedor
    creditChartContainer.style.display = 'block';
    
    // Obtener el contexto 2D
    var ctx = canvas.getContext('2d');
    
    try {
        creditChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Equipos por Plataforma',
                    data: data,
                    backgroundColor: colors.map(function(c) { return c + '80'; }),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 4,
                    barPercentage: 0.7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '📱 ' + context.raw + ' equipos';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 30,
                            minRotation: 30
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                onClick: function(e, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var platformName = platformStats[index].name;
                        filterCreditTable(platformName);
                    }
                }
            }
        });
        console.log('✅ Gráfica de crédito renderizada correctamente');
    } catch (error) {
        console.error('❌ Error al crear la gráfica:', error);
    }
}

// ==================== RENDERIZAR TABLA DE TODOS LOS EQUIPOS ====================

function renderCreditTable(creditData) {
    var results = creditData.results;
    
    if (results.length === 0) {
        creditResults.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">No se encontraron IMEIs en las ventas a crédito</p>';
        creditResults.style.display = 'block';
        return;
    }
    
    var html = 
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">' +
            '<h4 style="color: #1e40af; margin: 0;" id="creditTableTitle">📋 Lista de Equipos (' + results.length + ')</h4>' +
            '<button id="clearCreditFilterBtn" style="display: none; padding: 6px 16px; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #1e293b;">✕ Mostrar todos</button>' +
        '</div>' +
        '<div class="table-container" style="max-height: 500px; overflow-y: auto;">' +
        '<table class="imei-table" style="width: 100%; border-collapse: collapse;">' +
            '<thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">' +
                '<tr>' +
                    '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">#</th>' +
                    '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Fecha</th>' +
                    '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Línea</th>' +
                    '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Plataforma</th>' +
                    '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">IMEI</th>' +
                    '<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Producto</th>' +
                    '<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">Folio</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody id="creditTableBody">';
    
    results.forEach(function(item, idx) {
        html += createCreditTableRow(item, idx);
    });
    
    html += 
            '</tbody>' +
        '</table>' +
        '</div>' +
        '<div style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8; text-align: center;">' +
            '💡 Haz clic en una tarjeta de plataforma o en la barra de la gráfica para filtrar' +
        '</div>';
    
    creditResults.innerHTML = html;
    creditResults.style.display = 'block';
    
    // Evento para limpiar filtro
    var clearBtn = document.getElementById('clearCreditFilterBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            clearCreditFilter();
        });
    }
}

function createCreditTableRow(item, idx) {
    var rowBg = (idx % 2 === 0) ? '#ffffff' : '#f8fafc';
    var folio = formatFolio(item.saleId);
    var ticketUrl = 'https://sales.gcasan.com/api/sales/' + item.saleId + '/receipt';
    var fechaFormateada = formatDateShort(item.saleDate);
    var lineBadge = item.line === 'Telcel' ? 
        '<span style="background: #059669; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem;">Telcel</span>' : 
        '<span style="background: #f59e0b; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem;">Libre</span>';
    
    return '<tr style="border-bottom: 1px solid #e2e8f0; background-color: ' + rowBg + ';" data-platform="' + escapeHtml(item.creditPlatform) + '">' +
        '<td style="padding: 8px; text-align: center;">' + (idx + 1) + '</td>' +
        '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + fechaFormateada + '</td>' +
        '<td style="padding: 8px; text-align: left;">' + lineBadge + '</td>' +
        '<td style="padding: 8px; text-align: left;"><span style="background: #7c3aed20; color: #7c3aed; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; border: 1px solid #7c3aed40;">' + escapeHtml(item.creditPlatform) + '</span></td>' +
        '<td style="padding: 8px; text-align: left;"><code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">' + item.imei + '</code></td>' +
        '<td style="padding: 8px; text-align: left; font-size: 0.85rem;">' + escapeHtml(item.product) + '</td>' +
        '<td style="padding: 8px; text-align: center;">' +
            '<a href="' + ticketUrl + '" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 0.85rem; padding: 4px 12px; background: #eff6ff; border-radius: 4px; border: 1px solid #bfdbfe; transition: all 0.2s; display: inline-block;" onmouseover="this.style.background=\'#bfdbfe\'" onmouseout="this.style.background=\'#eff6ff\'">' +
                '#' + folio + ' 🧾' +
            '</a>' +
        '</td>' +
        '</tr>';
}

// ==================== FILTRAR TABLA POR PLATAFORMA ====================

var currentFilter = null;

function filterCreditTable(platformName) {
    currentFilter = platformName;
    
    var rows = document.querySelectorAll('#creditTableBody tr');
    var totalVisible = 0;
    
    rows.forEach(function(row) {
        var rowPlatform = row.getAttribute('data-platform');
        if (rowPlatform === platformName) {
            row.style.display = '';
            totalVisible++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Actualizar título
    var title = document.getElementById('creditTableTitle');
    if (title) {
        title.textContent = '📋 Lista de Equipos - ' + platformName + ' (' + totalVisible + ')';
    }
    
    // Mostrar botón de limpiar
    var clearBtn = document.getElementById('clearCreditFilterBtn');
    if (clearBtn) {
        clearBtn.style.display = 'inline-block';
        clearBtn.textContent = '✕ ' + platformName.substring(0, 20) + (platformName.length > 20 ? '...' : '');
    }
    
    // Resaltar tarjeta activa
    document.querySelectorAll('.platform-card').forEach(function(card) {
        card.style.opacity = '0.6';
        card.style.transform = 'scale(0.98)';
        if (card.getAttribute('data-platform') === platformName) {
            card.style.opacity = '1';
            card.style.transform = 'scale(1.02)';
            card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        }
    });
    
    // Des-resaltar total card
    var totalCard = document.querySelector('.total-card');
    if (totalCard) {
        totalCard.style.opacity = '0.6';
        totalCard.style.transform = 'scale(0.98)';
    }
}

function clearCreditFilter() {
    currentFilter = null;
    
    var rows = document.querySelectorAll('#creditTableBody tr');
    var totalRows = rows.length;
    
    rows.forEach(function(row) {
        row.style.display = '';
    });
    
    // Restaurar título
    var title = document.getElementById('creditTableTitle');
    if (title) {
        title.textContent = '📋 Lista de Equipos (' + totalRows + ')';
    }
    
    // Ocultar botón de limpiar
    var clearBtn = document.getElementById('clearCreditFilterBtn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // Restaurar tarjetas
    document.querySelectorAll('.platform-card').forEach(function(card) {
        card.style.opacity = '1';
        card.style.transform = '';
        card.style.boxShadow = '';
    });
    
    // Restaurar total card
    var totalCard = document.querySelector('.total-card');
    if (totalCard) {
        totalCard.style.opacity = '1';
        totalCard.style.transform = '';
        totalCard.style.boxShadow = '';
    }
}

// ==================== INICIALIZAR MÓDULO DE CRÉDITO ====================

function initCreditModule() {
    console.log('🚀 Inicializando módulo de crédito...');
    
    // Verificar elementos
    console.log('🔍 creditDatePicker:', creditDatePicker);
    console.log('🔍 creditApplyBtn:', creditApplyBtn);
    console.log('🔍 creditChartContainer:', creditChartContainer);
    console.log('🔍 creditChart (canvas):', document.getElementById('creditChart'));
    
    if (!creditDatePicker) {
        console.warn('⚠️ creditDatePicker no encontrado');
        return;
    }
    
    if (!creditApplyBtn) {
        console.warn('⚠️ creditApplyBtn no encontrado');
        return;
    }
    
    // Establecer fecha por defecto (hoy - 15 días)
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() - 15);
    
    creditDatePicker.value = formatDateInput(defaultDate);
    
    // Mostrar período por defecto
    var dateRange = getCreditDateRange(defaultDate);
    var startFormatted = formatDateDisplay(dateRange.startDate);
    var endFormatted = formatDateDisplay(dateRange.endDate);
    creditPeriodInfo.textContent = '📅 Período: ' + startFormatted + ' - ' + endFormatted + ' (15 días)';
    
    // Evento para consultar
    creditApplyBtn.addEventListener('click', function(e) {
        console.log('🔄 Botón Consultar crédito clickeado');
        loadCreditData();
    });
    
    // Enter en el input de fecha
    creditDatePicker.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            console.log('🔄 Enter presionado en fecha crédito');
            creditApplyBtn.click();
        }
    });
    
    console.log('✅ Módulo de crédito inicializado correctamente');
}

// ==================== EXPORTAR FUNCIONES GLOBALES ====================
window.loadCreditData = loadCreditData;
window.openReceipt = function(saleId) {
    var url = 'https://sales.gcasan.com/api/sales/' + saleId + '/receipt';
    window.open(url, '_blank');
};

// ==================== INICIALIZAR CUANDO EL DOM ESTÉ LISTO ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initCreditModule, 500);
    });
} else {
    setTimeout(initCreditModule, 500);
}