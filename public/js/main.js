document.addEventListener("DOMContentLoaded", () => {
    fetch('nav.html')
        .then(response => {
            if (!response.ok) throw new Error('No se pudo cargar la barra de navegación');
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('nav-container');
            if (container) {
                container.innerHTML = html;
            }
        })
        .catch(err => console.warn('Error cargando el menú:', err));
});

// Función robusta para obtener todas las listas de configuración desde cualquier fuente posible
async function obtenerListasConfiguracion() {
    let configServer = {};
    try {
        const res = await fetch('/api/configuracion');
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
                configServer = data;
            }
        }
    } catch (e) {
        console.warn('No se pudo leer /api/configuracion del servidor');
    }

    let configLocal = {};
    try {
        const localStr = localStorage.getItem('app_configuracion') || localStorage.getItem('app_configuracion_listas');
        if (localStr) configLocal = JSON.parse(localStr);
    } catch (e) {}

    const extraer = (key) => {
        let lista = configServer[key] || configLocal[key];
        
        if (!lista || lista.length === 0) {
            try {
                const ind = localStorage.getItem('app_' + key);
                if (ind) lista = JSON.parse(ind);
            } catch (e) {}
        }

        if (!Array.isArray(lista)) return [];
        return lista.map(item => {
            if (!item) return '';
            if (typeof item === 'object') {
                return item.nombre || item.valor || item.titulo || item.text || Object.values(item)[0] || '';
            }
            return String(item);
        }).filter(Boolean);
    };

    const resultado = {
        ubicaciones: extraer('ubicaciones'),
        bloques: extraer('bloques'),
        variedades: extraer('variedades'),
        grados: extraer('grados'),
        cortadores: extraer('cortadores')
    };

    console.log("🔍 Listas detectadas para los selects:", resultado);
    return resultado;
}

// Función universal inteligente basada en ID, nombre y etiquetas del modal
async function poblarSelectsModal(modalId) {
    const listas = await obtenerListasConfiguracion();
    
    // Buscar el modal por ID exacto, por selector parcial o respaldar con toda la página si no lo encuentra
    const modal = document.getElementById(modalId) || document.querySelector(`[id*="${modalId.replace('modal-', '')}"]`);
    const contenedor = modal || document;

    contenedor.querySelectorAll('select').forEach(el => {
        const idOname = (el.id + ' ' + (el.name || '')).toLowerCase();
        
        // Buscar la etiqueta (label) asociada para mayor precisión
        const contenedorPadre = el.closest('div') || el.parentElement;
        const label = contenedorPadre ? contenedorPadre.querySelector('label') : null;
        const textoLabel = label ? label.textContent.toLowerCase() : '';

        let tipoDato = '';
        let placeholder = '-- Seleccione --';

        if (idOname.includes('ubicacion') || textoLabel.includes('ubicación') || textoLabel.includes('ubicacion')) {
            tipoDato = 'ubicaciones';
            placeholder = '-- Seleccione Ubicación --';
        } else if (idOname.includes('bloque') || textoLabel.includes('bloque')) {
            tipoDato = 'bloques';
            placeholder = '-- Seleccione Bloque --';
        } else if (idOname.includes('variedad') || textoLabel.includes('variedad')) {
            tipoDato = 'variedades';
            placeholder = '-- Seleccione Variedad --';
        } else if (idOname.includes('grado') || textoLabel.includes('grado')) {
            tipoDato = 'grados';
            placeholder = '-- Seleccione Grado --';
        } else {
            return; // Si es otro select (ej. tallos por tabaco), lo ignora
        }

        const items = listas[tipoDato] || [];
        const valorActual = el.value;
        
        el.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            if (val === valorActual) opt.selected = true;
            el.appendChild(opt);
        });
    });
}

// Poblar selects de Entradas
window.poblarSelectsEntrada = async function() {
    await poblarSelectsModal('modal-entrada');
};

// Poblar selects de Salidas
window.poblarSelectsSalidas = async function() {
    await poblarSelectsModal('modal-salida');
};

// Funciones globales para modales
window.abrirModalEntrada = function() {
    const m = document.getElementById('modal-entrada') || document.querySelector('[id*="entrada"]');
    if (m) {
        m.classList.remove('hidden');
        const campoFecha = document.getElementById('input-fecha-ingreso') || document.getElementById('se-fecha') || m.querySelector('[type="date"]');
        if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];
        poblarSelectsEntrada();
    }
};

window.abrirModalSalida = function() {
    const m = document.getElementById('modal-salida') || document.querySelector('[id*="salida"]');
    if (m) {
        m.classList.remove('hidden');
        const campoFecha = document.getElementById('salida-fecha') || document.getElementById('ss-fecha') || m.querySelector('[type="date"]');
        if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];
        poblarSelectsSalidas();
    }
};

window.abrirModalIncompleto = function() {
    const m = document.getElementById('modal-incompleto');
    if (m) m.classList.remove('hidden');
};

window.abrirModalCortador = async function() {
    const m = document.getElementById('modal-cortador');
    if (m) {
        m.classList.remove('hidden');
        
        const campoFecha = document.getElementById('sc-fecha');
        if (campoFecha) {
            campoFecha.value = new Date().toISOString().split('T')[0];
        }

        const listas = await obtenerListasConfiguracion();

        // 1. Poblar el desplegable de Cortadores
        const selectCortador = document.getElementById('sc-cortador');
        if (selectCortador) {
            selectCortador.innerHTML = '<option value="">-- Seleccione Cortador --</option>';
            (listas.cortadores || []).forEach(c => {
                selectCortador.innerHTML += `<option value="${c}">${c}</option>`;
            });
        }

        // 2. Poblar las casillas de verificación de Bloques
        const contBloques = document.getElementById('sc-bloques-contenedor');
        if (contBloques) {
            contBloques.innerHTML = '';
            if (!listas.bloques || listas.bloques.length === 0) {
                contBloques.innerHTML = '<p class="text-xs text-rose-500 italic">No hay bloques registrados. Agréguelos en Configurar Listas.</p>';
            } else {
                listas.bloques.forEach(b => {
                    contBloques.innerHTML += `
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                            <input type="checkbox" name="sc-bloque-check" value="${b}" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4">
                            <span class="text-slate-700 font-medium text-sm">${b}</span>
                        </label>
                    `;
                });
            }
        }

        // 3. Poblar las casillas de verificación de Variedades
        const contVariedades = document.getElementById('sc-variedades-contenedor');
        if (contVariedades) {
            contVariedades.innerHTML = '';
            if (!listas.variedades || listas.variedades.length === 0) {
                contVariedades.innerHTML = '<p class="text-xs text-rose-500 italic">No hay variedades registradas. Agréguelas en Configurar Listas.</p>';
            } else {
                listas.variedades.forEach(v => {
                    contVariedades.innerHTML += `
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                            <input type="checkbox" name="sc-variedad-check" value="${v}" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4">
                            <span class="text-slate-700 font-medium text-sm">${v}</span>
                        </label>
                    `;
                });
            }
        }
    }
};

window.cerrarModal = function(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
};