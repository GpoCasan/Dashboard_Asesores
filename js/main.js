// ==================== MAIN - INICIALIZACIÓN PRINCIPAL ====================

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
        return true;
    } catch (error) {
        console.error('❌ Error restaurando sesión:', error);
        return false;
    }
}

// ==================== FUNCIONES DE SESIÓN GLOBALES ====================

function getCurrentUser() {
    return window.currentUser || null;
}

function getUserBranches() {
    return window.userBranches || [];
}

function getUserWarehouses() {
    return window.userWarehouses || [];
}

// ==================== LOGIN ====================

async function handleLogin() {
    var email = loginEmail.value.trim();
    var password = loginPassword.value;
    
    if (!email || !password) {
        loginError.textContent = '❌ Por favor ingresa correo y contraseña';
        loginError.style.display = 'block';
        return;
    }
    
    loginError.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = '';
    loginLoading.style.display = 'block';
    
    try {
        // Limpiar cualquier dato de sesión anterior
        if (typeof clearAllSessionData === 'function') {
            clearAllSessionData();
        }
        
        var user = await loginERP(email, password);
        var branches = await fetchUserBranches(user.id);
        var warehouses = await fetchUserWarehouses(user.id);
        
        saveDashboardData(user, branches, warehouses);
        
        showDashboard();
        updateUserInfo();
        
        // ===== INICIALIZAR MÓDULOS =====
        if (typeof initContadoModule === 'function') {
            setTimeout(function() { initContadoModule(); }, 500);
        }
        
        if (typeof initCreditModule === 'function') {
            setTimeout(function() { initCreditModule(); }, 600);
        }
        
        if (typeof initAlertasTransferencias === 'function') {
            setTimeout(function() { initAlertasTransferencias(); }, 700);
        }
        
        if (typeof initCancelacionesModule === 'function') {
            setTimeout(function() { initCancelacionesModule();
                location.reload();
             }, 800);
        }
        
        switchModule('dashboard');
        
        console.log('✅ Dashboard cargado correctamente');
        
    } catch (error) {
        loginError.textContent = '❌ ' + error.message;
        loginError.style.display = 'block';
        console.error('❌ Error en login:', error);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Ingresar';
        loginLoading.style.display = 'none';
    }
}

function showDashboard() {
    loginOverlay.style.display = 'none';
    dashboard.style.display = 'flex';
}

function updateUserInfo() {
    var user = getCurrentUser();
    var branches = getUserBranches();
    var warehouses = getUserWarehouses();
    
    if (user) {
        userNameDisplay.textContent = user.name || 'Usuario';
        userAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
        
        if (branches && branches.length > 0) {
            var branchNames = branches.map(function(b) { 
                return b.name || b.branch_name || 'Sin nombre'; 
            }).join(', ');
            userBranch.textContent = '🏪 ' + branchNames;
        } else {
            userBranch.textContent = '🏪 Sin sucursal asignada';
        }
        
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

function handleLogout() {
    console.log('🚪 Cerrando sesión...');
    
    if (typeof logout === 'function') {
        logout(); // Esta función ya incluye la recarga
    } else {
        // Fallback
        if (typeof clearAllSessionData === 'function') {
            clearAllSessionData();
        }
        
        loginOverlay.style.display = 'flex';
        dashboard.style.display = 'none';
        
        loginEmail.value = '';
        loginPassword.value = '';
        loginError.style.display = 'none';
        
        if (typeof recargarPaginaForzada === 'function') {
            recargarPaginaForzada();
        } else {
            window.location.reload(true);
        }
    }
}

// ==================== NAVEGACIÓN ENTRE MÓDULOS ====================

function switchModule(moduleName) {
    var modules = document.querySelectorAll('.module');
    modules.forEach(function(m) {
        m.classList.remove('active-module');
    });
    
    var targetModule = document.getElementById(moduleName + 'Module');
    if (targetModule) {
        targetModule.classList.add('active-module');
    }
    
    var sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(function(item) {
        item.classList.remove('active');
        if (item.dataset.module === moduleName) {
            item.classList.add('active');
        }
    });
    
    console.log('📱 Módulo activado: ' + moduleName);
}

// ==================== EVENTOS ====================

function setupLoginEvents() {
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            var active = document.activeElement;
            if (active === loginEmail || active === loginPassword) {
                e.preventDefault();
                handleLogin();
            }
        }
    });
}

function setupSidebarNavigation() {
    var sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var moduleName = this.dataset.module;
            switchModule(moduleName);
        });
    });
}

function setupLogout() {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
}

// ==================== INICIALIZACIÓN ====================

function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    
    setupLoginEvents();
    setupSidebarNavigation();
    setupLogout();
    
    // Configurar limpieza al cerrar la página
    window.addEventListener('beforeunload', function() {
        try {
            localStorage.removeItem('facturasProcessedData');
            localStorage.removeItem('facturasCsvFile');
            localStorage.removeItem('facturasBarcodeData');
        } catch (e) {
            // Ignorar errores
        }
    });
    
    // Verificar sesión almacenada
    if (hasStoredSession()) {
        console.log('🔍 Sesión encontrada en sessionStorage');
        var restored = restoreSession();
        if (restored) {
            showDashboard();
            updateUserInfo();
            
            if (typeof initContadoModule === 'function') {
                setTimeout(function() { initContadoModule(); }, 500);
            }
            
            if (typeof initCreditModule === 'function') {
                setTimeout(function() { initCreditModule(); }, 600);
            }
            
            if (typeof initAlertasTransferencias === 'function') {
                setTimeout(function() { initAlertasTransferencias(); }, 700);
            }
            
            if (typeof initCancelacionesModule === 'function') {
                setTimeout(function() { initCancelacionesModule(); }, 800);
            }
            
            switchModule('dashboard');
            return;
        }
    }
    
    console.log('🔐 No hay sesión activa, mostrando login');
    loginOverlay.style.display = 'flex';
    dashboard.style.display = 'none';
}

// ==================== EXPORTAR ====================
window.getCurrentUser = getCurrentUser;
window.getUserBranches = getUserBranches;
window.getUserWarehouses = getUserWarehouses;
window.switchModule = switchModule;
window.handleLogout = handleLogout;

// ==================== INICIALIZAR ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM cargado...');
    initializeApp();
});