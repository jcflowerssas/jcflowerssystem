let clientes = [], remisiones = [], entradas = [], salidas = [];
let modoLocal = false;
let clienteEditando = null, remisionEditando = null, remisionVista = null;
let stock = {};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Math.round(Number(n) || 0).toLocaleString('es-CO');
const natural = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
const sinAcentos = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fmtFecha = f => String(f || '').split('-').reverse().join('/');
const fmtFechaCorta = f => { const [y, m, d] = String(f || '').split('-'); return y ? `${d}/${m}/${y.slice(2)}` : ''; };
const mismoId = (a, b) => String(a) === String(b);
const unicos = l => Array.from(new Map(l.map(i => [String(i.id), i])).values());

function hoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Almacenamiento: servidor y copia en este navegador ----------
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const local = nombre => JSON.parse(localStorage.getItem('app_' + nombre) || '[]');
const guardarLocal = (nombre, lista) => localStorage.setItem('app_' + nombre, JSON.stringify(lista));

async function enviar(url, opciones) {
    try { return (await fetch(url, opciones)).ok; } catch (e) { return false; }
}

async function leer(nombre, espejo) {
    try {
        const res = await fetch('/api/' + nombre);
        if (res.ok) {
            const datos = await res.json();
            if (Array.isArray(datos)) { if (espejo) guardarLocal(nombre, datos); return datos; }
        }
    } catch (e) { /* se usa la copia local */ }
    if (espejo) modoLocal = true;
    return local(nombre);
}

async function guardarReg(nombre, reg) {
    const lista = local(nombre).filter(r => !mismoId(r.id, reg.id));
    lista.unshift(reg);
    guardarLocal(nombre, lista);
    return enviar('/api/' + nombre, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(reg) });
}

async function borrarReg(nombre, id) {
    guardarLocal(nombre, local(nombre).filter(r => !mismoId(r.id, id)));
    return enviar(`/api/${nombre}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function cargarTodo() {
    modoLocal = false;
    clientes = unicos(await leer('clientes', true));
    remisiones = unicos(await leer('remisiones', true));
    entradas = unicos(await leer('entradas'));
    salidas = unicos(await leer('salidas'));
    $('aviso-local').classList.toggle('hidden', !modoLocal);
    renderClientes();
    renderRemisiones();
}

document.addEventListener('DOMContentLoaded', () => {
    cargarTodo();
    const cont = $('rm-lineas');
    cont.addEventListener('change', ev => {
        const fila = ev.target.closest('.rm-linea');
        if (!fila) return;
        if (ev.target.classList.contains('r-estiba')) fila.querySelector('.r-producto').innerHTML = opcionesProductos(ev.target.value, '');
        if (ev.target.classList.contains('r-producto')) {
            const l = (stock[fila.querySelector('.r-estiba').value] || {})[ev.target.value];
            if (l) fila.querySelector('.r-tpt').value = String(tptDe(l));
        }
        actualizarTotalRemision();
    });
    cont.addEventListener('input', actualizarTotalRemision);
    $('rm-cliente').addEventListener('change', actualizarTotalRemision);
    $('rm-fecha').addEventListener('change', actualizarTotalRemision);
});

// ---------- Progreso de cada cliente ----------
function tallosCliente(c, excluirId, desde, hasta) {
    return remisiones
        .filter(r => mismoId(r.clienteId, c.id) && !(excluirId != null && mismoId(r.id, excluirId)) && (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta))
        .reduce((s, r) => s + (Number(r.totalTallos) || 0), 0);
}

const entregadoCliente = (c, excluirId) => tallosCliente(c, excluirId, c.fechaInicio, c.fechaFin);

function estadoCliente(c) {
    const meta = Number(c.metaTallos) || 0;
    const ent = entregadoCliente(c);
    const hoy = hoyLocal();
    const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
    const total = Math.max(1, dias(c.fechaInicio, c.fechaFin) + 1);
    const transcurridos = Math.min(total, Math.max(0, dias(c.fechaInicio, hoy) + 1));
    const esperadoPct = Math.round((transcurridos / total) * 100);
    const restantes = Math.max(0, dias(hoy, c.fechaFin));
    const pct = meta > 0 ? Math.min(100, Math.round((ent / meta) * 100)) : 0;
    let etiqueta, chip, barra;
    if (ent >= meta) { etiqueta = 'Completado'; chip = 'bg-emerald-100 text-emerald-800'; barra = 'bg-emerald-500'; }
    else if (hoy > c.fechaFin) { etiqueta = 'Periodo vencido'; chip = 'bg-rose-100 text-rose-800'; barra = 'bg-rose-500'; }
    else if (hoy < c.fechaInicio) { etiqueta = 'Aún no inicia'; chip = 'bg-slate-100 text-slate-600'; barra = 'bg-slate-400'; }
    else if (pct >= esperadoPct) { etiqueta = 'Al día'; chip = 'bg-emerald-100 text-emerald-800'; barra = 'bg-emerald-500'; }
    else { etiqueta = 'Atrasado'; chip = 'bg-amber-100 text-amber-800'; barra = 'bg-amber-500'; }
    return { meta, ent, pct, esperadoPct, restantes, faltan: Math.max(0, meta - ent), etiqueta, chip, barra, enPeriodo: hoy >= c.fechaInicio && hoy <= c.fechaFin };
}

// Cliente que compra todo el año: sin meta ni barra, solo lo entregado
function tarjetaSinLimite(c) {
    const hoy = hoyLocal();
    const mes = hoy.slice(0, 7), anio = hoy.slice(0, 4);
    const delMes = tallosCliente(c, null, mes + '-01', mes + '-31');
    const delAnio = tallosCliente(c, null, anio + '-01-01', anio + '-12-31');
    const ultima = remisiones.filter(r => mismoId(r.clienteId, c.id)).map(r => r.fecha).sort().pop();
    return `
        <article class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="font-extrabold text-slate-800 text-lg leading-tight truncate">${esc(c.nombre)}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Compra todo el año</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-sky-100 text-sky-800">Sin límite</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div><p class="text-3xl font-black text-slate-900">${num(delMes)}</p><p class="text-xs text-slate-500">tallos este mes</p></div>
                <div><p class="text-3xl font-black text-slate-900">${num(delAnio)}</p><p class="text-xs text-slate-500">tallos este año</p></div>
            </div>
            <p class="text-sm text-slate-600">${ultima ? `Última remisión: ${fmtFecha(ultima)}` : 'Aún no tiene remisiones.'}</p>
            <div class="flex gap-2 pt-1">
                <button type="button" onclick="abrirModalRemision('${esc(c.id)}')" class="flex-1 px-3 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg text-sm">Despachar</button>
                <button type="button" onclick="abrirModalCliente('${esc(c.id)}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm">Editar</button>
            </div>
        </article>`;
}

function renderClientes() {
    const grid = $('grid-clientes');
    const lista = [...clientes].sort((a, b) => natural(a.nombre, b.nombre));

    const opts = '<option value="">Todos los clientes</option>' + lista.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
    const filtro = $('filtro-remision-cliente');
    const previo = filtro.value;
    filtro.innerHTML = opts;
    filtro.value = previo;

    if (!lista.length) {
        grid.innerHTML = '<div class="col-span-full p-6 bg-white rounded-2xl border text-center text-slate-400">Aún no hay clientes. Crea el primero con "+ Nuevo cliente".</div>';
        return;
    }
    grid.innerHTML = lista.map(c => {
        if (c.sinLimite) return tarjetaSinLimite(c);
        const e = estadoCliente(c);
        const detalle = e.etiqueta === 'Completado' ? 'Meta cumplida.'
            : `Faltan <b>${num(e.faltan)}</b> tallos${e.enPeriodo ? `, ${e.restantes} día${e.restantes === 1 ? '' : 's'} restante${e.restantes === 1 ? '' : 's'}` : ''}.`;
        const ritmo = e.enPeriodo && e.faltan > 0 && e.restantes > 0 ? `<p class="text-xs text-slate-500">Ritmo necesario: ${num(e.faltan / e.restantes)} tallos por día.</p>` : '';
        return `
        <article class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="font-extrabold text-slate-800 text-lg leading-tight truncate">${esc(c.nombre)}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">${fmtFecha(c.fechaInicio)} al ${fmtFecha(c.fechaFin)}</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${e.chip}">${e.etiqueta}</span>
            </div>
            <div class="flex items-baseline gap-2">
                <span class="text-3xl font-black text-slate-900">${num(e.ent)}</span>
                <span class="text-sm text-slate-500">de ${num(e.meta)} tallos</span>
                <span class="ml-auto text-sm font-bold text-slate-700">${e.pct}%</span>
            </div>
            <div class="relative h-3 rounded-full bg-slate-200 overflow-hidden" title="La marca indica el avance esperado a hoy">
                <div class="h-full ${e.barra}" style="width:${e.pct}%"></div>
                ${e.enPeriodo ? `<div class="absolute top-0 bottom-0 w-0.5 bg-slate-700/70" style="left:${e.esperadoPct}%"></div>` : ''}
            </div>
            <div class="text-sm text-slate-600">${detalle}${ritmo}</div>
            <div class="flex gap-2 pt-1">
                <button type="button" onclick="abrirModalRemision('${esc(c.id)}')" class="flex-1 px-3 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg text-sm">Despachar</button>
                <button type="button" onclick="abrirModalCliente('${esc(c.id)}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm">Editar</button>
            </div>
        </article>`;
    }).join('');
}

// ---------- Clientes ----------
window.abrirModalCliente = function (id) {
    clienteEditando = id ? clientes.find(c => mismoId(c.id, id)) : null;
    const c = clienteEditando || {};
    $('titulo-cliente').textContent = c.id ? 'Editar cliente' : 'Nuevo cliente';
    $('cl-nombre').value = c.nombre || '';
    $('cl-documento').value = c.documento || '';
    $('cl-telefono').value = c.telefono || '';
    $('cl-direccion').value = c.direccion || '';
    $('cl-inicio').value = c.fechaInicio || hoyLocal();
    $('cl-fin').value = c.fechaFin || '';
    $('cl-meta').value = c.metaTallos || '';
    $('btn-eliminar-cliente').classList.toggle('hidden', !c.id);
    $('cl-tipo').value = c.sinLimite ? 'continuo' : 'periodo';
    actualizarTipoCliente();
    $('modal-cliente').classList.remove('hidden');
};

// Sin límite: se ocultan periodo y meta (y dejan de ser obligatorios)
window.actualizarTipoCliente = function () {
    const continuo = $('cl-tipo').value === 'continuo';
    $('cl-periodo-campos').classList.toggle('hidden', continuo);
    ['cl-inicio', 'cl-fin', 'cl-meta'].forEach(id => { $(id).required = !continuo; });
};

window.guardarCliente = async function (event) {
    event.preventDefault();
    const c = {
        id: clienteEditando ? clienteEditando.id : String(Date.now()),
        nombre: $('cl-nombre').value.trim(),
        documento: $('cl-documento').value.trim(),
        telefono: $('cl-telefono').value.trim(),
        direccion: $('cl-direccion').value.trim(),
        sinLimite: $('cl-tipo').value === 'continuo',
        fechaInicio: $('cl-inicio').value,
        fechaFin: $('cl-fin').value,
        metaTallos: parseInt($('cl-meta').value) || 0
    };
    if (c.sinLimite) { c.fechaInicio = ''; c.fechaFin = ''; c.metaTallos = 0; }
    if (!c.nombre) { alert('Escribe el nombre del cliente.'); return; }
    if (!c.sinLimite && c.metaTallos <= 0) { alert('Escribe una cantidad de tallos mayor que cero.'); return; }
    if (!c.sinLimite && c.fechaFin < c.fechaInicio) { alert('La fecha final no puede ser anterior a la inicial.'); return; }
    if (clienteEditando) await borrarReg('clientes', c.id);
    await guardarReg('clientes', c);
    cerrarModal('modal-cliente');
    await cargarTodo();
};

window.eliminarCliente = async function () {
    if (!clienteEditando) return;
    if (!confirm(`¿Eliminar al cliente "${clienteEditando.nombre}"? Sus remisiones ya generadas se conservan.`)) return;
    await borrarReg('clientes', clienteEditando.id);
    cerrarModal('modal-cliente');
    await cargarTodo();
};

// ---------- Inventario disponible por estiba ----------
function cantidades(i) {
    const tabacos = Math.abs(Number(i.tabacos) || 0);
    return { tabacos, tallos: Math.abs(Number(i.totalTallos) || (tabacos * Number(i.tallosPorTabaco || 40)) || 0) };
}

function calcularStock(ents, sals) {
    const est = {};
    const linea = (u, v, g) => {
        est[u] = est[u] || {};
        const k = v + '|' + g;
        est[u][k] = est[u][k] || { variedad: v, grado: g, tabacos: 0, tallos: 0, bloques: new Set() };
        return est[u][k];
    };
    ents.forEach(e => {
        const l = linea(e.ubicacion || 'Sin ubicación', e.variedad || 'General', e.grado || 'Sin grado');
        const c = cantidades(e);
        l.tabacos += c.tabacos; l.tallos += c.tallos;
        if (e.bloque) l.bloques.add(e.bloque);
    });
    sals.forEach(s => {
        const u = est[s.ubicacion || 'Sin ubicación'];
        if (!u) return;
        const l = u[(s.variedad || 'General') + '|' + (s.grado || 'Sin grado')] || Object.values(u).find(x => x.variedad === s.variedad && x.tallos > 0);
        if (!l) return;
        const c = cantidades(s);
        l.tabacos = Math.max(0, l.tabacos - c.tabacos);
        l.tallos = Math.max(0, l.tallos - c.tallos);
    });
    return est;
}

const tptDe = l => {
    const p = l.tabacos > 0 ? Math.round(l.tallos / l.tabacos) : 40;
    return [25, 40, 50].includes(p) ? p : 40;
};

function opcionesEstibas(sel) {
    const nombres = Object.keys(stock).filter(u => Object.values(stock[u]).some(l => l.tallos > 0)).sort(natural);
    return '<option value="">-- Estiba --</option>' + nombres.map(u => `<option value="${esc(u)}"${u === sel ? ' selected' : ''}>${esc(u)}</option>`).join('');
}

function opcionesProductos(estiba, sel) {
    const lineas = Object.entries(stock[estiba] || {}).filter(([, l]) => l.tallos > 0);
    return '<option value="">-- Producto --</option>' + lineas.map(([k, l]) =>
        `<option value="${esc(k)}"${k === sel ? ' selected' : ''}>${esc(l.variedad)}, ${esc(l.grado)} (${num(l.tabacos)} tabacos)</option>`).join('');
}

// ---------- Despacho / remisión ----------
window.agregarLineaRemision = function (d = {}) {
    const ultimo = $('rm-lineas').lastElementChild;
    d = { ...d, estiba: d.estiba || (ultimo ? ultimo.querySelector('.r-estiba').value : '') };   // copia la estiba del renglón anterior
    const campo = 'w-full border rounded-lg px-2 py-2 text-sm bg-white';
    const etiqueta = 'block text-[10px] font-bold text-slate-500 mb-0.5';
    const div = document.createElement('div');
    div.className = 'rm-linea grid grid-cols-2 md:grid-cols-[1.3fr_2fr_.8fr_.8fr_auto] gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2';
    div.innerHTML = `
        <div class="col-span-2 md:col-span-1"><label class="${etiqueta}">Estiba</label><select class="r-estiba ${campo} font-bold">${opcionesEstibas(d.estiba)}</select></div>
        <div class="col-span-2 md:col-span-1"><label class="${etiqueta}">Producto disponible</label><select class="r-producto ${campo}">${opcionesProductos(d.estiba, d.clave)}</select></div>
        <div><label class="${etiqueta}">Tabacos</label><input type="number" min="1" inputmode="numeric" placeholder="0" value="${d.tabacos || ''}" class="r-tabacos ${campo} font-bold"></div>
        <div><label class="${etiqueta}">Tallos/tabaco</label><select class="r-tpt ${campo}">${[40, 25, 50].map(t => `<option value="${t}"${t === Number(d.tpt) ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <button type="button" onclick="quitarLineaRemision(this)" title="Quitar" class="px-2 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold">✕</button>`;
    $('rm-lineas').appendChild(div);
    actualizarTotalRemision();
};

window.quitarLineaRemision = function (btn) {
    const cont = $('rm-lineas');
    if (cont.children.length > 1) btn.closest('.rm-linea').remove();
    else btn.closest('.rm-linea').querySelectorAll('input').forEach(i => i.value = '');
    actualizarTotalRemision();
};

function leerLineasRemision() {
    return [...document.querySelectorAll('#rm-lineas .rm-linea')].map(f => {
        const estiba = f.querySelector('.r-estiba').value;
        const clave = f.querySelector('.r-producto').value;
        return {
            estiba, clave,
            linea: (stock[estiba] || {})[clave],
            tabacos: parseInt(f.querySelector('.r-tabacos').value) || 0,
            tpt: parseInt(f.querySelector('.r-tpt').value) || 40,
            fila: f
        };
    });
}

function actualizarTotalRemision() {
    const ls = leerLineasRemision().filter(l => l.linea && l.tabacos > 0);
    const tabacos = ls.reduce((s, l) => s + l.tabacos, 0);
    const tallos = ls.reduce((s, l) => s + l.tabacos * l.tpt, 0);
    $('rm-total').innerHTML = `<b>${ls.length}</b> producto${ls.length === 1 ? '' : 's'}, <b>${num(tabacos)}</b> tabacos, <b>${num(tallos)}</b> tallos`;

    const c = clientes.find(x => mismoId(x.id, $('rm-cliente').value));
    const fecha = $('rm-fecha').value;
    if (!c) { $('rm-progreso').textContent = ''; return; }
    if (c.sinLimite) {
        const mes = fecha.slice(0, 7);
        const delMes = tallosCliente(c, remisionEditando && remisionEditando.id, mes + '-01', mes + '-31') + tallos;
        $('rm-progreso').textContent = `${c.nombre} no tiene límite. Con este despacho llevaría ${num(delMes)} tallos en el mes.`;
        return;
    }
    if (fecha < c.fechaInicio || fecha > c.fechaFin) {
        $('rm-progreso').textContent = 'Esta fecha está fuera del periodo del cliente: no sumará a su avance.';
        return;
    }
    const despues = entregadoCliente(c, remisionEditando && remisionEditando.id) + tallos;
    $('rm-progreso').textContent = `Con este despacho ${c.nombre} llevaría ${num(despues)} de ${num(c.metaTallos)} tallos (${Math.min(100, Math.round(despues / c.metaTallos * 100))}%).`;
}

window.abrirModalRemision = async function (clienteId, remisionId) {
    entradas = unicos(await leer('entradas'));
    salidas = unicos(await leer('salidas'));
    remisionEditando = remisionId ? remisiones.find(r => mismoId(r.id, remisionId)) : null;
    const r = remisionEditando;
    // Al editar, lo que ya salió en esta remisión vuelve a estar disponible
    stock = calcularStock(entradas, salidas.filter(s => !r || !mismoId(s.remisionId, r.id)));

    $('rm-cliente').innerHTML = [...clientes].sort((a, b) => natural(a.nombre, b.nombre))
        .map(c => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
    $('rm-cliente').value = r ? r.clienteId : clienteId;
    $('rm-fecha').value = r ? r.fecha : hoyLocal();
    $('rm-recibe').value = r ? r.recibe : '';
    $('rm-doc').value = r ? r.documentoRecibe || '' : '';
    $('rm-pedido').value = r ? r.pedido || '' : '';
    $('rm-despachado').value = r ? r.despachadoPor || '' : localStorage.getItem('remision_despachado') || '';
    $('rm-transporta').value = r ? r.transportadoPor || '' : '';
    $('rm-detalle').value = r ? r.detalle || 'tipo' : 'tipo';
    $('rm-numero').value = r ? r.numero : siguienteNumero();
    $('rm-obs').value = r ? r.observaciones || '' : '';
    $('rm-motivo').value = '';
    $('rm-inconformidad').value = r ? r.inconformidad || '' : '';
    $('rm-edicion').classList.toggle('hidden', !r);
    $('titulo-remision').textContent = r ? `Editar remisión No. ${r.numero}` : 'Nuevo despacho';

    $('rm-lineas').innerHTML = '';
    if (r) r.lineas.forEach(l => agregarLineaRemision({ estiba: l.ubicacion, clave: l.variedad + '|' + l.grado, tabacos: l.tabacos, tpt: l.tallosPorTabaco }));
    else agregarLineaRemision();
    $('modal-remision').classList.remove('hidden');
};

function siguienteNumero() {
    const max = remisiones.reduce((m, r) => Math.max(m, parseInt(String(r.numero).replace(/\D/g, '')) || 0), 0);
    return String(max + 1);
}

window.guardarRemision = async function (event) {
    event.preventDefault();
    const cliente = clientes.find(c => mismoId(c.id, $('rm-cliente').value));
    if (!cliente) { alert('Selecciona el cliente.'); return; }
    const editando = remisionEditando;
    const motivo = $('rm-motivo').value.trim();
    if (editando && !motivo) { alert('Escribe el motivo de la modificación.'); $('rm-motivo').focus(); return; }

    const ls = leerLineasRemision().filter(l => l.estiba || l.clave || l.tabacos);
    if (!ls.length) { alert('Agrega al menos un producto a despachar.'); return; }
    for (const l of ls) {
        if (!l.linea || l.tabacos <= 0) { alert('Completa estiba, producto y cantidad en cada línea (o quita la que no uses).'); l.fila.scrollIntoView({ block: 'center' }); return; }
    }
    // Verifica que lo pedido no supere lo disponible (sumando líneas repetidas)
    const usado = new Map();
    for (const l of ls) {
        const k = l.estiba + '||' + l.clave;
        const u = usado.get(k) || { tabacos: 0, tallos: 0, l };
        u.tabacos += l.tabacos; u.tallos += l.tabacos * l.tpt;
        usado.set(k, u);
    }
    for (const u of usado.values()) {
        if (u.tabacos > u.l.linea.tabacos || u.tallos > u.l.linea.tallos) {
            alert(`No hay suficiente ${u.l.linea.variedad} (${u.l.linea.grado}) en ${u.l.estiba}. Disponible: ${num(u.l.linea.tabacos)} tabacos, ${num(u.l.linea.tallos)} tallos.`);
            return;
        }
    }

    const boton = $('btn-guardar-remision');
    boton.disabled = true;
    const base = Date.now();
    const id = editando ? editando.id : String(base);
    const numero = $('rm-numero').value.trim();
    if (!numero) { alert('Escribe el número de la remisión.'); boton.disabled = false; return; }
    if (remisiones.some(x => String(x.numero) === numero && !(editando && mismoId(x.id, editando.id)))) {
        alert(`Ya existe la remisión No. ${numero}. Usa otro número.`);
        boton.disabled = false;
        return;
    }
    const fecha = $('rm-fecha').value;
    const inconformidad = $('rm-inconformidad').value.trim();

    const lineas = ls.map(l => ({
        ubicacion: l.estiba, variedad: l.linea.variedad, grado: l.linea.grado,
        bloque: [...l.linea.bloques].join(', ') || 'General',
        tabacos: l.tabacos, tallosPorTabaco: l.tpt, totalTallos: l.tabacos * l.tpt
    }));
    const remision = {
        id, numero, fecha,
        clienteId: cliente.id,
        cliente: { nombre: cliente.nombre, documento: cliente.documento || '', direccion: cliente.direccion || '', telefono: cliente.telefono || '' },
        recibe: $('rm-recibe').value.trim(),
        documentoRecibe: $('rm-doc').value.trim(),
        pedido: $('rm-pedido').value.trim(),
        despachadoPor: $('rm-despachado').value.trim(),
        transportadoPor: $('rm-transporta').value.trim(),
        detalle: $('rm-detalle').value,
        observaciones: $('rm-obs').value.trim(),
        lineas,
        totalTabacos: lineas.reduce((s, l) => s + l.tabacos, 0),
        totalTallos: lineas.reduce((s, l) => s + l.totalTallos, 0),
        estado: inconformidad ? 'Con inconformidad' : 'Despachada',
        inconformidad,
        historial: [...(editando ? editando.historial || [] : []), ...(editando ? [{ fecha: new Date().toISOString(), motivo }] : [])]
    };

    // Las salidas de inventario de esta remisión se rehacen para que el inventario quede correcto
    let fallos = 0;
    if (editando) {
        for (const s of salidas.filter(x => mismoId(x.remisionId, id))) if (!await borrarReg('salidas', s.id)) fallos++;
        if (!await borrarReg('remisiones', id)) fallos++;
    }
    for (const [i, l] of lineas.entries()) {
        const salida = {
            id: `${base}${i}`, fecha, ubicacion: l.ubicacion, bloque: l.bloque, variedad: l.variedad,
            tipo: l.variedad.toLowerCase().includes('freedom') ? 'Rojo' : 'Color',
            grado: l.grado, tabacos: l.tabacos, tallosPorTabaco: l.tallosPorTabaco, totalTallos: l.totalTallos,
            cliente: cliente.nombre, remisionId: id, remision: numero
        };
        if (!await guardarReg('salidas', salida)) fallos++;
    }
    if (!await guardarReg('remisiones', remision)) fallos++;

    localStorage.setItem('remision_despachado', remision.despachadoPor);
    boton.disabled = false;
    cerrarModal('modal-remision');
    await cargarTodo();
    verRemision(id);
    if (fallos) alert(`${fallos} registro(s) no llegaron al servidor y quedaron guardados solo en este navegador. Revisa la conexión.`);
};

// ---------- Tabla de remisiones ----------
function renderRemisiones() {
    const tbody = $('tabla-remisiones-body');
    const cli = $('filtro-remision-cliente').value;
    const q = sinAcentos($('buscar-remision').value);
    const lista = remisiones
        .filter(r => (!cli || mismoId(r.clienteId, cli)) && (!q || sinAcentos([r.numero, r.cliente && r.cliente.nombre, r.recibe].join(' ')).includes(q)))
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.numero).localeCompare(String(a.numero), 'es', { numeric: true }));

    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay remisiones.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(r => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold text-sky-800">${esc(r.numero)}</td>
            <td class="p-3 text-xs font-semibold">${fmtFecha(r.fecha)}</td>
            <td class="p-3 font-medium">${esc(r.cliente && r.cliente.nombre)}</td>
            <td class="p-3 text-right">${num(r.totalTabacos)}</td>
            <td class="p-3 text-right font-bold">${num(r.totalTallos)}</td>
            <td class="p-3">${esc(r.recibe)}</td>
            <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold ${r.inconformidad ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}">${r.inconformidad ? 'Con inconformidad' : 'Despachada'}</span>
                ${(r.historial || []).length ? '<span class="ml-1 text-xs text-slate-400">Editada</span>' : ''}
            </td>
            <td class="p-3 text-center whitespace-nowrap">
                <button type="button" onclick="verRemision('${esc(r.id)}')" class="px-2.5 py-1 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded text-xs font-bold">Ver / Imprimir</button>
                <button type="button" onclick="abrirModalRemision('${esc(r.clienteId)}', '${esc(r.id)}')" class="px-2.5 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded text-xs font-bold">Editar</button>
            </td>
        </tr>`).join('');
}

// ---------- Documento de la remisión (formato de La Primavera) ----------
// Agrupa las líneas como en el formato: una fila por descripción y referencia (x40, x25...)
function filasRemision(r) {
    const porTipo = (r.detalle || 'tipo') === 'tipo';
    const mapa = new Map();
    r.lineas.forEach(l => {
        const desc = porTipo ? (/freedom/i.test(l.variedad) ? 'Rosa Freedom' : 'Mix Colores') : l.variedad;
        const k = desc + '|' + l.tallosPorTabaco;
        const f = mapa.get(k) || { desc, tpt: l.tallosPorTabaco, tabacos: 0, tallos: 0 };
        f.tabacos += l.tabacos;
        f.tallos += l.totalTallos;
        mapa.set(k, f);
    });
    return [...mapa.values()];
}

function htmlRemision(r) {
    const c = r.cliente || {};
    const filas = filasRemision(r);
    const FILAS_MIN = 10;
    const vacias = Math.max(0, FILAS_MIN - filas.length);
    const hist = (r.historial || []).map(h => `${new Date(h.fecha).toLocaleDateString('es-CO')}: ${esc(h.motivo)}`).join('. ');
    const recibe = [r.recibe, r.documentoRecibe ? 'C.C. ' + r.documentoRecibe : ''].filter(Boolean).map(esc).join(', ');

    return `
        <table class="rem">
            <colgroup><col style="width:21%"><col style="width:17%"><col style="width:38%"><col style="width:24%"></colgroup>
            <tr style="height:92px">
                <td colspan="2" rowspan="2" class="logo">
                    <img src="img/logo.png" alt="La Primavera" style="max-height:130px;max-width:100%;margin:auto" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <span style="display:none;font:italic 700 30px Georgia,serif;color:#1d4b8f">La Primavera</span>
                </td>
                <td colspan="2" class="banner">REMISIÓN No. ${esc(r.numero)}</td>
            </tr>
            <tr style="height:40px"><td></td><td></td></tr>
            <tr><td class="et">Señor(es):</td><td>${esc(c.nombre)}</td><td class="et">Dirección:</td><td>${esc(c.direccion)}</td></tr>
            <tr><td class="et">Pedido No.:</td><td>${esc(r.pedido)}</td><td class="et">Fecha:</td><td>${fmtFechaCorta(r.fecha)}</td></tr>
            <tr><td class="et">Tallos</td><td>${num(r.totalTallos)}</td><td class="et">Tabacos</td><td>${num(r.totalTabacos)}</td></tr>
            <tr class="azul"><td></td><td></td><td></td><td></td></tr>
            <tr><td class="et">Cantidad</td><td class="et">Referencia</td><td class="et">Descripción del artículo</td><td class="et">Observaciones</td></tr>
            ${filas.map(f => `<tr class="gris"><td>${num(f.tabacos)}</td><td>x${f.tpt}</td><td class="desc">${esc(f.desc)}</td><td>${num(f.tallos)}</td></tr>`).join('')}
            ${'<tr class="gris"><td></td><td></td><td></td><td></td></tr>'.repeat(vacias)}
            <tr style="height:44px"><td class="et" rowspan="2">Despachado por:</td><td rowspan="2">${esc(r.despachadoPor)}</td><td class="et der">Transportado por:</td><td>${esc(r.transportadoPor)}</td></tr>
            <tr style="height:44px"><td class="et der">Tabacos</td><td class="ctr">${num(r.totalTabacos)}</td></tr>
            <tr style="height:90px"><td class="et">Recibido por:</td><td colspan="3" style="vertical-align:bottom;font-size:11px;color:#555">${recibe}</td></tr>
        </table>
        ${r.observaciones ? `<p style="font:12px Calibri,Arial,sans-serif;margin-top:8px"><b>Nota:</b> ${esc(r.observaciones)}</p>` : ''}
        ${r.inconformidad ? `<p style="font:12px Calibri,Arial,sans-serif;margin-top:4px"><b>Inconformidad:</b> ${esc(r.inconformidad)}</p>` : ''}
        ${hist ? `<p style="font:11px Calibri,Arial,sans-serif;margin-top:4px;color:#555"><b>Remisión modificada.</b> ${hist}</p>` : ''}`;
}

window.verRemision = function (id) {
    const r = remisiones.find(x => mismoId(x.id, id));
    if (!r) return;
    remisionVista = r;
    $('area-remision').innerHTML = htmlRemision(r);
    $('modal-ver-remision').classList.remove('hidden');
};

window.editarRemisionVista = function () {
    if (!remisionVista) return;
    cerrarModal('modal-ver-remision');
    abrirModalRemision(remisionVista.clienteId, remisionVista.id);
};
