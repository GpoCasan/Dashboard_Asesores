// ==================== MÓDULO DE AUTENTICACIÓN ====================

console.log('🔐 Cargando módulo de autenticación...');

// ==================== DOM ELEMENTS ====================
var loginOverlay = document.getElementById('loginOverlay');
var dashboard = document.getElementById('dashboard');
var loginBtn = document.getElementById('loginBtn');
var loginEmail = document.getElementById('loginEmail');
var loginPassword = document.getElementById('loginPassword');
var loginError = document.getElementById('loginError');
var loginLoading = document.getElementById('loginLoading');
var logoutBtn = document.getElementById('logoutBtn');
var userNameDisplay = document.getElementById('userNameDisplay');
var userAvatar = document.getElementById('userAvatar');
var userBranch = document.getElementById('userBranch');
var userWarehouse = document.getElementById('userWarehouse');

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

/**
 * Inicia sesión en el sistema ERP
 * @param {string} email - Correo electrónico
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} - Datos del usuario autenticado
 */
async function loginERP(email, password) {
    console.log('🔐 Intentando login para:', email);
    
    try {
        const response = await fetch(CONFIG.AUTH_LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (!response.ok) {
            let errorMessage = 'Credenciales incorrectas';
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Ignorar
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('✅ Login exitoso');
        
        // Extraer datos del usuario
        const user = data.user || data.data || data;
        
        // Guardar token
        if (user.token) {
            CONFIG.FIXED_TOKEN = user.token;
            window.API_TOKEN = user.token;
            localStorage.setItem('api_token', user.token);
        } else if (data.token) {
            CONFIG.FIXED_TOKEN = data.token;
            window.API_TOKEN = data.token;
            localStorage.setItem('api_token', data.token);
        }
        
        // Guardar usuario en window
        window.currentUser = user;
        
        // Llamar a afterSuccessfulLogin si existe
        if (typeof afterSuccessfulLogin === 'function') {
            afterSuccessfulLogin(user);
        }
        
        return user;
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        throw error;
    }
}

/**
 * Obtiene las sucursales del usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de sucursales
 */
async function fetchUserBranches(userId) {
    try {
        const url = CONFIG.AUTH_USER_BRANCHES.replace('{userId}', userId);
        console.log('🏪 Obteniendo sucursales:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('⚠️ Error al obtener sucursales:', response.status);
            return [];
        }

        const data = await response.json();
        const branches = data.data || data || [];
        console.log('🏪 Sucursales obtenidas:', branches.length);
        console.log('🏪 Detalle sucursales:', branches);
        
        // Guardar en window
        window.userBranches = branches;
        
        // Guardar en sessionStorage para recuperación
        try {
            sessionStorage.setItem('dashboard_branches', JSON.stringify(branches));
        } catch (e) {
            console.warn('⚠️ Error guardando branches en sessionStorage:', e);
        }
        
        return branches;
        
    } catch (error) {
        console.error('❌ Error obteniendo sucursales:', error);
        return [];
    }
}

/**
 * Obtiene los almacenes del usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de almacenes
 */
async function fetchUserWarehouses(userId) {
    try {
        const url = CONFIG.AUTH_USER_WAREHOUSES.replace('{userId}', userId);
        console.log('🏭 Obteniendo almacenes:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + CONFIG.FIXED_TOKEN,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('⚠️ Error al obtener almacenes:', response.status);
            return [];
        }

        const data = await response.json();
        const warehouses = data.data || data || [];
        console.log('🏭 Almacenes obtenidos:', warehouses.length);
        console.log('🏭 Detalle almacenes:', warehouses);
        
        // Guardar en window
        window.userWarehouses = warehouses;
        
        // Guardar en sessionStorage para recuperación
        try {
            sessionStorage.setItem('dashboard_warehouses', JSON.stringify(warehouses));
        } catch (e) {
            console.warn('⚠️ Error guardando warehouses en sessionStorage:', e);
        }
        
        return warehouses;
        
    } catch (error) {
        console.error('❌ Error obteniendo almacenes:', error);
        return [];
    }
}

// ==================== FUNCIONES DE SESIÓN ====================

function saveDashboardData(user, branches, warehouses) {
    try {
        sessionStorage.setItem('dashboard_user', JSON.stringify(user));
        sessionStorage.setItem('dashboard_branches', JSON.stringify(branches || []));
        sessionStorage.setItem('dashboard_warehouses', JSON.stringify(warehouses || []));
        console.log('💾 Datos guardados en sessionStorage');
    } catch (error) {
        console.error('❌ Error guardando datos:', error);
    }
}

function hasStoredSession() {
    try {
        var user = sessionStorage.getItem('dashboard_user');
        return user !== null && user !== 'undefined' && user !== 'null';
    } catch (error) {
        return false;
    }
}

function restoreSession() {
    try {
        var userData = sessionStorage.getItem('dashboard_user');
        if (!userData) return false;
        
        var user = JSON.parse(userData);
        if (!user || !user.id) return false;
        
        window.currentUser = user;
        CONFIG.FIXED_TOKEN = user.token;
        
        var branches = JSON.parse(sessionStorage.getItem('dashboard_branches') || '[]');
        var warehouses = JSON.parse(sessionStorage.getItem('dashboard_warehouses') || '[]');
        
        window.userBranches = branches;
        window.userWarehouses = warehouses;
        
        console.log('🔐 Sesión restaurada: ' + window.currentUser.name);
        console.log('📱 Branches restaurados:', branches);
        console.log('📱 Warehouses restaurados:', warehouses);
        
        return true;
    } catch (error) {
        console.error('❌ Error restaurando sesión:', error);
        return false;
    }
}

function clearAllSessionData() {
    try {
        sessionStorage.removeItem('dashboard_user');
        sessionStorage.removeItem('dashboard_branches');
        sessionStorage.removeItem('dashboard_warehouses');
        localStorage.removeItem('api_token');
        window.currentUser = null;
        window.userBranches = [];
        window.userWarehouses = [];
        CONFIG.FIXED_TOKEN = null;
        window.API_TOKEN = null;
        console.log('🧹 Datos de sesión eliminados');
    } catch (error) {
        console.error('❌ Error limpiando sesión:', error);
    }
}

// ==================== FUNCIONES GLOBALES ====================

function getCurrentUser() {
    return window.currentUser || null;
}

function getUserBranches() {
    return window.userBranches || [];
}

function getUserWarehouses() {
    return window.userWarehouses || [];
}

// ==================== AFTER LOGIN SUCCESSFUL ====================

/**
 * Función que se ejecuta después de un login exitoso
 * @param {Object} userData - Datos del usuario autenticado
 */
function afterSuccessfulLogin(userData) {
    console.log('✅ Login exitoso:', userData.name || 'Usuario');
    console.log('📱 userData completo:', userData);
    console.log('📱 branch_id en userData:', userData.branch_id);
    console.log('📱 warehouse_id en userData:', userData.warehouse_id);
    
    // Guardar usuario actual globalmente
    window.currentUser = userData;
    
    // Ocultar login y mostrar dashboard
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
    
    // Mostrar información del usuario
    updateUserInfo(userData);
    
    // Cargar otros módulos que dependan del usuario
    if (typeof loadInitialData === 'function') {
        loadInitialData();
    }
}

// ==================== UPDATE USER INFO ====================

function updateUserInfo(userData) {
    var user = userData || getCurrentUser();
    var branches = getUserBranches();
    var warehouses = getUserWarehouses();
    
    if (!user) {
        console.warn('⚠️ No hay usuario para mostrar');
        return;
    }
    
    console.log('📱 Actualizando info de usuario:', user.name);
    console.log('📱 Branches disponibles:', branches);
    console.log('📱 Warehouses disponibles:', warehouses);
    
    if (userNameDisplay) {
        userNameDisplay.textContent = user.name || 'Usuario';
    }
    
    if (userAvatar) {
        userAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }
    
    if (userBranch) {
        if (branches && branches.length > 0) {
            var branchNames = branches.map(function(b) { 
                return b.name || b.branch_name || 'Sin nombre'; 
            }).join(', ');
            userBranch.textContent = '🏪 ' + branchNames;
        } else {
            userBranch.textContent = '🏪 Sin sucursal asignada';
        }
    }
    
    if (userWarehouse) {
        if (warehouses && warehouses.length > 0) {
            var warehouseNames = warehouses.map(function(w) { 
                return w.name || w.warehouse_name || 'Sin nombre'; 
            }).join(', ');
            userWarehouse.textContent = '🏭 ' + warehouseNames;
        } else {
            userWarehouse.textContent = '🏭 Sin almacén asignado';
        }
    }
}

// ==================== LOGOUT ====================

function logout() {
    console.log('🚪 Cerrando sesión...');
    
    // Limpiar recursos TAE Modal
    if (window.TaeModal && typeof window.TaeModal.close === 'function') {
        window.TaeModal.close();
    }
    
    // Limpiar sesión
    clearAllSessionData();
    
    // Mostrar login
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    
    // Limpiar campos
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (loginError) loginError.style.display = 'none';
    
    console.log('👋 Sesión cerrada correctamente');
}

function recargarPaginaForzada() {
    console.log('🔄 Recargando página...');
    window.location.reload(true);
}

// ==================== EXPORTAR ====================
window.loginERP = loginERP;
window.fetchUserBranches = fetchUserBranches;
window.fetchUserWarehouses = fetchUserWarehouses;
window.getCurrentUser = getCurrentUser;
window.getUserBranches = getUserBranches;
window.getUserWarehouses = getUserWarehouses;
window.logout = logout;
window.clearAllSessionData = clearAllSessionData;
window.recargarPaginaForzada = recargarPaginaForzada;
window.afterSuccessfulLogin = afterSuccessfulLogin;
window.updateUserInfo = updateUserInfo;

console.log('🔐 Módulo de autenticación cargado correctamente');