// ==================== SISTEMA DE AUTENTICACIÓN CON ERP ====================

let currentUser = null;
let userBranches = [];
let userWarehouses = [];

// ==================== LOGIN ====================

async function loginERP(email, password) {
    try {
        console.log('🔐 Autenticando con el ERP...');
        
        const response = await fetch(CONFIG.AUTH_LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error('Error al parsear la respuesta del servidor');
        }
        
        if (!response.ok) {
            const errorMsg = data.message || data.error || `Error ${response.status}`;
            throw new Error(errorMsg);
        }
        
        let token = null;
        let userData = null;
        
        if (data.token) {
            token = data.token;
        } else if (data.data && data.data.token) {
            token = data.data.token;
        } else if (data.access_token) {
            token = data.access_token;
        } else if (data.data && data.data.access_token) {
            token = data.data.access_token;
        }
        
        if (data.data) {
            userData = data.data;
        } else {
            userData = data;
        }
        
        if (!token) {
            throw new Error('No se recibió token de autenticación');
        }
        
        CONFIG.FIXED_TOKEN = token;
        
        currentUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            token: token
        };
        
        console.log(`✅ Usuario autenticado: ${currentUser.name} (ID: ${currentUser.id})`);
        return currentUser;
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
}

// ==================== OBTENER SUCURSALES DEL USUARIO ====================

async function fetchUserBranches(userId) {
    try {
        const url = CONFIG.AUTH_USER_BRANCHES.replace('{userId}', userId);
        console.log('📡 Obteniendo sucursales del usuario:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.FIXED_TOKEN}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status} al obtener sucursales`);
        }
        
        const data = await response.json();
        const branches = data.data || data || [];
        userBranches = Array.isArray(branches) ? branches : [];
        
        console.log(`✅ ${userBranches.length} sucursales obtenidas`);
        return userBranches;
        
    } catch (error) {
        console.error('❌ Error obteniendo sucursales:', error);
        return [];
    }
}

// ==================== OBTENER ALMACENES DEL USUARIO ====================

async function fetchUserWarehouses(userId) {
    try {
        const url = CONFIG.AUTH_USER_WAREHOUSES.replace('{userId}', userId);
        console.log('📡 Obteniendo almacenes del usuario:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.FIXED_TOKEN}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status} al obtener almacenes`);
        }
        
        const data = await response.json();
        const warehouses = data.data || data || [];
        userWarehouses = Array.isArray(warehouses) ? warehouses : [];
        
        console.log(`✅ ${userWarehouses.length} almacenes obtenidos`);
        return userWarehouses;
        
    } catch (error) {
        console.error('❌ Error obteniendo almacenes:', error);
        return [];
    }
}

// ==================== LIMPIAR TODOS LOS DATOS DE SESIÓN ====================

function clearAllSessionData() {
    console.log('🧹 Limpiando todos los datos de sesión...');
    
    // Limpiar variables globales
    CONFIG.FIXED_TOKEN = null;
    currentUser = null;
    userBranches = [];
    userWarehouses = [];
    
    // Limpiar sessionStorage (todo)
    try {
        sessionStorage.clear();
    } catch (e) {
        console.warn('Error limpiando sessionStorage:', e);
    }
    
    // Limpiar localStorage (datos de facturas, etc.)
    const keysToRemove = [
        'facturasProcessedData',
        'facturasCsvFile', 
        'facturasBarcodeData',
        'facturasOriginalFileName',
        'facturasShowTable2',
        'selected_start_date'
    ];
    
    keysToRemove.forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Error eliminando localStorage key:', key, e);
        }
    });
    
    // Limpiar cachés de módulos
    if (typeof window.limpiarCacheTransferencias === 'function') {
        window.limpiarCacheTransferencias();
    }
    
    if (typeof window.limpiarCacheCancelaciones === 'function') {
        window.limpiarCacheCancelaciones();
    }
    
    console.log('✅ Todos los datos de sesión han sido limpiados');
}

// ==================== LIMPIAR INTERFAZ VISUAL ====================

function limpiarInterfazVisual() {
    console.log('🧹 Limpiando interfaz visual...');
    
    // 1. Resetear badges
    const badges = document.querySelectorAll('.badge-header, #badgeTransferencias, #badgeCancelaciones');
    badges.forEach(function(badge) {
        if (badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    });
    
    // 2. Resetear información del usuario
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = 'Cargando...';
    }
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.textContent = '👤';
    }
    
    const userBranch = document.getElementById('userBranch');
    if (userBranch) {
        userBranch.textContent = '🏪 Cargando tienda...';
    }
    
    const userWarehouse = document.getElementById('userWarehouse');
    if (userWarehouse) {
        userWarehouse.textContent = '🏭 Cargando almacén...';
    }
    
    // 3. Cerrar todos los modales abiertos
    document.querySelectorAll('.modal').forEach(function(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
    
    // 4. Resetear módulos
    document.querySelectorAll('.module').forEach(function(module) {
        // Resetear estadísticas
        const stats = module.querySelectorAll('.stat-number');
        stats.forEach(function(stat) {
            stat.textContent = '0';
        });
        
        // Resetear mensajes de bienvenida
        const welcomeMessages = module.querySelectorAll('.welcome-message');
        welcomeMessages.forEach(function(msg) {
            msg.innerHTML = 
                '<h3>👋 ¡Bienvenido!</h3>' +
                '<p>Selecciona una fecha de inicio y presiona "Consultar" para ver los datos</p>';
        });
        
        // Resetear información de período
        const periodInfos = module.querySelectorAll('[id$="PeriodInfo"]');
        periodInfos.forEach(function(info) {
            info.textContent = '📅 Selecciona una fecha y presiona "Consultar"';
        });
        
        // Resetear resultados
        const results = module.querySelectorAll('#creditResults, #contadoResults');
        results.forEach(function(result) {
            if (result) {
                result.innerHTML = '';
                result.style.display = 'none';
            }
        });
        
        // Resetear contenedores de gráficas
        const chartContainers = module.querySelectorAll('#creditChartContainer, #contadoChartContainer');
        chartContainers.forEach(function(container) {
            if (container) {
                container.style.display = 'none';
            }
        });
    });
    
    console.log('✅ Interfaz visual limpiada');
}

// ==================== RECARGAR PÁGINA FORZADAMENTE ====================

function recargarPaginaForzada() {
    console.log('🔄 Recargando página forzadamente...');
    
    // Opción 1: Usar location.reload(true) - ignora caché
    try {
        window.location.reload(true);
    } catch (e) {
        // Si falla, usar location.href con timestamp
        console.warn('reload(true) falló, usando location.href...');
        const url = window.location.href.split('?')[0];
        window.location.href = url + '?_=' + Date.now();
    }
}

// ==================== CERRAR SESIÓN ====================

function logout() {
    console.log('🚪 Cerrando sesión...');
    
    // 1. Limpiar datos internos
    clearAllSessionData();
    
    // 2. Limpiar interfaz visual (antes de recargar)
    limpiarInterfazVisual();
    
    // 3. Ocultar dashboard y mostrar login
    const loginOverlay = document.getElementById('loginOverlay');
    const dashboard = document.getElementById('dashboard');
    
    if (loginOverlay) {
        loginOverlay.style.display = 'flex';
    }
    if (dashboard) {
        dashboard.style.display = 'none';
    }
    
    // 4. Limpiar campos de login
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (loginError) loginError.style.display = 'none';
    
    console.log('✅ Sesión cerrada correctamente');
    
    // 5. RECARGAR LA PÁGINA FORZADAMENTE
    // Usamos setTimeout para asegurar que los cambios visuales se apliquen
    setTimeout(function() {
        recargarPaginaForzada();
    }, 300);
}

// ==================== VERIFICAR SESIÓN ====================

function checkSession() {
    const savedUser = sessionStorage.getItem('dashboard_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            currentUser = user;
            CONFIG.FIXED_TOKEN = user.token;
            
            userBranches = JSON.parse(sessionStorage.getItem('dashboard_branches') || '[]');
            userWarehouses = JSON.parse(sessionStorage.getItem('dashboard_warehouses') || '[]');
            
            console.log(`🔐 Sesión restaurada: ${currentUser.name}`);
            return true;
        } catch (e) {
            console.error('Error restaurando sesión:', e);
            clearAllSessionData();
            return false;
        }
    }
    return false;
}

// ==================== EXPORTAR ====================

window.loginERP = loginERP;
window.fetchUserBranches = fetchUserBranches;
window.fetchUserWarehouses = fetchUserWarehouses;
window.logout = logout;
window.checkSession = checkSession;
window.clearAllSessionData = clearAllSessionData;
window.limpiarInterfazVisual = limpiarInterfazVisual;
window.recargarPaginaForzada = recargarPaginaForzada;
window.getCurrentUser = () => currentUser;
window.getUserBranches = () => userBranches;
window.getUserWarehouses = () => userWarehouses;