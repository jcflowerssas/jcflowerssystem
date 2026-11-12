let estibasDatos = [];

document.addEventListener('DOMContentLoaded', cargarEstibas);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('es-CO');
const normalizar = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

async function leerLista(url, claveLocal) {
    try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) { /* se usa el respaldo local */ }
    return JSON.parse(localStorage.getItem(claveLocal) || '[]');
}

const sinDuplicados = lista => Array.from(new Map((lista || []).map(i => [i.id, i])).values());

function cantidades(item) {
    const tabacos = Math.abs(Number(item.tabacos) || 0);
    const tallos = Math.abs(Number(item.totalTallos) || (tabacos * Number(item.tallosPorTabaco || 40)) || 0);
    return { tabacos, tallos };
}

async function cargarEstibas() {
    const [entradas, salidas] = await Promise.all([
        leerLista('/api/entradas', 'app_entradas'),
        leerLista('/api/salidas', 'app_salidas')
    ]);

    // Las ubicaciones configuradas aparecen aunque estén vacías
    let ubicaciones = [];
    if (typeof obtenerListasConfiguracion === 'function') {
        ubicaciones = (await obtenerListasConfiguracion()).ubicaciones || [];
    }

    estibasDatos = calcularEstibas(sinDuplicados(entradas), sinDuplicados(salidas), ubicaciones);
    renderizarEstibas();
}

function calcularEstibas(entradas, salidas, ubicaciones) {
    const mapa = {};
    const obtener = nombre => (mapa[nombre] = mapa[nombre] || { nombre, lineas: {} });

    ubicaciones.forEach(obtener);

    entradas.forEach(e => {
        const estiba = obtener(e.ubicacion || 'Sin ubicación');
        const variedad = e.variedad || 'General';
        const grado = e.grado || 'Sin grado';
        const clave = variedad + '|' + grado;
        const linea = estiba.lineas[clave] = estiba.lineas[clave] || { variedad, grado, tabacos: 0, tallos: 0, bloques: new Set() };
        const c = cantidades(e);
        linea.tabacos += c.tabacos;
        linea.tallos += c.tallos;
        if (e.bloque) linea.bloques.add(e.bloque);
    });

    salidas.forEach(s => {
        const estiba = mapa[s.ubicacion || 'Sin ubicación'];
        if (!estiba) return;
        const c = cantidades(s);
        const exacta = estiba.lineas[(s.variedad || 'General') + '|' + (s.grado || 'Sin grado')];
        // Si la salida no trae el mismo grado, se descuenta de la misma variedad que aún tenga producto
        const destino = exacta || Object.values(estiba.lineas).find(l => l.variedad === s.variedad && l.tallos > 0);
        if (!destino) return;
        destino.tabacos = Math.max(0, destino.tabacos - c.tabacos);
        destino.tallos = Math.max(0, destino.tallos - c.tallos);
    });

    return Object.values(mapa).map(e => {
        const lineas = Object.values(e.lineas).filter(l => l.tallos > 0).sort((a, b) => b.tallos - a.tallos);
        const total = k => lineas.reduce((s, l) => s + l[k], 0);
        const tallosRojo = lineas.filter(l => normalizar(l.variedad).includes('freedom')).reduce((s, l) => s + l.tallos, 0);
        return {
            nombre: e.nombre,
            lineas,
            totalTabacos: total('tabacos'),
            totalTallos: total('tallos'),
            tallosRojo
        };
    }).sort((a, b) => (b.totalTallos > 0) - (a.totalTallos > 0) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
}

function htmlLinea(l) {
    const bloques = [...l.bloques].join(', ');
    return `
        <li class="flex items-start justify-between gap-3 py-2">
            <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800 truncate">${esc(l.variedad)}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                    <span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">${esc(l.grado)}</span>
                    ${bloques ? `<span class="ml-1">${esc(bloques)}</span>` : ''}
                </p>
            </div>
            <div class="text-right shrink-0">
                <p class="text-sm font-bold text-slate-900">${num(l.tabacos)} tabacos</p>
                <p class="text-xs text-slate-400">${num(l.tallos)} tallos</p>
            </div>
        </li>`;
}

function htmlTarjeta(e) {
    const hayStock = e.totalTallos > 0;
    const pctRojo = hayStock ? Math.round((e.tallosRojo / e.totalTallos) * 100) : 0;
    const visibles = e.lineas.slice(0, 4);
    const resto = e.lineas.slice(4);

    const cuerpo = hayStock ? `
        <div>
            <div class="flex h-2.5 rounded-full overflow-hidden bg-slate-200" title="Rojo ${pctRojo}% / Colores ${100 - pctRojo}%">
                <div class="bg-red-600" style="width:${pctRojo}%"></div>
                <div class="bg-amber-500" style="width:${100 - pctRojo}%"></div>
            </div>
            <p class="flex gap-4 text-xs text-slate-500 mt-1.5">
                <span><span class="inline-block w-2 h-2 rounded-full bg-red-600 mr-1"></span>Rojo ${pctRojo}%</span>
                <span><span class="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>Colores ${100 - pctRojo}%</span>
            </p>
        </div>
        <ul class="divide-y divide-slate-100">${visibles.map(htmlLinea).join('')}</ul>
        ${resto.length ? `
            <details class="group">
                <summary class="cursor-pointer text-xs font-bold text-teal-700 hover:text-teal-900 py-1">Ver ${resto.length} más</summary>
                <ul class="divide-y divide-slate-100 mt-1">${resto.map(htmlLinea).join('')}</ul>
            </details>` : ''}`
        : `<p class="text-sm text-slate-400 py-2">Esta estiba está vacía.</p>`;

    return `
        <article class="bg-white rounded-2xl border ${hayStock ? 'border-slate-200' : 'border-slate-200 opacity-70'} shadow-sm p-5 space-y-4">
            <div class="flex items-start justify-between gap-3">
                <h3 class="font-extrabold text-slate-800 text-lg leading-tight">${esc(e.nombre)}</h3>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${hayStock ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}">${hayStock ? 'Con producto' : 'Vacía'}</span>
            </div>
            <div class="flex items-baseline gap-2">
                <span class="text-3xl font-black text-slate-900">${num(e.totalTabacos)}</span>
                <span class="text-sm font-semibold text-slate-500">tabacos</span>
                <span class="ml-auto text-sm text-slate-400">${num(e.totalTallos)} tallos</span>
            </div>
            ${cuerpo}
        </article>`;
}

window.renderizarEstibas = function () {
    const grid = document.getElementById('grid-estibas');
    if (!grid) return;

    const q = normalizar(document.getElementById('buscar-estiba')?.value);
    const estado = document.getElementById('filtro-estado')?.value || 'todas';

    const visibles = estibasDatos.filter(e => {
        if (estado === 'stock' && e.totalTallos <= 0) return false;
        if (estado === 'vacias' && e.totalTallos > 0) return false;
        if (!q) return true;
        const texto = normalizar([e.nombre, ...e.lineas.flatMap(l => [l.variedad, l.grado, ...l.bloques])].join(' '));
        return texto.includes(q);
    });

    const conStock = estibasDatos.filter(e => e.totalTallos > 0).length;
    const totalTabacos = estibasDatos.reduce((s, e) => s + e.totalTabacos, 0);
    const resumen = document.getElementById('resumen-estibas');
    if (resumen) {
        resumen.textContent = `${conStock} de ${estibasDatos.length} estibas con producto, ${num(totalTabacos)} tabacos en total.`;
    }

    grid.innerHTML = visibles.length
        ? visibles.map(htmlTarjeta).join('')
        : `<div class="col-span-full p-6 bg-white rounded-2xl border text-center text-slate-400">No hay estibas que coincidan con la búsqueda.</div>`;
};
