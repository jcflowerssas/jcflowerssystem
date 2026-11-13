// Registro de salidas por lotes. Se carga después de salidas.js y reemplaza
// abrirModalSalidaGeneral, abrirModalSalidaParaEstiba y guardarSalida.
(function () {
    let stock = {};

    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = n => Math.round(Number(n) || 0).toLocaleString('es-CO');
    const natural = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });

    function fechaLocal() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ---------- Inventario disponible por estiba, variedad y grado ----------
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
            const l = linea(e.ubicacion || 'Sin Ubicación', e.variedad || 'General', e.grado || 'Sin grado');
            const c = cantidades(e);
            l.tabacos += c.tabacos; l.tallos += c.tallos;
            if (e.bloque) l.bloques.add(e.bloque);
        });
        sals.forEach(s => {
            const u = est[s.ubicacion || 'Sin Ubicación'];
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

    // ---------- Lotes de la salida ----------
    // Cada lote nuevo copia la estiba del anterior; se puede cambiar en cada renglón
    function agregar(d = {}) {
        const cont = $('salida-lotes');
        const ultimo = cont.lastElementChild;
        const estiba = d.estiba || (ultimo ? ultimo.querySelector('.s-estiba').value : '');
        const campo = 'w-full border rounded-lg px-2 py-2 text-sm bg-white';
        const etiqueta = 'block text-[10px] font-bold text-slate-500 mb-0.5';
        const div = document.createElement('div');
        div.className = 's-lote grid grid-cols-2 md:grid-cols-[1.3fr_2fr_.8fr_.8fr_auto] gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2';
        div.innerHTML = `
            <div class="col-span-2 md:col-span-1"><label class="${etiqueta}">Estiba</label><select class="s-estiba ${campo} font-bold text-rose-900">${opcionesEstibas(estiba)}</select></div>
            <div class="col-span-2 md:col-span-1"><label class="${etiqueta}">Producto disponible</label><select class="s-producto ${campo}">${opcionesProductos(estiba, '')}</select></div>
            <div><label class="${etiqueta}">Tabacos</label><input type="number" min="1" inputmode="numeric" placeholder="0" class="s-tabacos ${campo} font-bold"></div>
            <div><label class="${etiqueta}">Tallos/tabaco</label><select class="s-tpt ${campo}">${[40, 25, 50].map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
            <button type="button" onclick="quitarLoteSalida(this)" title="Quitar lote" class="px-2 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold">✕</button>`;
        cont.appendChild(div);
        div.querySelector(estiba ? '.s-producto' : '.s-estiba').focus();
        actualizarTotal();
    }

    window.agregarLoteSalida = () => agregar({});

    window.quitarLoteSalida = function (btn) {
        const cont = $('salida-lotes');
        if (cont.children.length > 1) btn.closest('.s-lote').remove();
        else btn.closest('.s-lote').querySelectorAll('input').forEach(i => i.value = '');
        actualizarTotal();
    };

    function leerLotes() {
        return [...document.querySelectorAll('#salida-lotes .s-lote')].map(f => {
            const estiba = f.querySelector('.s-estiba').value;
            const clave = f.querySelector('.s-producto').value;
            return {
                estiba, clave,
                linea: (stock[estiba] || {})[clave],
                tabacos: parseInt(f.querySelector('.s-tabacos').value) || 0,
                tpt: parseInt(f.querySelector('.s-tpt').value) || 40,
                fila: f
            };
        });
    }

    // Total y tabacos que salen de cada estiba, para revisar antes de guardar
    function actualizarTotal() {
        const ls = leerLotes().filter(l => l.linea && l.tabacos > 0);
        const porEstiba = {};
        ls.forEach(l => porEstiba[l.estiba] = (porEstiba[l.estiba] || 0) + l.tabacos);
        const tabacos = ls.reduce((s, l) => s + l.tabacos, 0);
        const tallos = ls.reduce((s, l) => s + l.tabacos * l.tpt, 0);
        const chips = Object.keys(porEstiba).map(e =>
            `<span class="inline-block px-2 py-0.5 rounded text-xs font-semibold mr-1 bg-rose-50 text-rose-800">${esc(e)}: ${num(porEstiba[e])} tabacos</span>`).join('');
        $('salida-total').innerHTML = `<b>${ls.length}</b> lote${ls.length === 1 ? '' : 's'}, <b>${num(tabacos)}</b> tabacos, <b>${num(tallos)}</b> tallos<div class="mt-1">${chips}</div>`;
    }

    async function abrir(estibaInicial) {
        $('modal-salida').classList.remove('hidden');
        $('salida-fecha').value = fechaLocal();
        $('salida-lotes').innerHTML = '';
        if (typeof cargarDatosSalidas === 'function') await cargarDatosSalidas();   // stock al día
        stock = calcularStock(window.entradasGlobal || [], window.salidasGlobal || []);
        agregar({ estiba: estibaInicial });
    }

    window.abrirModalSalidaGeneral = () => abrir('');
    window.abrirModalSalidaParaEstiba = ubicacion => abrir(ubicacion);

    document.addEventListener('DOMContentLoaded', () => {
        const cont = $('salida-lotes');
        if (!cont) return;
        cont.addEventListener('change', ev => {
            const fila = ev.target.closest('.s-lote');
            if (!fila) return;
            if (ev.target.classList.contains('s-estiba')) fila.querySelector('.s-producto').innerHTML = opcionesProductos(ev.target.value, '');
            if (ev.target.classList.contains('s-producto')) {
                const l = (stock[fila.querySelector('.s-estiba').value] || {})[ev.target.value];
                if (l) fila.querySelector('.s-tpt').value = String(tptDe(l));
            }
            actualizarTotal();
        });
        cont.addEventListener('input', actualizarTotal);
        // Enter en "Tabacos" abre otro lote en vez de guardar todo
        $('form-salida').addEventListener('keydown', e => {
            if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            if (e.target.classList.contains('s-tabacos') && parseInt(e.target.value) > 0) agregar({});
        });
    });

    // ---------- Guardar ----------
    window.guardarSalida = async function (event) {
        if (event) event.preventDefault();

        const fecha = $('salida-fecha').value;
        if (!fecha) { alert('Selecciona la fecha.'); return; }

        const ls = leerLotes().filter(l => l.estiba || l.clave || l.tabacos);   // las filas vacías se ignoran
        if (!ls.length) { alert('Agrega al menos un lote.'); return; }
        for (const l of ls) {
            if (!l.linea || l.tabacos <= 0) {
                alert('Completa estiba, producto y cantidad en cada lote (o quita el que no uses).');
                l.fila.scrollIntoView({ block: 'center' });
                return;
            }
        }

        // Lo que sale no puede superar lo disponible (se suman los lotes repetidos)
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

        const boton = $('btn-guardar-salida');
        boton.disabled = true;
        const guardadas = JSON.parse(localStorage.getItem('app_salidas') || '[]');
        const base = Date.now();
        let fallos = 0;

        for (const [i, l] of ls.entries()) {
            const salida = {
                id: `${base}${i}`,
                fecha,
                ubicacion: l.estiba,
                bloque: [...l.linea.bloques].join(', ') || 'General',
                variedad: l.linea.variedad,
                tipo: l.linea.variedad.toLowerCase().includes('freedom') ? 'Rojo' : 'Color',
                grado: l.linea.grado,
                tabacos: l.tabacos,
                tallosPorTabaco: l.tpt,
                totalTallos: l.tabacos * l.tpt
            };
            try {
                const res = await fetch('/api/salidas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(salida)
                });
                if (!res.ok) fallos++;
            } catch (err) {
                fallos++;
            }
            guardadas.unshift(salida);
        }
        localStorage.setItem('app_salidas', JSON.stringify(guardadas));

        boton.disabled = false;
        cerrarModal('modal-salida');
        await cargarDatosSalidas();
        if (fallos) alert(`${fallos} lote(s) no se pudieron enviar al servidor y quedaron guardados solo en este equipo. Revisa la conexión.`);
    };

    // Las salidas que vienen de una remisión se corrigen editando la remisión, para que no se desajusten
    const eliminarOriginal = window.eliminarSalida;
    window.eliminarSalida = function (id) {
        const s = (window.salidasGlobal || []).find(x => String(x.id) === String(id));
        if (s && s.remisionId) {
            alert(`Esta salida pertenece a la remisión ${s.remision || ''}. Para corregirla, edita la remisión en Clientes.`);
            return;
        }
        return eliminarOriginal ? eliminarOriginal(id) : undefined;
    };
})();
