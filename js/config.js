// ==================== CONFIGURACIÓN GLOBAL ====================
const CONFIG = {
    // URLs de autenticación
    AUTH_LOGIN: 'https://auth.gcasan.com/api/login',
    AUTH_USER_BRANCHES: 'https://auth.gcasan.com/api/users/{userId}/branches',
    AUTH_USER_WAREHOUSES: 'https://auth.gcasan.com/api/users/{userId}/warehouses?per_page=-1',
    
    // APIs
    API_SALES: 'https://sales.gcasan.com/api/sales',
    API_STOCK: 'https://inventory.gcasan.com/api/stock',
    API_PRODUCTS: 'https://catalogs.gcasan.com/api/products',
    API_BRANCHES: 'https://catalogs.gcasan.com/api/branches',
    API_REPORTS: 'https://reports.gcasan.com/api',
    API_TRANSFERS: 'https://inventory.gcasan.com/api/transfers',  // <--- AGREGAR ESTA LÍNEA
    
    // Token (se asigna después del login)
    FIXED_TOKEN: null
};