document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha de hoy por defecto en los modales que tengan inputs de fecha
    const hoy = new Date().toISOString().split('T')[0];
    ['input-fecha-ingreso', 'inc-fecha', 'sc-fecha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = hoy;
    });

    // Cargar listas configuradas y vista inicial
    if (typeof cargarListasConfiguradas === 'function') {
        cargarListasConfiguradas();
    }
    
    cambiarVista('inventario');
});

function cambiarVista(vista) {
    // Ocultar todas las vistas
    const vistas = ['vista-inventario', 'vista-incompletos', 'vista-cortadores', 'vista-produccion'];
    vistas.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    // Mostrar la vista seleccionada
    const vistaActiva = document.getElementById(`vista-${vista}`);
    if (vistaActiva) {
        vistaActiva.classList.remove('hidden');
    }

    // Ejecutar renderizados específicos según la vista
    if (vista === 'inventario' && typeof renderizarInventario === 'function') {
        renderizarInventario();
    } else if (vista === 'incompletos' && typeof renderizarIncompletos === 'function') {
        renderizarIncompletos();
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