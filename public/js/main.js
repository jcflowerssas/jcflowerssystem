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

// Función auxiliar unificada para obtener la configuración (compatible con /api/configuracion y app_configuracion)
async function obtenerConfiguracionGlobal() {
    let config = { ubicaciones: [], bloques: [], variedades: [], grados: [], cortadores: [] };
    try {
        const res = await fetch('/api/configuracion');
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
                config = { ...config, ...data };
            }
        }
    } catch (e) {
        console.warn('No se pudo leer del servidor, usando localStorage');
    }

    // Respaldo unificado en localStorage
    const local = localStorage.getItem('app_configuracion') || localStorage.getItem('app_configuracion_listas');
    if (local) {
        try {
            const parsed = JSON.parse(local);
            config = { ...config, ...parsed };
        } catch (err) {}
    }
    return config;
}

// Función unificada para poblar selects de Entradas
window.poblarSelectsEntrada = async function() {
    const config = await obtenerConfiguracionGlobal();

    const llenar = (id, lista, placeholder) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<option value="">${placeholder}</option>`;
        (lista || []).forEach(item => {
            const val = typeof item === 'object' ? (item.nombre || item.valor || '') : String(item);
            if (val) {
                el.innerHTML += `<option value="${val}">${val}</option>`;
            }
        });
    };

    llenar('input-ubicacion-ingreso', config.ubicaciones, '-- Seleccione Ubicación --');
    llenar('se-ubicacion', config.ubicaciones, '-- Seleccione Ubicación --');

    llenar('input-bloque-ingreso', config.bloques, '-- Seleccione Bloque --');
    llenar('se-bloque', config.bloques, '-- Seleccione Bloque --');

    llenar('input-variedad-ingreso', config.variedades, '-- Seleccione Variedad --');
    llenar('se-variedad', config.variedades, '-- Seleccione Variedad --');

    llenar('input-grado-ingreso', config.grados, '-- Seleccione Grado --');
    llenar('se-grado', config.grados, '-- Seleccione Grado --');
};

// Función unificada para poblar selects de Salidas
window.poblarSelectsSalidas = async function() {
    const config = await obtenerConfiguracionGlobal();

    const llenar = (id, lista, placeholder) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<option value="">${placeholder}</option>`;
        (lista || []).forEach(item => {
            const val = typeof item === 'object' ? (item.nombre || item.valor || '') : String(item);
            if (val) {
                el.innerHTML += `<option value="${val}">${val}</option>`;
            }
        });
    };

    llenar('salida-ubicacion', config.ubicaciones, '-- Seleccione Ubicación --');
    llenar('ss-ubicacion', config.ubicaciones, '-- Seleccione Ubicación --');

    llenar('salida-bloque', config.bloques, '-- Seleccione Bloque --');
    llenar('ss-bloque', config.bloques, '-- Seleccione Bloque --');

    llenar('salida-variedad', config.variedades, '-- Seleccione Variedad --');
    llenar('ss-variedad', config.variedades, '-- Seleccione Variedad --');

    llenar('salida-grado', config.grados, '-- Seleccione Grado --');
    llenar('ss-grado', config.grados, '-- Seleccione Grado --');
};


// Funciones globales para modales
window.abrirModalEntrada = function() {
    const m = document.getElementById('modal-entrada');
    if (m) {
        m.classList.remove('hidden');
        const campoFecha = document.getElementById('input-fecha-ingreso') || document.getElementById('se-fecha');
        if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];
        poblarSelectsEntrada();
    }
};

window.abrirModalSalida = function() {
    const m = document.getElementById('modal-salida');
    if (m) {
        m.classList.remove('hidden');
        const campoFecha = document.getElementById('salida-fecha') || document.getElementById('ss-fecha');
        if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];
        poblarSelectsSalidas();
    }
};

window.abrirModalIncompleto = function() {
    const m = document.getElementById('modal-incompleto');
    if (m) m.classList.add('hidden');
};

window.abrirModalCortador = async function() {
    const m = document.getElementById('modal-cortador');
    if (m) {
        m.classList.remove('hidden');
        
        const campoFecha = document.getElementById('sc-fecha');
        if (campoFecha) {
            campoFecha.value = new Date().toISOString().split('T')[0];
        }

        const config = await obtenerConfiguracionGlobal();

        // 1. Poblar el desplegable de Cortadores
        const selectCortador = document.getElementById('sc-cortador');
        if (selectCortador) {
            selectCortador.innerHTML = '<option value="">-- Seleccione Cortador --</option>';
            (config.cortadores || []).forEach(c => {
                selectCortador.innerHTML += `<option value="${c}">${c}</option>`;
            });
        }

        // 2. Poblar las casillas de verificación de Bloques
        const contBloques = document.getElementById('sc-bloques-contenedor');
        if (contBloques) {
            contBloques.innerHTML = '';
            if (!config.bloques || config.bloques.length === 0) {
                contBloques.innerHTML = '<p class="text-xs text-rose-500 italic">No hay bloques registrados. Agréguelos en Configurar Listas.</p>';
            } else {
                config.bloques.forEach(b => {
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
            if (!config.variedades || config.variedades.length === 0) {
                contVariedades.innerHTML = '<p class="text-xs text-rose-500 italic">No hay variedades registradas. Agréguelas en Configurar Listas.</p>';
            } else {
                config.variedades.forEach(v => {
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