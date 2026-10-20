let entradasGlobal = [];
let salidasGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
    cargarEntradas();
    cargarSalidas();
});

// Función para normalizar texto (evita fallos por mayúsculas, espacios o paréntesis)
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

    try {
        const [resE, resS] = await Promise.all([
            fetch('/api/entradas').catch(() => null),
            fetch('/api/salidas').catch(() => null)
        ]);

        if (resE && resE.ok) entradasGlobal = await resE.json();
        if (resS && resS.ok) salidasGlobal = await resS.json();
    } catch (err) {
        console.warn('Error consultando servidor Railway:', err);
    }

    const mapaStock = {};

    // A. Sumar Entradas
    (entradasGlobal || []).forEach(e => {
        const u = normalizarTexto(e.ubicacion);
        const b = normalizarTexto(e.bloque);
        const vNorm = normalizarTexto(e.variedad);
        const g = normalizarTexto(e.grado);

        const clave = `${u}_${b}_${vNorm}_${g}`;

        const tallos = Number(e.totalTallos) || (Number(e.tabacos || 0) * Number(e.tallosPorTabaco || 40)) || 0;
        const tabacos = Number(e.tabacos || 0);

        const esRojo = vNorm.includes('freedom') || (e.tipo && e.tipo.toLowerCase() === 'rojo');

        if (!mapaStock[clave]) {
            mapaStock[clave] = {
                ubicacion: e.ubicacion || '-',
                bloque: e.bloque || '-',
                variedad: e.variedad || '-',
                tipo: esRojo ? 'Rojo' : 'Color',
                grado: e.grado || '-',
                tallosPorTabaco: Number(e.tallosPorTabaco) || 40,
                entradasTallos: 0,
                salidasTallos: 0,
                entradasTabacos: 0,
                salidasTabacos: 0
            };
        }

        mapaStock[clave].entradasTallos += tallos;
        mapaStock[clave].entradasTabacos += tabacos;
    });

    // B. Restar Salidas
    (salidasGlobal || []).forEach(s => {
        const u = normalizarTexto(s.ubicacion);
        const b = normalizarTexto(s.bloque);
        const vNorm = normalizarTexto(s.variedad);
        const g = normalizarTexto(s.grado);

        const clave = `${u}_${b}_${vNorm}_${g}`;

        const tallos = Number(s.totalTallos) || (Number(s.tabacos || 0) * Number(s.tallosPorTabaco || 40)) || 0;
        const tabacos = Number(s.tabacos || 0);

        if (!mapaStock[clave]) {
            const esRojo = vNorm.includes('freedom') || (s.tipo && s.tipo.toLowerCase() === 'rojo');
            mapaStock[clave] = {
                ubicacion: s.ubicacion || '-',
                bloque: s.bloque || '-',
                variedad: s.variedad || '-',
                tipo: esRojo ? 'Rojo' : 'Color',
                grado: s.grado || '-',
                tallosPorTabaco: Number(s.tallosPorTabaco) || 40,
                entradasTallos: 0,
                salidasTallos: 0,
                entradasTabacos: 0,
                salidasTabacos: 0
            };
        }

        mapaStock[clave].salidasTallos += tallos;
        mapaStock[clave].salidasTabacos += tabacos;
    });

    const items = Object.values(mapaStock);

    // C. Actualizar tarjetas de Resumen Superior
    actualizarTablaResumen(items);

    // D. Renderizar la tabla principal de Inventario
    if (tbody) {
        tbody.innerHTML = '';

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay productos registrados en el inventario.</td></tr>`;
            return;
        }

        items.forEach(item => {
            const tallosNetos = item.entradasTallos - item.salidasTallos;
            const tabacosNetos = item.entradasTabacos - item.salidasTabacos;

            const badgeTipo = item.tipo === 'Rojo' 
                ? '<span class="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">Rojo</span>'
                : '<span class="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">Color</span>';

            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-slate-50 text-sm text-slate-700';
            tr.innerHTML = `
                <td class="p-3 font-medium">${item.ubicacion}</td>
                <td class="p-3">${item.bloque}</td>
                <td class="p-3 font-bold text-slate-800">${item.variedad}</td>
                <td class="p-3">${badgeTipo}</td>
                <td class="p-3">${item.grado}</td>
                <td class="p-3">${tabacosNetos > 0 ? tabacosNetos : 0} tabacos</td>
                <td class="p-3 text-xs text-gray-500">${item.tallosPorTabaco} c/u</td>
                <td class="p-3 font-extrabold ${tallosNetos < 0 ? 'text-rose-600' : 'text-emerald-900'}">
                    ${tallosNetos.toLocaleString()} tallos
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
};

// Función para rellenar la tabla del Resumen de Clasificación y Grado
function actualizarTablaResumen(items) {
    const resumen = {
        rojo: { g50: 0, g40: 0, nacional: 0, totalTallos: 0, totalTabacos: 0 },
        color: { g50: 0, g40: 0, nacional: 0, totalTallos: 0, totalTabacos: 0 }
    };

    items.forEach(item => {
        const tallos = item.entradasTallos - item.salidasTallos;
        const tabacos = item.entradasTabacos - item.salidasTabacos;
        
        if (tallos <= 0) return; // Solo considerar stock disponible positivo

        const cat = item.tipo === 'Rojo' ? resumen.rojo : resumen.color;
        const g = item.grado.toLowerCase();

        if (g.includes('50')) {
            cat.g50 += tallos;
        } else if (g.includes('40')) {
            cat.g40 += tallos;
        } else {
            cat.nacional += tallos;
        }

        cat.totalTallos += tallos;
        cat.totalTabacos += tabacos;
    });

    const setTexto = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };

    // Actualizar Freedom (Rojo)
    setTexto('resumen-rojo-g50', `${resumen.rojo.g50.toLocaleString()} tallos`);
    setTexto('resumen-rojo-g40', `${resumen.rojo.g40.toLocaleString()} tallos`);
    setTexto('resumen-rojo-nac', `${resumen.rojo.nacional.toLocaleString()} tallos`);
    setTexto('resumen-rojo-total', `${resumen.rojo.totalTallos.toLocaleString()} tallos`);

    // Actualizar Colores
    setTexto('resumen-color-g50', `${resumen.color.g50.toLocaleString()} tallos`);
    setTexto('resumen-color-g40', `${resumen.color.g40.toLocaleString()} tallos`);
    setTexto('resumen-color-nac', `${resumen.color.nacional.toLocaleString()} tallos`);
    setTexto('resumen-color-total', `${resumen.color.totalTallos.toLocaleString()} tallos`);
}