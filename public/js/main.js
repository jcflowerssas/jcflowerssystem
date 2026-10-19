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
        document.getElementById('sc-fecha').value = new Date().toISOString().split('T')[0];
        if (typeof poblarSelectsCortador === 'function') poblarSelectsCortador();
    }
};

window.cerrarModal = function(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
};