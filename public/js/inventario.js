let entradasGlobal = [];
let salidasGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
    cargarEntradas();
    cargarSalidas();
});

// Función para normalizar texto (evita fallos por mayúsculas, espacios o parentesis)
function normalizarTexto(txt) {
    if (!txt) return '';
    return String(txt)
        .toLowerCase()
        .replace(/\(.*\)/g, '')
        .trim();
}

// ----------------------------------------------------
// 1. CARGAR Y RENDERIZAR ENTRADAS
// ----------------------------------------------------
async function cargarEntradas() {
    try {
        const res = await fetch('/api/entradas');
        if (res.ok) {
            entradasGlobal = await res.json();
            renderizarEntradas();
        }
    } catch (err) {
        console.warn('Error al cargar entradas desde el servidor:', err);
    }
}

function renderizarEntradas() {
    const tbody = document.getElementById('tabla-entradas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!entradasGlobal || entradasGlobal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros de entradas.</td></tr>`;
        return;
    }

    entradasGlobal.forEach(item => {
        const totalTallos = Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b text-slate-700 text-sm';
        tr.innerHTML = `
            <td class="p-3 text-xs font-semibold">${item.fecha || ''}</td>
            <td class="p-3 font-medium">${item.ubicacion || ''}</td>
            <td class="p-3">${item.bloque || ''}</td>
            <td class="p-3 font-bold text-slate-800">${item.variedad || ''}</td>
            <td class="p-3">${item.grado || ''}</td>
            <td class="p-3">${item.tabacos || 0} tabacos</td>
            <td class="p-3 font-extrabold text-emerald-900">${totalTallos.toLocaleString()} tallos</td>
            <td class="p-3 text-center">
                <button onclick="eliminarEntrada('${item.id}')" class="px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-xs font-bold">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.guardarEntrada = async function(event) {
    if (event) event.preventDefault();

    const fecha = document.getElementById('se-fecha')?.value;
    const ubicacion = document.getElementById('se-ubicacion')?.value;
    const bloque = document.getElementById('se-bloque')?.value;
    const variedad = document.getElementById('se-variedad')?.value;
    const grado = document.getElementById('se-grado')?.value;
    const tabacos = parseInt(document.getElementById('se-tabacos')?.value) || 0;
    const tallosPorTabaco = parseInt(document.getElementById('se-tallos-tabaco')?.value) || 40;
    const totalTallos = tabacos * tallosPorTabaco;

    if (!ubicacion || !variedad) {
        alert('Por favor completa los campos obligatorios.');
        return;
    }

    const nuevaEntrada = {
        id: Date.now().toString(),
        fecha,
        ubicacion,
        bloque,
        variedad,
        tipo: variedad.toLowerCase().includes('freedom') ? 'Rojo' : 'Color',
        grado,
        tabacos,
        tallosPorTabaco,
        totalTallos
    };

    try {
        await fetch('/api/entradas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaEntrada)
        });
    } catch (err) {
        console.warn('API /api/entradas no disponible, guardando localmente:', err);
    }

    entradasGlobal.unshift(nuevaEntrada);

    const form = document.getElementById('form-entrada');
    if (form) form.reset();
    if (typeof cerrarModal === 'function') cerrarModal('modal-entrada');

    renderizarEntradas();
    cargarInventario();
};

window.eliminarEntrada = async function(id) {
    if (!confirm('¿Deseas eliminar este registro de entrada?')) return;
    try {
        await fetch(`/api/entradas/${id}`, { method: 'DELETE' });
    } catch (err) {
        console.warn('Error al eliminar entrada del servidor:', err);
    }
    entradasGlobal = entradasGlobal.filter(e => String(e.id) !== String(id));
    renderizarEntradas();
    cargarInventario();
};


// ----------------------------------------------------
// 2. CARGAR Y RENDERIZAR SALIDAS
// ----------------------------------------------------
async function cargarSalidas() {
    try {
        const res = await fetch('/api/salidas');
        if (res.ok) {
            salidasGlobal = await res.json();
            renderizarSalidas();
        }
    } catch (err) {
        console.warn('Error al cargar salidas desde el servidor:', err);
    }
}

function renderizarSalidas() {
    const tbody = document.getElementById('tabla-salidas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!salidasGlobal || salidasGlobal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros de salidas.</td></tr>`;
        return;
    }

    salidasGlobal.forEach(item => {
        const totalTallos = Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b text-slate-700 text-sm';
        tr.innerHTML = `
            <td class="p-3 text-xs font-semibold">${item.fecha || ''}</td>
            <td class="p-3 font-medium">${item.ubicacion || ''}</td>
            <td class="p-3">${item.bloque || ''}</td>
            <td class="p-3 font-bold text-slate-800">${item.variedad || ''}</td>
            <td class="p-3">${item.grado || ''}</td>
            <td class="p-3">${item.tabacos || 0} tabacos</td>
            <td class="p-3 font-extrabold text-rose-700">${totalTallos.toLocaleString()} tallos</td>
            <td class="p-3 text-center">
                <button onclick="eliminarSalida('${item.id}')" class="px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-xs font-bold">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.guardarSalida = async function(event) {
    if (event) event.preventDefault();

    const fecha = document.getElementById('ss-fecha')?.value;
    const ubicacion = document.getElementById('ss-ubicacion')?.value;
    const bloque = document.getElementById('ss-bloque')?.value;
    const variedad = document.getElementById('ss-variedad')?.value;
    const grado = document.getElementById('ss-grado')?.value;
    const tabacos = parseInt(document.getElementById('ss-tabacos')?.value) || 0;
    const tallosPorTabaco = parseInt(document.getElementById('ss-tallos-tabaco')?.value) || 40;
    const totalTallos = tabacos * tallosPorTabaco;

    if (!ubicacion || !variedad) {
        alert('Por favor completa los campos obligatorios.');
        return;
    }

    const nuevaSalida = {
        id: Date.now().toString(),
        fecha,
        ubicacion,
        bloque,
        variedad,
        tipo: variedad.toLowerCase().includes('freedom') ? 'Rojo' : 'Color',
        grado,
        tabacos,
        tallosPorTabaco,
        totalTallos
    };

    try {
        await fetch('/api/salidas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaSalida)
        });
    } catch (err) {
        console.warn('API /api/salidas no disponible, guardando localmente:', err);
    }

    salidasGlobal.unshift(nuevaSalida);

    const form = document.getElementById('form-salida');
    if (form) form.reset();
    if (typeof cerrarModal === 'function') cerrarModal('modal-salida');

    renderizarSalidas();
    cargarInventario();
};

window.eliminarSalida = async function(id) {
    if (!confirm('¿Deseas eliminar este registro de salida?')) return;
    try {
        await fetch(`/api/salidas/${id}`, { method: 'DELETE' });
    } catch (err) {
        console.warn('Error al eliminar salida del servidor:', err);
    }
    salidasGlobal = salidasGlobal.filter(s => String(s.id) !== String(id));
    renderizarSalidas();
    cargarInventario();
};


// ----------------------------------------------------
// 3. INVENTARIO PRINCIPAL Y TABLA RESUMEN (CÁLCULO Y DESCUENTOS)
// ----------------------------------------------------
window.cargarInventario = async function() {
    const tbody = document.getElementById('tabla-inventario-body');

    // Cargar datos del servidor
    try {
        const [resE, resS] = await Promise.all([
            fetch('/api/entradas').catch(() => null),
            fetch('/api/salidas').catch(() => null)
        ]);

        if (resE && resE.ok) entradasGlobal = await resE.json();
        if (resS && resS.ok) salidasGlobal =