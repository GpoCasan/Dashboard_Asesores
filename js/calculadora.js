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

// ==================== CONSTANTES ====================
const PUNTOS = {
    LINEA_EQUIPO: 4,
    LINEA_SIN_EQUIPO: 2,
    COCE: 2
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
    
    // SOLO 2 TARJETAS
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
    
    // Desglose
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
            } else {
                input.value = 0;
            }
        }
    });
    
    if (calcResultados) calcResultados.style.display = 'none';
    if (calcEmpty) calcEmpty.style.display = 'block';
    document.getElementById('calcProgreso').textContent = '0%';
}

// ==================== INICIALIZAR ====================

function initCalculadora() {
    console.log('🧮 Inicializando calculadora de ventas...');
    
    const user = getUsuarioActual();
    if (user) {
        calcAsesor.textContent = user.name || 'Usuario';
    }
    calcSucursal.textContent = getSucursalActual();
    
    if (calcCalcularBtn) {
        calcCalcularBtn.addEventListener('click', function() {
            const resultados = calcularVentas();
            mostrarResultados(resultados);
        });
    }
    
    if (calcLimpiarBtn) {
        calcLimpiarBtn.addEventListener('click', limpiarCampos);
    }
    
    document.querySelectorAll('#calculadoraModule .calc-field input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (calcCalcularBtn) calcCalcularBtn.click();
            }
        });
    });
    
    console.log('✅ Calculadora inicializada correctamente');
}

// ==================== EXPORTAR ====================
window.initCalculadora = initCalculadora;
window.calcularVentas = calcularVentas;
window.limpiarCampos = limpiarCampos;

// ==================== INICIALIZAR ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initCalculadora, 500);
    });
} else {
    setTimeout(initCalculadora, 500);
}

console.log('🧮 Módulo de calculadora cargado correctamente');