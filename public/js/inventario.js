document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
    cargarEntradas();
    cargarSalidas();
});

function normalizarTexto(txt) {
    if (!txt) return '';
    return String(txt).toLowerCase().replace(/\(.*\)/g, '').trim();
}

// CARGAR Y RENDERIZAR ENTRADAS
async function cargarEntradas() {
    let entradas = [];
    try {
        const res = await fetch('/api/entradas');
        if (res.ok) {
            entradas = await res.json();
        } else {
            entradas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
        }
    } catch (err) {
        entradas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
    }
    window.entradasGlobal = entradas;
    renderizarEntradas();
}

function renderizarEntradas() {
    const tbody = document.getElementById('tabla-entradas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const lista = window.entradasGlobal || [];
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros de entradas.</td></tr>`;
        return;
    }

    lista.forEach(item => {
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

// GUARDAR ENTRADA FLEXIBLE
window.guardarEntrada = async function(event) {
    if (event) event.preventDefault();

    const form = document.getElementById('form-entrada');
    
    const fecha = document.getElementById('se-fecha')?.value || form?.querySelector('[type="date"]')?.value || new Date().toISOString().split('T')[0];
    const ubicacion = document.getElementById('se-ubicacion')?.value || form?.querySelectorAll('select')[0]?.value || '';
    const bloque = document.getElementById('se-bloque')?.value || form?.querySelectorAll('select')[1]?.value || '';
    const variedad = document.getElementById('se-variedad')?.value || form?.querySelectorAll('select')[2]?.value || '';
    const grado = document.getElementById('se-grado')?.value || form?.querySelectorAll('select')[3]?.value || '';
    const tabacos = parseInt(document.getElementById('se-tabacos')?.value || form?.querySelector('input[type="number"]')?.value) || 0;
    const selectTallos = document.getElementById('se-tallos-tabaco')?.value || form?.querySelectorAll('select')[4]?.value || '40';
    const tallosPorTabaco = parseInt(selectTallos) || 40;
    const totalTallos = tabacos * tallosPorTabaco;

    if (!ubicacion || !variedad) {
        alert('Por favor selecciona la Ubicación y la Variedad.');
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
        console.warn('Backend /api/entradas no disponible, guardando en localStorage:', err);
    }

    const entradasGuardadas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
    entradasGuardadas.unshift(nuevaEntrada);
    localStorage.setItem('app_entradas', JSON.stringify(entradasGuardadas));

    window.entradasGlobal = entradasGuardadas;

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
        console.warn('Error al eliminar del servidor:', err);
    }
    const entradasGuardadas = JSON.parse(localStorage.getItem('app_entradas') || '[]').filter(e => String(e.id) !== String(id));
    localStorage.setItem('app_entradas', JSON.stringify(entradasGuardadas));
    window.entradasGlobal = entradasGuardadas;
    renderizarEntradas();
    cargarInventario();
};

// CARGAR Y RENDERIZAR SALIDAS
async function cargarSalidas() {
    let salidas = [];
    try {
        const res = await fetch('/api/salidas');
        if (res.ok) {
            salidas = await res.json();
        } else {
            salidas = JSON.parse(localStorage.getItem('app_salidas') || '[]');
        }
    } catch (err) {
        salidas = JSON.parse(localStorage.getItem('app_salidas') || '[]');
    }
    window.salidasGlobal = salidas;
    renderizarSalidas();
}

function renderizarSalidas() {
    const tbody = document.getElementById('tabla-salidas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const lista = window.salidasGlobal || [];
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros de salidas.</td></tr>`;
        return;
    }

    lista.forEach(item => {
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

window.cargarInventario = async function() {
    const tbody = document.getElementById('tabla-inventario-body');

    // Cargar entradas registradas
    const entradas = window.entradasGlobal || JSON.parse(localStorage.getItem('app_entradas') || '[]');

    // 1. Actualizar la tabla de resumen superior
    actualizarTablaResumen(entradas);

    // 2. Renderizar la tabla de registros individuales con botón Eliminar
    if (tbody) {
        tbody.innerHTML = '';

        if (entradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-400 italic">No hay registros de entradas en el inventario.</td></tr>`;
            return;
        }

        entradas.forEach(item => {
            const tallosTotales = Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0;
            const esRojo = (item.variedad || '').toLowerCase().includes('freedom') || (item.tipo && item.tipo.toLowerCase() === 'rojo');

            const badgeTipo = esRojo 
                ? '<span class="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">Rojo</span>'
                : '<span class="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">Color</span>';

            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-slate-50 text-sm text-slate-700';
            tr.innerHTML = `
                <td class="p-3 text-xs font-semibold text-slate-500">${item.fecha || '-'}</td>
                <td class="p-3 font-medium">${item.ubicacion || '-'}</td>
                <td class="p-3">${item.bloque || '-'}</td>
                <td class="p-3 font-bold text-slate-800">${item.variedad || '-'}</td>
                <td class="p-3">${badgeTipo}</td>
                <td class="p-3">${item.grado || '-'}</td>
                <td class="p-3 font-semibold">${item.tabacos || 0} tabacos</td>
                <td class="p-3 text-xs text-gray-500">${item.tallosPorTabaco || 40} c/u</td>
                <td class="p-3 font-extrabold text-emerald-900">${tallosTotales.toLocaleString()} tallos</td>
                <td class="p-3 text-center">
                    <button onclick="eliminarEntrada('${item.id}')" class="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-xs transition shadow-sm">
                        🗑️ Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
};

function actualizarTablaResumen(items) {
    const resumen = {
        rojo: { 
            g50_tallos: 0, g50_tabacos: 0, 
            g40_tallos: 0, g40_tabacos: 0, 
            nac_tallos: 0, nac_tabacos: 0, 
            totalTallos: 0, totalTabacos: 0 
        },
        color: { 
            g50_tallos: 0, g50_tabacos: 0, 
            g40_tallos: 0, g40_tabacos: 0, 
            nac_tallos: 0, nac_tabacos: 0, 
            totalTallos: 0, totalTabacos: 0 
        }
    };

    if (Array.isArray(items)) {
        items.forEach(item => {
            const tallos = Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0;
            const tabacos = Number(item.tabacos) || 0;

            if (tallos <= 0) return;

            const tipo = (item.tipo || '').toLowerCase();
            const variedad = (item.variedad || '').toLowerCase();
            const grado = (item.grado || '').trim().toLowerCase();

            const esRojo = variedad.includes('freedom') || tipo === 'rojo';
            const cat = esRojo ? resumen.rojo : resumen.color;

            if (grado.includes('50')) {
                cat.g50_tallos += tallos;
                cat.g50_tabacos += tabacos;
            } else if (grado.includes('40')) {
                cat.g40_tallos += tallos;
                cat.g40_tabacos += tabacos;
            } else {
                cat.nac_tallos += tallos;
                cat.nac_tabacos += tabacos;
            }

            cat.totalTallos += tallos;
            cat.totalTabacos += tabacos;
        });
    }

    const setTexto = (id, tallos, tabacos) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `${tallos.toLocaleString()} tallos<br><span class="text-gray-500 font-normal">(${tabacos.toLocaleString()} tabacos)</span>`;
        }
    };

    // Actualizar Freedom (Rojo)
    setTexto('rojo-g50', resumen.rojo.g50_tallos, resumen.rojo.g50_tabacos);
    setTexto('rojo-g40', resumen.rojo.g40_tallos, resumen.rojo.g40_tabacos);
    setTexto('rojo-nac', resumen.rojo.nac_tallos, resumen.rojo.nac_tabacos);
    setTexto('rojo-total', resumen.rojo.totalTallos, resumen.rojo.totalTabacos);

    // Actualizar Colores
    setTexto('color-g50', resumen.color.g50_tallos, resumen.color.g50_tabacos);
    setTexto('color-g40', resumen.color.g40_tallos, resumen.color.g40_tabacos);
    setTexto('color-nac', resumen.color.nac_tallos, resumen.color.nac_tabacos);
    setTexto('color-total', resumen.color.totalTallos, resumen.color.totalTabacos);

    // Totales Generales
    setTexto('tot-g50', resumen.rojo.g50_tallos + resumen.color.g50_tallos, resumen.rojo.g50_tabacos + resumen.color.g50_tabacos);
    setTexto('tot-g40', resumen.rojo.g40_tallos + resumen.color.g40_tallos, resumen.rojo.g40_tabacos + resumen.color.g40_tabacos);
    setTexto('tot-nac', resumen.rojo.nac_tallos + resumen.color.nac_tallos, resumen.rojo.nac_tabacos + resumen.color.nac_tabacos);
    setTexto('tot-general', resumen.rojo.totalTallos + resumen.color.totalTallos, resumen.rojo.totalTabacos + resumen.color.totalTabacos);
}