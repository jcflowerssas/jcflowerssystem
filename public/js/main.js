document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    ['input-fecha-ingreso', 'inc-fecha', 'sc-fecha', 'salida-fecha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = hoy;
    });

    if (typeof cargarListasConfiguradas === 'function') {
        cargarListasConfiguradas();
    }
    
    // Iniciar mostrando la vista principal por defecto
    if (typeof window.cambiarVista === 'function') {
        window.cambiarVista('inventario');
    }
});

// Funciones globales para modales
window.abrirModalEntrada = function() {
    const m = document.getElementById('modal-entrada');
    if (m) {
        m.classList.remove('hidden');
        document.getElementById('input-fecha-ingreso').value = new Date().toISOString().split('T')[0];
        if (typeof poblarSelectsEntrada === 'function') poblarSelectsEntrada();
    }
};

window.abrirModalSalida = function() {
    const m = document.getElementById('modal-salida');
    if (m) {
        m.classList.remove('hidden');
        document.getElementById('salida-fecha').value = new Date().toISOString().split('T')[0];
        if (typeof poblarSelectsSalidas === 'function') poblarSelectsSalidas();
    }
};

window.abrirModalIncompleto = function() {
    const m = document.getElementById('modal-incompleto');
    if (m) m.classList.remove('hidden');
};

window.abrirModalCortador = function() {
    const m = document.getElementById('modal-cortador');
    if (m) {
        m.classList.remove('hidden');
        
        // Asignar fecha actual
        const campoFecha = document.getElementById('sc-fecha');
        if (campoFecha) {
            campoFecha.value = new Date().toISOString().split('T')[0];
        }

        // Obtener configuración guardada en producción
        let config = { bloques: [], variedades: [], cortadores: [] };
        const configGuardada = localStorage.getItem('app_configuracion_listas');
        if (configGuardada) {
            try {
                config = JSON.parse(configGuardada);
            } catch (e) {
                console.error("Error leyendo configuración:", e);
            }
        }

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