// Registro de entrada por lotes, cada lote con su propia estiba. Se carga después de main.js e
// inventario.js y reemplaza abrirModalEntrada y guardarEntrada de esos archivos.
let listasEntrada = {};

const escapar = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opciones = (lista, valor, texto) =>
    `<option value="">${texto}</option>` + (lista || []).map(v => `<option value="${escapar(v)}"${v === valor ? ' selected' : ''}>${escapar(v)}</option>`).join('');

function fechaLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

window.abrirModalEntrada = async function () {
    document.getElementById('modal-entrada').classList.remove('hidden');
    document.getElementById('entrada-fecha').value = fechaLocal();
    listasEntrada = await obtenerListasConfiguracion();
    document.getElementById('entrada-lotes').innerHTML = '';
    document.getElementById('entrada-incompletos').innerHTML = '';
    agregarLote();
};

// Cada lote nuevo copia estiba, bloque, grado y tallos por tabaco del lote anterior; la estiba se puede cambiar en cada renglón
window.agregarLote = function () {
    const cont = document.getElementById('entrada-lotes');
    const ultimo = cont.lastElementChild;
    let prev;
    if (ultimo) {
        prev = {
            estiba: ultimo.querySelector('.l-estiba').value,
            bloque: ultimo.querySelector('.l-bloque').value,
            grado: ultimo.querySelector('.l-grado').value,
            tallos: ultimo.querySelector('.l-tallos').value
        };
    } else {
        const guardada = localStorage.getItem('entrada_ultima_estiba') || '';
        prev = {
            estiba: (listasEntrada.ubicaciones || []).includes(guardada) ? guardada : '',
            bloque: '', grado: '',
            tallos: localStorage.getItem('entrada_ultimo_tallos') || '40'
        };
    }

    const campo = 'w-full border rounded-lg px-2 py-2 text-sm bg-white';
    const etiqueta = 'block text-[10px] font-bold text-slate-500 mb-0.5';
    const div = document.createElement('div');
    div.className = 'lote grid grid-cols-2 md:grid-cols-[1.3fr_1fr_1.4fr_1fr_.8fr_.9fr_auto] gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2';
    div.innerHTML = `
        <div class="col-span-2 md:col-span-1"><label class="${etiqueta}">Estiba</label><select class="l-estiba ${campo} font-bold text-blue-900">${opciones(listasEntrada.ubicaciones, prev.estiba, '-- Estiba --')}</select></div>
        <div><label class="${etiqueta}">Bloque</label><select class="l-bloque ${campo}">${opciones(listasEntrada.bloques, prev.bloque, '--')}</select></div>
        <div><label class="${etiqueta}">Variedad</label><select class="l-variedad ${campo} font-bold">${opciones(listasEntrada.variedades, '', '--')}</select></div>
        <div><label class="${etiqueta}">Grado</label><select class="l-grado ${campo}">${opciones(listasEntrada.grados, prev.grado, '--')}</select></div>
        <div><label class="${etiqueta}">Tabacos</label><input type="number" min="1" inputmode="numeric" placeholder="0" class="l-tabacos ${campo} font-bold"></div>
        <div><label class="${etiqueta}">Tallos/tabaco</label>
            <select class="l-tallos ${campo}">${['40', '25', '50'].map(t => `<option value="${t}"${t === prev.tallos ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <button type="button" onclick="quitarLote(this)" title="Quitar lote" class="px-2 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold">✕</button>`;
    cont.appendChild(div);
    div.querySelector(prev.estiba ? '.l-variedad' : '.l-estiba').focus();
    actualizarTotalEntrada();
};

window.quitarLote = function (btn) {
    const cont = document.getElementById('entrada-lotes');
    if (cont.children.length > 1) btn.closest('.lote').remove();
    else btn.closest('.lote').querySelectorAll('input').forEach(i => i.value = '');
    actualizarTotalEntrada();
};

window.agregarIncompleto = function () {
    const cont = document.getElementById('entrada-incompletos');
    const ultInc = cont.lastElementChild;
    const ultLote = document.getElementById('entrada-lotes').lastElementChild;
    const prev = ultInc ? {
        estiba: ultInc.querySelector('.i-estiba').value, bloque: ultInc.querySelector('.i-bloque').value,
        grado: ultInc.querySelector('.i-grado').value, meta: ultInc.querySelector('.i-meta').value,
        cortador: ultInc.querySelector('.i-cortador').value
    } : ultLote ? {
        estiba: ultLote.querySelector('.l-estiba').value, bloque: ultLote.querySelector('.l-bloque').value,
        grado: ultLote.querySelector('.l-grado').value, meta: ultLote.querySelector('.l-tallos').value, cortador: ''
    } : { estiba: '', bloque: '', grado: '', meta: localStorage.getItem('entrada_ultimo_tallos') || '40', cortador: '' };

    const campo = 'w-full border rounded-lg px-2 py-2 text-sm bg-white';
    const etiqueta = 'block text-[10px] font-bold text-slate-500 mb-0.5';
    const div = document.createElement('div');
    div.className = 'incompleto grid grid-cols-2 md:grid-cols-[1.2fr_1fr_1.3fr_1fr_.8fr_.8fr_1.1fr_auto] gap-2 items-end bg-amber-50 border border-amber-200 rounded-xl p-2';
    div.innerHTML = `
        <div class="col-span-2 md:col-span-1"><label class="${etiqueta}">Estiba</label><select class="i-estiba ${campo} font-bold text-amber-900">${opciones(listasEntrada.ubicaciones, prev.estiba, '-- Estiba --')}</select></div>
        <div><label class="${etiqueta}">Bloque</label><select class="i-bloque ${campo}">${opciones(listasEntrada.bloques, prev.bloque, '--')}</select></div>
        <div><label class="${etiqueta}">Variedad</label><select class="i-variedad ${campo} font-bold">${opciones(listasEntrada.variedades, '', '--')}</select></div>
        <div><label class="${etiqueta}">Grado</label><select class="i-grado ${campo}">${opciones(listasEntrada.grados, prev.grado, '--')}</select></div>
        <div><label class="${etiqueta}">Tallos actuales</label><input type="number" min="1" inputmode="numeric" placeholder="0" class="i-actuales ${campo} font-bold"></div>
        <div><label class="${etiqueta}">Meta</label><select class="i-meta ${campo}">${['40', '25', '50'].map(t => `<option value="${t}"${t === prev.meta ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <div><label class="${etiqueta}">Cortador</label><select class="i-cortador ${campo}">${opciones(listasEntrada.cortadores, prev.cortador, '--')}</select></div>
        <button type="button" onclick="quitarIncompleto(this)" title="Quitar" class="px-2 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold">✕</button>`;
    cont.appendChild(div);
    div.querySelector(prev.estiba ? '.i-variedad' : '.i-estiba').focus();
    actualizarTotalEntrada();
};

window.quitarIncompleto = function (btn) {
    btn.closest('.incompleto').remove();
    actualizarTotalEntrada();
};

// Muestra el total y cuántos tabacos va a cada estiba, para revisar la ubicación antes de guardar
function actualizarTotalEntrada() {
    let lotes = 0, tabacos = 0, tallos = 0;
    const porEstiba = {};
    document.querySelectorAll('#entrada-lotes .lote').forEach(f => {
        const t = parseInt(f.querySelector('.l-tabacos').value) || 0;
        if (t <= 0) return;
        lotes++;
        tabacos += t;
        tallos += t * (parseInt(f.querySelector('.l-tallos').value) || 40);
        const e = f.querySelector('.l-estiba').value || 'Sin estiba';
        porEstiba[e] = (porEstiba[e] || 0) + t;
    });
    const el = document.getElementById('entrada-total');
    if (!el) return;
    const chips = Object.keys(porEstiba).map(e =>
        `<span class="inline-block px-2 py-0.5 rounded text-xs font-semibold mr-1 ${e === 'Sin estiba' ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-800'}">${escapar(e)}: ${porEstiba[e].toLocaleString()} tabacos</span>`).join('');
    let nInc = 0, faltan = 0;
    document.querySelectorAll('#entrada-incompletos .incompleto').forEach(f => {
        const a = parseInt(f.querySelector('.i-actuales').value) || 0;
        if (a > 0) { nInc++; faltan += Math.max(0, (parseInt(f.querySelector('.i-meta').value) || 40) - a); }
    });
    const inc = nInc ? `<span class="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">${nInc} incompleto${nInc === 1 ? '' : 's'}: faltan ${faltan.toLocaleString()} tallos</span>` : '';
    el.innerHTML = `<b>${lotes}</b> lote${lotes === 1 ? '' : 's'}, <b>${tabacos.toLocaleString()}</b> tabacos, <b>${tallos.toLocaleString()}</b> tallos<div class="mt-1">${chips}${inc}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-entrada');
    if (!form) return;
    // Desde la página de incompletos se llega con #incompletos
    if (location.hash === '#incompletos') {
        abrirModalEntrada().then(agregarIncompleto);
        history.replaceState(null, '', location.pathname);
    }
    form.addEventListener('input', actualizarTotalEntrada);
    form.addEventListener('change', actualizarTotalEntrada);
    // Enter en "Tabacos" abre otro lote en vez de guardar todo
    form.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        if (e.target.classList.contains('l-tabacos') && parseInt(e.target.value) > 0) agregarLote();
        if (e.target.classList.contains('i-actuales') && parseInt(e.target.value) > 0) agregarIncompleto();
    });
});

window.guardarEntrada = async function (event) {
    if (event) event.preventDefault();

    const fecha = document.getElementById('entrada-fecha').value;
    if (!fecha) { alert('Selecciona la fecha.'); return; }

    const lotes = [];
    for (const f of document.querySelectorAll('#entrada-lotes .lote')) {
        const lote = {
            estiba: f.querySelector('.l-estiba').value,
            bloque: f.querySelector('.l-bloque').value,
            variedad: f.querySelector('.l-variedad').value,
            grado: f.querySelector('.l-grado').value,
            tabacos: parseInt(f.querySelector('.l-tabacos').value) || 0,
            tallosPorTabaco: parseInt(f.querySelector('.l-tallos').value) || 40
        };
        if (!lote.variedad && !lote.tabacos) continue; // fila vacía
        if (!lote.estiba || !lote.bloque || !lote.variedad || !lote.grado || lote.tabacos <= 0) {
            alert('Completa estiba, bloque, variedad, grado y cantidad en cada lote (o quita el lote que no uses).');
            f.scrollIntoView({ block: 'center' });
            return;
        }
        lotes.push(lote);
    }

    const incompletos = [];
    for (const f of document.querySelectorAll('#entrada-incompletos .incompleto')) {
        const inc = {
            ubicacion: f.querySelector('.i-estiba').value,
            bloque: f.querySelector('.i-bloque').value,
            variedad: f.querySelector('.i-variedad').value,
            grado: f.querySelector('.i-grado').value,
            tallosActuales: parseInt(f.querySelector('.i-actuales').value) || 0,
            tallosMeta: parseInt(f.querySelector('.i-meta').value) || 40,
            cortador: f.querySelector('.i-cortador').value
        };
        if (!inc.variedad && !inc.tallosActuales) continue; // fila vacía
        if (!inc.ubicacion || !inc.bloque || !inc.variedad || !inc.grado || inc.tallosActuales <= 0) {
            alert('Completa estiba, bloque, variedad, grado y tallos actuales en cada tabaco incompleto.');
            f.scrollIntoView({ block: 'center' });
            return;
        }
        if (inc.tallosActuales >= inc.tallosMeta) {
            alert('Un tabaco incompleto debe tener menos tallos que su meta. Si ya está completo, regístralo como lote.');
            f.scrollIntoView({ block: 'center' });
            return;
        }
        incompletos.push(inc);
    }
    if (!lotes.length && !incompletos.length) { alert('Agrega al menos un lote o un tabaco incompleto.'); return; }

    const boton = document.getElementById('btn-guardar-entrada');
    if (boton) boton.disabled = true;

    const base = Date.now();
    let fallos = 0, fallosInc = 0;

    if (lotes.length) {
        const guardadas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
        for (const [i, l] of lotes.entries()) {
            const entrada = {
                id: `${base}${i}`,
                fecha,
                ubicacion: l.estiba,
                bloque: l.bloque,
                variedad: l.variedad,
                tipo: l.variedad.toLowerCase().includes('freedom') ? 'Rojo' : 'Color',
                grado: l.grado,
                tabacos: l.tabacos,
                tallosPorTabaco: l.tallosPorTabaco,
                totalTallos: l.tabacos * l.tallosPorTabaco
            };
            try {
                const res = await fetch('/api/entradas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entrada)
                });
                if (!res.ok) fallos++;
            } catch (err) {
                fallos++;
            }
            guardadas.unshift(entrada);
        }
        const ultimo = lotes[lotes.length - 1];
        localStorage.setItem('app_entradas', JSON.stringify(guardadas));
        localStorage.setItem('entrada_ultima_estiba', ultimo.estiba);
        localStorage.setItem('entrada_ultimo_tallos', String(ultimo.tallosPorTabaco));
    }

    // Los incompletos que no lleguen al servidor quedan pendientes en este equipo
    if (incompletos.length) {
        const pendientes = JSON.parse(localStorage.getItem('app_incompletos') || '[]');
        for (const [i, inc] of incompletos.entries()) {
            const registro = { id: base * 10 + i, fecha, ...inc };
            try {
                const res = await fetch('/api/incompletos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registro)
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
            } catch (err) {
                fallosInc++;
                pendientes.push(registro);
            }
        }
        if (fallosInc) localStorage.setItem('app_incompletos', JSON.stringify(pendientes));
    }

    if (boton) boton.disabled = false;
    cerrarModal('modal-entrada');
    await cargarEntradas();   // vuelve a leer del servidor para que la tabla muestre todo
    cargarInventario();

    const avisos = [];
    if (fallos) avisos.push(`${fallos} lote(s) no se pudieron enviar al servidor y quedaron guardados solo en este equipo. Revisa la conexión.`);
    if (fallosInc) avisos.push(`${fallosInc} tabaco(s) incompleto(s) no se pudieron enviar al servidor y quedaron guardados solo en este equipo.`);
    if (avisos.length) alert(avisos.join('\n\n'));
};
