document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha actual por defecto en los campos de fecha
    const hoy = new Date().toISOString().split('T')[0];
    ['input-fecha-ingreso', 'inc-fecha', 'sc-fecha', 'salida-fecha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = hoy;
    });

    if (typeof cargarListasConfiguradas === 'function') {
        cargarListasConfiguradas();
    }
    
    cambiarVista('inventario');
});

function cambiarVista(vista) {
    const vistas = ['vista-inventario', 'vista-salidas', 'vista-incompletos', 'vista-cortadores', 'vista-produccion'];
    vistas.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    const vistaActiva = document.getElementById(`vista-${vista}`);
    if (vistaActiva) {
        vistaActiva.classList.remove('hidden');
    }

    if (vista === 'inventario' && typeof cargarInventario === 'function') {
        cargarInventario();
    } else if (vista === 'salidas' && typeof cargarSalidas === 'function') {
        cargarSalidas();
    } else if (vista === 'incompletos' && typeof cargarIncompletos === 'function') {
        cargarIncompletos();
    } else if (vista === 'cortadores' && typeof renderizarCortadores === 'function') {
        renderizarCortadores();
    } else if (vista === 'produccion' && typeof renderizarGraficoProduccion === 'function') {
        renderizarGraficoProduccion();
    }
}

function abrirModalEntrada() {
    const m = document.getElementById('modal-entrada');
    if (m) m.classList.remove('hidden');
}

function abrirModalIncompleto() {
    const m = document.getElementById('modal-incompleto');
    if (m) m.classList.remove('hidden');
}

function abrirModalCortador() {
    const m = document.getElementById('modal-cortador');
    if (m) m.classList.remove('hidden');
}

function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
}