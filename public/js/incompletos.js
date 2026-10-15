// Renderizar Tabla de Tabacos Incompletos
function renderizarIncompletos() {
    const tbody = document.getElementById('tabla-incompletos-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    incompletos.forEach(item => {
        const faltantes = item.tallosMeta - item.tallosActuales;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50/50 border-b';
        tr.innerHTML = `
            <td class="p-4 font-semibold text-amber-700">${item.ubicacion}</td>
            <td class="p-4 font-bold text-amber-900">${item.bloque}</td>
            <td class="p-4 font-medium">${item.variedad}</td>
            <td class="p-4"><span class="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs">Grado ${item.grado}</span></td>
            <td class="p-4 font-bold text-slate-800">${item.tallosActuales} tallos</td>
            <td class="p-4 text-gray-600">${item.tallosMeta} tallos</td>
            <td class="p-4 font-bold text-rose-600">Faltan ${faltantes} tallos</td>
            <td class="p-4 text-xs font-semibold text-slate-700">${item.cortador || 'N/A'}</td>
            <td class="p-4 text-center">
                <button onclick="completarIncompleto(${item.id})" class="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">Completar Lote</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Guardar Nuevo Tabaco Incompleto en el Servidor
async function guardarIncompleto(e) {
    e.preventDefault();
    const hoy = new Date().toISOString().split('T')[0];
    const nuevo = {
        fecha: hoy,
        bloque: document.getElementById('inc-bloque').value,
        ubicacion: document.getElementById('inc-ubicacion').value,
        variedad: document.getElementById('inc-variedad').value,
        grado: document.getElementById('inc-grado').value,
        tallosActuales: parseInt(document.getElementById('inc-actuales').value),
        tallosMeta: parseInt(document.getElementById('inc-meta').value),
        cortador: document.getElementById('inc-cortador').value
    };

    await fetch('/api/incompletos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo)
    });

    cerrarModal('modal-incompleto');
    document.getElementById('form-incompleto').reset();
    cambiarVista('incompletos');
    cargarDatosServidor();
}

// Completar un Lote Incompleto y moverlo al Inventario Principal
async function completarIncompleto(id) {
    const item = incompletos.find(i => i.id === id);
    if (!item) return;
    const faltantes = item.tallosMeta - item.tallosActuales;
    const abono = prompt(`¿Cuántos tallos llegaron hoy para completar ${item.variedad}? (Faltan ${faltantes})`, faltantes);
    if (abono) {
        const cant = parseInt(abono);
        item.tallosActuales += cant;
        if (item.tallosActuales >= item.tallosMeta) {
            // Mover al inventario principal
            await fetch('/api/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: new Date().toISOString().split('T')[0],
                    bloque: item.bloque,
                    ubicacion: item.ubicacion,
                    variedad: item.variedad,
                    grado: item.grado,
                    tabacos: 1,
                    tallosPorTabaco: item.tallosMeta
                })
            });
            // Eliminar de incompletos
            await fetch(`/api/incompletos/${id}`, { method: 'DELETE' });
            alert('¡El tabaco ha quedado completo y se movió al inventario principal!');
        }
        cargarDatosServidor();
    }
}