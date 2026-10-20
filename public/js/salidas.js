
async function cargarSalidas() {
    try {
        const res = await fetch('/api/salidas');
        salidasGlobal = res.ok ? await res.json() : [];
        renderizarSalidas();
    } catch (error) {
        console.error('Error al cargar las salidas:', error);
    }
}

function poblarSelectsSalidas() {
    if (typeof listasGlobales === 'undefined') return;

    const llenarSelect = (id, items) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const actual = sel.value;
        sel.innerHTML = `<option value="">-- Seleccione --</option>`;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            sel.appendChild(opt);
        });
        if (actual) sel.value = actual;
    };

    llenarSelect('salida-ubicacion', listasGlobales.ubicaciones);
    llenarSelect('salida-bloque', listasGlobales.bloques);
    llenarSelect('salida-variedad', listasGlobales.variedades);
    llenarSelect('salida-grado', listasGlobales.grados);
}

function renderizarSalidas() {
    const tbody = document.getElementById('tabla-salidas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (salidasGlobal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-400">No hay registros de salidas.</td></tr>`;
        return;
    }

    salidasGlobal.forEach(item => {
        const totalTallos = (Number(item.tabacos) || 0) * (Number(item.tallosPorTabaco) || 0);
        const esRojo = (item.variedad || '').trim().toLowerCase().includes('freedom');

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 text-slate-700 border-b';

        tr.innerHTML = `
            <td class="p-3 text-xs font-semibold text-slate-600">${item.fecha || ''}</td>
            <td class="p-3 text-xs">${item.ubicacion || ''}</td>
            <td class="p-3 font-semibold">${item.bloque || ''}</td>
            <td class="p-3 font-bold">${item.variedad || ''}</td>
            <td class="p-3">
                <span class="px-2 py-1 text-xs rounded-full font-bold ${esRojo ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}">
                    ${esRojo ? 'Rojo' : 'Color'}
                </span>
            </td>
            <td class="p-3 text-xs">${item.grado || ''}</td>
            <td class="p-3 font-semibold text-slate-800">${item.tabacos || 0} tabacos</td>
            <td class="p-3 text-xs text-slate-500">${item.tallosPorTabaco || 0} c/u</td>
            <td class="p-3 font-extrabold text-rose-700">${totalTallos} tallos</td>
            <td class="p-3 text-center">
                <button onclick="eliminarSalida(${item.id})" class="px-2.5 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-xs font-bold">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function guardarSalida(e) {
    e.preventDefault();
    const nuevaSalida = {
        fecha: document.getElementById('salida-fecha').value,
        ubicacion: document.getElementById('salida-ubicacion').value,
        bloque: document.getElementById('salida-bloque').value,
        variedad: document.getElementById('salida-variedad').value,
        grado: document.getElementById('salida-grado').value,
        tabacos: parseInt(document.getElementById('salida-tabacos').value) || 0,
        tallosPorTabaco: parseInt(document.getElementById('salida-tallos').value) || 40
    };

    try {
        const res = await fetch('/api/salidas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaSalida)
        });

        if (res.ok) {
            cerrarModal('modal-salida');
            e.target.reset();
            cargarSalidas();
        } else {
            alert('No se pudo registrar la salida.');
        }
    } catch (error) {
        console.error('Error al guardar salida:', error);
    }

    // Al final de la función guardarSalida:
    if (typeof cargarInventario === 'function') {
    cargarInventario();
    }
}

async function eliminarSalida(id) {
    if (!confirm('¿Estás seguro de eliminar este registro de salida?')) return;
    try {
        const res = await fetch(`/api/salidas/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cargarSalidas();
        } else {
            alert('No se pudo eliminar el registro.');
        }
    } catch (error) {
        console.error('Error al eliminar salida:', error);
    }
}