let registros = [];
let bloquesConocidos = [];
let variedadesConocidas = [];
let grafico = null;

const PALETA = ['#2c6d51', '#a5864c', '#4a86a8', '#8a9a3f', '#a33a4a', '#6b5b95', '#2f8f8a', '#c07a45'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Math.round(n).toLocaleString('es-CO');
const val = id => document.getElementById(id)?.value || '';
const poner = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
const natural = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
const suma = lista => lista.reduce((s, r) => s + r.tallos, 0);

// ---------- Fechas (siempre en hora local, no UTC) ----------
function fechaStr(y, m, d) { return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10); }
function hoyLocal() { const d = new Date(); return fechaStr(d.getFullYear(), d.getMonth(), d.getDate()); }

function semanaISO(str) {
    const [y, m, d] = str.split('-').map(Number);
    const f = new Date(Date.UTC(y, m - 1, d));
    f.setUTCDate(f.getUTCDate() + 4 - (f.getUTCDay() || 7));
    const ini = new Date(Date.UTC(f.getUTCFullYear(), 0, 1));
    return { semana: Math.ceil(((f - ini) / 86400000 + 1) / 7), anio: f.getUTCFullYear() };
}

function fechasDeSemana(semana, anio) {
    const dow = new Date(Date.UTC(anio, 0, 4)).getUTCDay() || 7;
    const lunes = Date.UTC(anio, 0, 4 - (dow - 1) + (semana - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => new Date(lunes + i * 86400000).toISOString().slice(0, 10));
}

function fechasDeMes(ym) {
    const [y, m] = ym.split('-').map(Number);
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => fechaStr(y, m - 1, i + 1));
}

// ---------- Carga de datos ----------
// La producción sale de las entradas al cuarto frío (Inventario Principal)
function normalizarEntradas(entradas) {
    return entradas.map(e => ({
        fecha: e.fecha || e.fechaIngreso,
        bloque: e.bloque || 'Sin bloque',
        variedad: e.variedad || 'Sin variedad',
        tallos: Number(e.totalTallos) || (Number(e.tabacos || 0) * Number(e.tallosPorTabaco || 40)) || 0
    })).filter(r => r.fecha && r.tallos > 0);
}

async function cargarProduccion() {
    let entradas = [];
    try {
        const res = await fetch('/api/entradas');
        if (res.ok) entradas = await res.json();
    } catch (e) { /* se usa el respaldo local */ }
    if (!entradas.length) entradas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
    entradas = Array.from(new Map(entradas.map(e => [e.id, e])).values());
    registros = normalizarEntradas(entradas);

    const listas = typeof obtenerListasConfiguracion === 'function' ? await obtenerListasConfiguracion() : {};
    const unir = (a, b) => [...new Set([...(a || []), ...b])].sort(natural);
    bloquesConocidos = unir(listas.bloques, registros.map(r => r.bloque));
    variedadesConocidas = unir(listas.variedades, registros.map(r => r.variedad));

    document.getElementById('filtro-variedad').innerHTML = '<option value="">Todas las variedades</option>' +
        variedadesConocidas.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');

    document.getElementById('lista-checkbox-bloques').innerHTML = bloquesConocidos.map(b => `
        <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
            <input type="checkbox" name="filtro-bloque-check" value="${esc(b)}" checked onchange="actualizarSeleccionBloques()" class="rounded w-4 h-4">
            <span>${esc(b)}</span>
        </label>`).join('');

    cambiarTipoTemporal();
    renderizarDia();
}

document.addEventListener('DOMContentLoaded', () => {
    const hoy = hoyLocal();
    const s = semanaISO(hoy);
    poner('fecha-dia', hoy);
    poner('input-dia', hoy);
    poner('input-mes', hoy.slice(0, 7));
    poner('input-semana', s.semana);
    poner('input-anio', s.anio);
    cargarProduccion();
});

document.addEventListener('click', e => {
    if (!e.target.closest('#dropdown-wrap')) document.getElementById('dropdown-bloques')?.classList.add('hidden');
});

// ---------- Filtro de bloques ----------
const bloquesSeleccionados = () => [...document.querySelectorAll('input[name="filtro-bloque-check"]:checked')].map(c => c.value);

window.toggleDropdownBloques = () => document.getElementById('dropdown-bloques').classList.toggle('hidden');

window.seleccionarTodosBloques = function (master) {
    document.querySelectorAll('input[name="filtro-bloque-check"]').forEach(c => c.checked = master.checked);
    actualizarSeleccionBloques();
};

window.actualizarSeleccionBloques = function () {
    const sel = bloquesSeleccionados();
    const todos = sel.length === bloquesConocidos.length;
    document.getElementById('check-todos-bloques').checked = todos;
    document.getElementById('texto-bloques-seleccionados').textContent =
        sel.length === 0 ? 'Ningún bloque seleccionado' : todos ? 'Todos los Bloques' : sel.join(', ');
    renderizarProduccion();
};

window.cambiarTipoTemporal = function () {
    const tipo = val('filtro-tipo-temporal');
    document.getElementById('per-dia').classList.toggle('hidden', tipo !== 'dia');
    document.getElementById('per-semana').classList.toggle('hidden', tipo !== 'semana');
    document.getElementById('per-mes').classList.toggle('hidden', tipo !== 'mes');
    renderizarProduccion();
};

// ---------- Tabla bloque x variedad ----------
function htmlMatriz(lista) {
    if (!lista.length) return '';
    const celdas = {}, totB = {}, totV = {};
    let total = 0;
    lista.forEach(r => {
        const c = celdas[r.bloque + '||' + r.variedad] = celdas[r.bloque + '||' + r.variedad] || { t: 0 };
        c.t += r.tallos;
        totB[r.bloque] = (totB[r.bloque] || 0) + r.tallos;
        totV[r.variedad] = (totV[r.variedad] || 0) + r.tallos;
        total += r.tallos;
    });
    const bloques = Object.keys(totB).sort(natural);
    const variedades = Object.keys(totV).sort((a, b) => totV[b] - totV[a]);
    const th = 'p-2.5 text-right text-xs font-bold text-slate-600';

    const filas = bloques.map(b => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-2.5 font-bold text-slate-800">${esc(b)}</td>
            ${variedades.map(v => {
                const c = celdas[b + '||' + v];
                return `<td class="p-2.5 text-right">${c ? num(c.t) : '<span class="text-slate-300">–</span>'}</td>`;
            }).join('')}
            <td class="p-2.5 text-right font-extrabold text-emerald-800">${num(totB[b])}</td>
        </tr>`).join('');

    return `
        <table class="w-full text-sm border-collapse min-w-[480px]">
            <thead>
                <tr class="bg-slate-100 border-b">
                    <th class="p-2.5 text-left text-xs font-bold text-slate-600">Bloque</th>
                    ${variedades.map(v => `<th class="${th}">${esc(v)}</th>`).join('')}
                    <th class="${th}">Total</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
            <tfoot>
                <tr class="bg-slate-50 font-extrabold border-t-2">
                    <td class="p-2.5">Total</td>
                    ${variedades.map(v => `<td class="p-2.5 text-right">${num(totV[v])}</td>`).join('')}
                    <td class="p-2.5 text-right text-emerald-800">${num(total)}</td>
                </tr>
            </tfoot>
        </table>`;
}

// ---------- Producción del día ----------
window.irAHoy = function () { poner('fecha-dia', hoyLocal()); renderizarDia(); };

window.renderizarDia = function () {
    const fecha = val('fecha-dia');
    const lista = registros.filter(r => r.fecha === fecha);
    const total = suma(lista);
    const resumen = document.getElementById('dia-resumen');
    const detalle = document.getElementById('dia-detalle');

    if (!lista.length) {
        resumen.textContent = '';
        detalle.innerHTML = '<p class="text-sm text-slate-400 py-3">No hay entradas al cuarto frío registradas este día. Regístralas en <a href="index.html" class="font-bold text-emerald-700 underline">Inventario Principal</a>.</p>';
        return;
    }
    const nBloques = new Set(lista.map(r => r.bloque)).size;
    const nVariedades = new Set(lista.map(r => r.variedad)).size;
    resumen.innerHTML = `<span class="text-3xl font-black text-slate-900">${num(total)}</span> tallos en ${nBloques} bloque${nBloques > 1 ? 's' : ''} y ${nVariedades} variedad${nVariedades > 1 ? 'es' : ''}`;
    detalle.innerHTML = htmlMatriz(lista);
};

// ---------- Gráfica y detalle del periodo ----------
window.renderizarProduccion = function () {
    if (!document.getElementById('graficoProduccion')) return;
    const tipo = val('filtro-tipo-temporal');
    const dim = val('filtro-comparar') || 'bloque';
    const variedad = val('filtro-variedad');
    const bloques = bloquesSeleccionados();

    let fechas;
    if (tipo === 'dia') fechas = [val('input-dia')];
    else if (tipo === 'mes') fechas = fechasDeMes(val('input-mes') || hoyLocal().slice(0, 7));
    else fechas = fechasDeSemana(parseInt(val('input-semana')) || 1, parseInt(val('input-anio')) || new Date().getFullYear());

    const enPeriodo = new Set(fechas);
    const lista = registros.filter(r => enPeriodo.has(r.fecha) && bloques.includes(r.bloque) && (!variedad || r.variedad === variedad));

    document.getElementById('info-filtro-activo').textContent =
        `${variedad || 'Todas las variedades'}, ${bloques.length === bloquesConocidos.length ? 'todos los bloques' : bloques.length + ' bloque(s)'}`;
    document.getElementById('detalle-periodo').innerHTML = htmlMatriz(lista);

    if (grafico) grafico.destroy();
    grafico = null;
    document.getElementById('lienzo').classList.toggle('hidden', !lista.length);
    document.getElementById('sin-datos').classList.toggle('hidden', lista.length > 0);

    if (!lista.length) {
        document.getElementById('stats-periodo').textContent = '';
        return;
    }

    const total = suma(lista);
    const porDia = {};
    lista.forEach(r => porDia[r.fecha] = (porDia[r.fecha] || 0) + r.tallos);
    const dias = Object.keys(porDia);
    const mejor = dias.reduce((a, b) => porDia[a] >= porDia[b] ? a : b);
    document.getElementById('stats-periodo').innerHTML = tipo === 'dia'
        ? `Total: <b>${num(total)}</b> tallos`
        : `Total: <b>${num(total)}</b> tallos. Promedio: <b>${num(total / dias.length)}</b> por día con entradas. Mejor día: <b>${mejor}</b> con <b>${num(porDia[mejor])}</b>.`;

    const grupos = [...new Set(lista.map(r => r[dim]))].sort(natural);
    const color = (g, i) => dim === 'variedad' && /freedom/i.test(g) ? '#dc2626' : PALETA[i % PALETA.length];
    const canvas = document.getElementById('graficoProduccion');

    if (tipo === 'dia') {
        grafico = new Chart(canvas, {
            type: 'bar',
            data: { labels: grupos, datasets: [{ label: 'Tallos', data: grupos.map(g => Math.round(suma(lista.filter(r => r[dim] === g)))), backgroundColor: grupos.map(color) }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Tallos' } } } }
        });
        return;
    }

    const etiqueta = f => tipo === 'mes' ? String(Number(f.slice(8))) : new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    grafico = new Chart(canvas, {
        type: 'line',
        data: {
            labels: fechas.map(etiqueta),
            datasets: grupos.map((g, i) => ({
                label: g,
                data: fechas.map(f => Math.round(suma(lista.filter(r => r.fecha === f && r[dim] === g)))),
                borderColor: color(g, i), backgroundColor: color(g, i), borderWidth: 2, pointRadius: 4, tension: 0.2
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Tallos' } }, x: { title: { display: true, text: tipo === 'mes' ? 'Día del mes' : 'Día' } } }
        }
    });
};
