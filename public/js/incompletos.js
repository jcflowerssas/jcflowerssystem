let incompletos = [];

async function cargarIncompletos() {
    try {
        const res = await fetch('/api/incompletos');
        incompletos = res.ok ? await res.json() : [];
        renderizarIncompletos();
    } catch (err) {
        console.error('Error al cargar tabacos incompletos:', err);
    }
}

function renderizarIncompletos() {
    const tbody = document.getElementById('tabla-incompletos-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (incompletos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-400">No hay tabacos incompletos registrados.</td></tr>`;
        return;
    }

    incompletos.forEach(item => {
        const faltantes = item.tallosMeta - item.tallosActuales;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50/50 border-b';
        tr.innerHTML = `
            <td class="p-4 font-semibold text-amber-700">${item.ubicacion || ''}</td>
            <td class="p-4 font-bold text-amber-900">${item.bloque || ''}</td>
            <td class="p-4 font-medium">${item.variedad || ''}</td>
            <td class="p-4"><span class="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs">${item.grado || ''}</span></td>
            <td class="p-4 font-bold text-slate-800">${item.tallosActuales || 0} tallos</td>
            <td class="p-4 text-gray-600">${item.tallosMeta || 0} tallos</td>
            <td class="p-4 font-bold text-rose-600">Faltan ${faltantes} tallos</td>
            <td class="p-4 text-xs font-semibold text-slate-700">${item.cortador || 'N/A'}</td>
            <td class="p-4 text-center">
                <button onclick="completarIncompleto(${item.id})" class="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 font-bold">Completar Lote</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function completarIncompleto(id) {
    const item = incompletos.find(i => i.id === id);
    if (!item) return;
    const faltantes = item.tallosMeta - item.tallosActuales;
    const abono = prompt(`¿Cuántos tallos llegaron hoy para completar ${item.variedad}? (Faltan ${faltantes})`, faltantes);
    
    if (abono !== null) {
        const cant = parseInt(abono) || 0;
        item.tallosActuales += cant;
        
        if (item.tallosActuales >= item.tallosMeta) {
            await fetch('/api/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: new Date().toISOString().split('T')[0],
                    ubicacion: item.ubicacion,
                    bloque: item.bloque,
                    variedad: item.variedad,
                    grado: item.grado,
                    tabacos: 1,
                    tallosPorTabaco: item.tallosMeta
                })
            });
            await fetch(`/api/incompletos/${id}`, { method: 'DELETE' });
            alert('¡El tabaco ha quedado completo y se movió al inventario principal!');
        }
        cargarIncompletos();
    }
}