let registros = [];
let bloquesConocidos = [];
let variedadesConocidas = [];
let grafico = null;

const PALETA = ['#2c6d4d', '#a5864c', '#4a86a8', '#9b5d7e', '#8a9a3f', '#2f8f8a', '#c07a45', '#6b5b95'];
if (window.Chart) {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#61756b';
}
const TOOLTIP = { backgroundColor: '#fff', titleColor: '#16211b', bodyColor: '#3b4740', footerColor: '#16211b', borderColor: '#dbe3de', borderWidth: 1, padding: 10, cornerRadius: 8, usePointStyle: true, boxPadding: 4 };
const TRAZOS = [[], [7, 4], [2, 4], [9, 3, 2, 3]];
const ESTILO_TRAZO = ['solid', 'dashed', 'dotted', 'dashed'];

const pluginCruz = { id: 'cruz', afterDatasetsDraw(c) {
    const a = c.tooltip && c.tooltip.getActiveElements ? c.tooltip.getActiveElements() : [];
    if (!a.length) return;
    const g = c.ctx;
    g.save(); g.strokeStyle = '#c8d3cd'; g.lineWidth = 1; g.beginPath();
    g.moveTo(a[0].element.x, c.chartArea.top); g.lineTo(a[0].element.x, c.chartArea.bottom); g.stroke(); g.restore();
} };

const pluginValores = { id: 'valores', afterDatasetsDraw(c) {
    const g = c.ctx;
    g.save(); g.font = '500 12px ' + Chart.defaults.font.family; g.fillStyle = '#16211b'; g.textAlign = 'center';
    c.getDatasetMeta(0).data.forEach((b, i) => g.fillText(Math.round(c.data.datasets[0].data[i]).toLocaleString('es-CO'), b.x, b.y - 7));
    g.restore();
} };

function obtenerLeyenda() {
    let l = document.getElementById('leyenda-produccion');
    if (!l) {
        l = document.createElement('div');
        l.id = 'leyenda-produccion';
        l.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:4px';
        document.getElementById('lienzo').before(l);
    }
    return l;
}


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

// ---------- Grados: cuánto salió de Grado 50, Grado 40 y Nacional ----------
const GRADOS_ORDEN = ['Grado 50', 'Grado 40', 'Nacional'];
const COLOR_GRADO = { 'Grado 50': '#163827', 'Grado 40': '#2c6d4d', 'Nacional': '#a5864c' };
const colorGrado = g => COLOR_GRADO[g] || '#7fa88f';
const ordenGrado = (a, b) => { const i = GRADOS_ORDEN.indexOf(a), j = GRADOS_ORDEN.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || natural(a, b); };
let gradosConocidos = [], verPor = 'variedad', ultimaDia = [], ultimaPeriodo = [];

function htmlGrados(lista) {
    if (!lista.length) return '';
    const grados = [...new Set(lista.map(r => r.grado))].sort(ordenGrado);
    const filas = {}, porGrado = {};
    let total = 0;
    lista.forEach(r => {
        const f = filas[r[verPor]] = filas[r[verPor]] || { total: 0, g: {} };
        f.g[r.grado] = (f.g[r.grado] || 0) + r.tallos; f.total += r.tallos;
        porGrado[r.grado] = (porGrado[r.grado] || 0) + r.tallos; total += r.tallos;
    });
    const claves = Object.keys(filas).sort(verPor === 'bloque' ? natural : (a, b) => filas[b].total - filas[a].total);
    const pct = (v, t) => (t > 0 ? Math.round(v / t * 100) : 0);
    const cuadro = g => `<i style="width:10px;height:10px;border-radius:2px;background:${colorGrado(g)};display:inline-block"></i>`;
    const chips = grados.map(g => `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 14px 2px 0;font-size:13px">${cuadro(g)}${esc(g)} <b>${num(porGrado[g])}</b> <span style="color:#61756b">(${pct(porGrado[g], total)}%)</span></span>`).join('');
    const barra = `<div style="display:flex;height:10px;border-radius:5px;overflow:hidden;gap:2px;background:#eef3ef;margin:10px 0 12px">${grados.map(g => `<div title="${esc(g)}: ${num(porGrado[g])} tallos" style="width:${porGrado[g] / total * 100}%;background:${colorGrado(g)}"></div>`).join('')}</div>`;
    const th = 'padding:10px;text-align:right;font-size:12px;font-weight:700;color:#4b5a52;white-space:nowrap';
    const celda = (v, t) => (v ? `${num(v)} <span style="color:#61756b;font-size:12px">(${pct(v, t)}%)</span>` : '<span style="color:#c8d3cd">–</span>');
    const tabla = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:420px">
        <thead><tr style="background:#f3f7f4"><th style="padding:10px;text-align:left;font-size:12px;font-weight:700;color:#4b5a52">${verPor === 'bloque' ? 'Bloque' : 'Variedad'}</th>${grados.map(g => `<th style="${th}">${cuadro(g)} ${esc(g)}</th>`).join('')}<th style="${th}">Total</th></tr></thead>
        <tbody>${claves.map(k => `<tr style="border-top:1px solid #eef3ef"><td style="padding:10px;font-weight:700">${esc(k)}</td>${grados.map(g => `<td style="padding:10px;text-align:right">${celda(filas[k].g[g], filas[k].total)}</td>`).join('')}<td style="padding:10px;text-align:right;font-weight:800;color:#163827">${num(filas[k].total)}</td></tr>`).join('')}</tbody>
        <tfoot><tr style="border-top:2px solid #163827;background:#f3f7f4;font-weight:800"><td style="padding:10px">Total</td>${grados.map(g => `<td style="padding:10px;text-align:right">${celda(porGrado[g], total)}</td>`).join('')}<td style="padding:10px;text-align:right;color:#163827">${num(total)}</td></tr></tfoot></table></div>`;
    const tog = ['variedad', 'bloque'].map(v => `<button type="button" data-ver="${v}" class="pg-b${verPor === v ? ' act' : ''}">Por ${v}</button>`).join('');
    return `<div style="margin-top:22px"><div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px"><h4 style="font-size:14px;font-weight:700;margin:0">Distribución por grado <span style="font-weight:400;font-size:12px;color:#61756b">(porcentaje dentro de cada fila)</span></h4><div class="pg-tog">${tog}</div></div>
        <div style="margin-top:8px">${chips}</div>${barra}${tabla}</div>`;
}

function pintarGrados() {
    const d = document.getElementById('dia-grados'), p = document.getElementById('periodo-grados');
    if (d) d.innerHTML = htmlGrados(ultimaDia);
    if (p) p.innerHTML = htmlGrados(ultimaPeriodo);
}

(function () {
    const st = document.createElement('style');
    st.textContent = `.pg-tog{display:inline-flex;border:1px solid #e3e9e5;border-radius:10px;overflow:hidden}
        .pg-b{border:none;background:#fff;color:#61756b;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer}
        .pg-b.act{background:#163827;color:#fff}`;
    document.head.appendChild(st);
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-ver]');
        if (b) { verPor = b.dataset.ver; pintarGrados(); }
    });
})();

// ---------- Carga de datos ----------
// La producción sale de las entradas al cuarto frío (Inventario Principal)
function normalizarEntradas(entradas) {
    return entradas.map(e => ({
        fecha: e.fecha || e.fechaIngreso,
        bloque: e.bloque || 'Sin bloque',
        variedad: e.variedad || 'Sin variedad',
        grado: e.grado || 'Sin grado',
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

    gradosConocidos = [...new Set([...(listas.grados || []), ...registros.map(r => r.grado)])].sort(ordenGrado);
    document.getElementById('filtro-grado-prod').innerHTML = '<option value="">Todos los grados</option>' +
        gradosConocidos.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');

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
        ultimaDia = [];
        pintarGrados();
        detalle.innerHTML = '<p class="text-sm text-slate-400 py-3">No hay entradas al cuarto frío registradas este día. Regístralas en <a href="index.html" class="font-bold text-emerald-700 underline">Inventario Principal</a>.</p>';
        return;
    }
    const nBloques = new Set(lista.map(r => r.bloque)).size;
    const nVariedades = new Set(lista.map(r => r.variedad)).size;
    resumen.innerHTML = `<span class="text-3xl font-black text-slate-900">${num(total)}</span> tallos en ${nBloques} bloque${nBloques > 1 ? 's' : ''} y ${nVariedades} variedad${nVariedades > 1 ? 'es' : ''}`;
    detalle.innerHTML = htmlMatriz(lista);
    ultimaDia = lista;
    pintarGrados();
};

// ---------- Gráfica y detalle del periodo ----------
window.renderizarProduccion = function () {
    if (!document.getElementById('graficoProduccion')) return;
    const tipo = val('filtro-tipo-temporal');
    const dim = val('filtro-comparar') || 'bloque';
    const variedad = val('filtro-variedad');
    const grado = val('filtro-grado-prod');
    const bloques = bloquesSeleccionados();

    let fechas;
    if (tipo === 'dia') fechas = [val('input-dia')];
    else if (tipo === 'mes') fechas = fechasDeMes(val('input-mes') || hoyLocal().slice(0, 7));
    else fechas = fechasDeSemana(parseInt(val('input-semana')) || 1, parseInt(val('input-anio')) || new Date().getFullYear());

    const enPeriodo = new Set(fechas);
    const lista = registros.filter(r => enPeriodo.has(r.fecha) && bloques.includes(r.bloque) && (!variedad || r.variedad === variedad) && (!grado || r.grado === grado));

    document.getElementById('info-filtro-activo').textContent =
        `${variedad || 'Todas las variedades'}, ${grado || 'todos los grados'}, ${bloques.length === bloquesConocidos.length ? 'todos los bloques' : bloques.length + ' bloque(s)'}`;
    document.getElementById('detalle-periodo').innerHTML = htmlMatriz(lista);
    ultimaPeriodo = lista;
    pintarGrados();

    if (grafico) grafico.destroy();
    grafico = null;
    document.getElementById('lienzo').classList.toggle('hidden', !lista.length);
    document.getElementById('sin-datos').classList.toggle('hidden', lista.length > 0);

    if (!lista.length) {
        document.getElementById('stats-periodo').textContent = '';
        obtenerLeyenda().innerHTML = '';
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

    const grupos = [...new Set(lista.map(r => r[dim]))].sort(dim === 'grado' ? ordenGrado : natural);
    const conocidos = dim === 'bloque' ? bloquesConocidos : dim === 'grado' ? gradosConocidos : variedadesConocidas;
    // El color sigue a cada bloque o variedad, no a su posición: al filtrar no cambia
    const color = g => dim === 'grado' ? colorGrado(g) : dim === 'variedad' && /freedom/i.test(g) ? '#b4233b' : PALETA[Math.max(0, conocidos.indexOf(g)) % PALETA.length];
    const canvas = document.getElementById('graficoProduccion');
    const leyenda = obtenerLeyenda();
    leyenda.innerHTML = '';

    if (tipo === 'dia') {
        const datos = grupos.map(g => Math.round(suma(lista.filter(r => r[dim] === g))));
        grafico = new Chart(canvas, {
            type: 'bar',
            data: { labels: grupos, datasets: [{ data: datos, backgroundColor: grupos.map(color), borderRadius: 6, borderSkipped: 'bottom', maxBarThickness: 44 }] },
            options: {
                responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18 } },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { grid: { display: false }, border: { color: '#c8d3cd' } }, y: { display: false, beginAtZero: true, max: Math.max(...datos) * 1.12 } }
            },
            plugins: [pluginValores]
        });
        return;
    }

    const etiqueta = f => tipo === 'mes' ? String(Number(f.slice(8))) : new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    const ultimo = fechas.length - 1;
    grafico = new Chart(canvas, {
        type: 'line',
        data: {
            labels: fechas.map(etiqueta),
            datasets: grupos.map((g, i) => ({
                label: g,
                data: fechas.map(f => Math.round(suma(lista.filter(r => r.fecha === f && r[dim] === g)))),
                borderColor: color(g), backgroundColor: color(g) + '1a', fill: true, tension: 0.35, borderWidth: 2.5, borderDash: TRAZOS[i % 4],
                pointRadius: ctx => ctx.dataIndex === ultimo ? 5 : 0, pointHoverRadius: 6,
                pointBackgroundColor: color(g), pointBorderColor: '#fff', pointBorderWidth: 2
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: { ...TOOLTIP, callbacks: {
                    label: c => ' ' + c.dataset.label + ': ' + c.parsed.y.toLocaleString('es-CO'),
                    footer: it => 'Total: ' + it.reduce((s, x) => s + x.parsed.y, 0).toLocaleString('es-CO')
                } }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, border: { display: false }, grid: { color: '#e8eeea', drawTicks: false }, ticks: { padding: 8, callback: v => v.toLocaleString('es-CO') } }
            }
        },
        plugins: [pluginCruz]
    });

    // Leyenda: tocar un nombre oculta o muestra su línea
    grupos.forEach((g, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'display:flex;align-items:center;gap:7px;border:none;background:none;padding:2px 4px;font-size:12px;color:#3b4740;cursor:pointer';
        chip.innerHTML = `<span style="width:18px;border-top:2.5px ${ESTILO_TRAZO[i % 4]} ${color(g)}"></span>${g}`;
        chip.onclick = () => {
            grafico.setDatasetVisibility(i, !grafico.isDatasetVisible(i));
            grafico.update();
            chip.style.opacity = grafico.isDatasetVisible(i) ? 1 : 0.35;
        };
        leyenda.appendChild(chip);
    });
};
