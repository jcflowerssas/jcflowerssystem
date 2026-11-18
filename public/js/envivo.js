// Tablero del supervisor: rendimiento de cada cortadora en tiempo real, jornada, metas y cierre.
(function () {
    const D = window.DATOS, K = window.CALCULO, esc = D.esc, num = D.num;
    const $ = id => document.getElementById(id);

    let fecha = D.hoy(), jornada = null, jornadas = [], recogidas = [], eventos = [], metas = {};

    // texto, fondo, tinta, color de la barra
    const VISTA = {
        r: ['Bajo la meta', '#f6dde0', '#6e2335', '#bc4155'], g: ['Sin recogida', '#eef3ef', '#3b4740', '#92a49b'],
        a: ['Cerca de la meta', '#f5ecd2', '#624c22', '#c9a85b'], n: ['Sin meta', '#eef3ef', '#3b4740', '#92a49b'],
        m: ['Midiendo', '#eef3ef', '#3b4740', '#92a49b'], v: ['En meta', '#e3efe8', '#163827', '#2c6d4d']
    };
    const fmtMin = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`);
    const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const esRojo = v => /freedom/i.test(v || '');
    const dosDec = n => Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function aviso(texto, tipo) { $('ev-aviso').innerHTML = texto ? `<div class="ev-aviso ${tipo || ''}">${texto}</div>` : ''; }

    // Horario estándar: lo guardado en Metas, o 06:00 a 16:00 con la pausa de 10:00 a 10:30
    function estandar() {
        return {
            inicio: metas.inicio || '06:00', fin: metas.fin || '16:00',
            pausas: Array.isArray(metas.pausas) ? metas.pausas : [{ desde: '10:00', hasta: '10:30' }]
        };
    }

    // ---------- Datos ----------
    const MENSAJE_LOCAL = 'Se guardó solo en este equipo: el servidor todavía no tiene la versión nueva (falta actualizar server.js en Railway). Los teléfonos no lo verán hasta entonces.';

    async function cargar() {
        await D.sincronizarTodo();
        jornadas = await D.leer('jornadas');
        jornada = jornadas.find(j => j.id === fecha) || null;
        recogidas = (await D.leer('recogidas')).filter(r => r.fecha === fecha);
        eventos = (await D.leer('eventos')).filter(e => e.fecha === fecha);
        metas = (await D.leer('metas')).find(m => m.id === 'config') || {};
        pintar();
        pintarConexion();
    }

    // Avisa si lo que se guarda no está llegando al servidor (los teléfonos no lo verían)
    function pintarConexion() {
        const texto = D.avisoServidor(), pend = D.pendientesTodo();
        $('ev-conex').innerHTML = (texto || pend)
            ? `<div class="ev-aviso mal">${texto ? texto + ' ' : ''}${pend ? `${pend} registro${pend > 1 ? 's' : ''} sin enviar. ` : ''}<button type="button" id="ev-reintentar" style="font-weight:700;text-decoration:underline">Reintentar</button> <a href="diagnostico.html" style="font-weight:700;text-decoration:underline;margin-left:8px">Ver detalle</a></div>` : '';
    }
    document.addEventListener('click', ev => { if (ev.target.id === 'ev-reintentar') cargar(); });

    // ---------- Tablero ----------
    function sparkline(valores, color) {
        const v = valores.slice(-6);
        if (v.length < 2) return '';
        const mx = Math.max(...v), mn = Math.min(...v);
        const pts = v.map((x, i) => [4 + i * (68 / (v.length - 1)), 22 - (x - mn) / Math.max(1, mx - mn) * 18]);
        return `<svg width="80" height="26" viewBox="0 0 80 26" aria-hidden="true"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3" fill="${color}"/></svg>`;
    }

    function tarjeta(a, esHoy) {
        const c = a.cortadora, f = a.frente;
        let est = K.estadoFinal(a);
        if (est === 'n' && a.meta) est = 'm';
        const [txt, fondo, tinta, color] = VISTA[est];
        const ini = c.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
        const ritmo = a.promedio !== null
            ? `<div class="ev-ritmo" title="${dosDec(a.promedio)} tallos por hora">${num(a.promedio)} <span>por hora${a.meta ? ` de ${num(a.meta)}, ${Math.round(a.pct)}%` : ''}</span></div>`
            : `<div class="ev-ritmo"><span>Aún sin datos para medir el ritmo</span></div>`;
        const base = a.promedio !== null ? `<div class="ev-peq">${num(a.tallos)} tallos en ${fmtMin(a.minTrabajados)} de trabajo = ${dosDec(a.promedio)} por hora</div>` : '';
        const tend = a.tendencia ? `<div class="ev-tend ${a.tendencia}">${a.tendencia === 'baja' ? '↓' : '↑'} Última hora: ${num(a.ultimaHora)} por hora</div>` : '';
        const ultima = !a.ultima ? 'Sin recogidas todavía' : a.fin ? `Terminó de cortar a las ${a.fin}` : esHoy ? `Última recogida hace ${fmtMin(a.minDesde)}` : `Última recogida a las ${a.ultima}`;
        const mezcla = a.porCorte.color.tabacos && a.porCorte.rojo.tabacos ? ` (color ${num(a.porCorte.color.tabacos)}, rojo ${num(a.porCorte.rojo.tabacos)})` : '';
        return `<article class="ev-c">
            <div class="ev-c-cab">
                <span class="ev-av">${esc(ini)}</span>
                <div><div class="ev-c-nom">${esc(c.nombre)}</div><div class="ev-c-sub">Mesa ${esc(c.mesa)}, etiqueta ${esc(c.etiqueta)}</div></div>
                <span class="ev-chip" style="background:${fondo};color:${tinta}">${txt}</span>
            </div>
            <span class="ev-fr"><i style="background:${f.corte === 'rojo' ? '#c62839' : '#a5864c'}"></i>${f.corte === 'rojo' ? 'Rojo' : 'Color'}, ${esc(f.variedad || 'sin variedad')}, ${esc(f.bloque || 'sin bloque')}${f.desde ? ' desde las ' + esc(f.desde) : ''}</span>
            ${a.meta && a.pct !== null ? `<div class="ev-barra"><i style="width:${Math.min(100, a.pct / 125 * 100)}%;background:${color}"></i><b></b></div>` : '<div style="height:14px"></div>'}
            <div class="ev-c-pie">
                <div>${ritmo}${tend}<div class="ev-peq">${ultima}</div></div>
                ${sparkline(a.serie, color)}
            </div>
            ${base}
            <div class="ev-peq" style="margin-top:6px">${num(a.tabacos)} tabacos${mezcla}, ${num(a.tallos)} tallos${a.incompletos ? `, <b style="color:#7a5f26">${a.incompletos} incompletos</b>` : ''}</div>
        </article>`;
    }

    function pintar() {
        $('ev-fecha').value = fecha;
        const esHoy = fecha === D.hoy();
        $('ev-act').textContent = esHoy ? 'Actualizado ' + D.ahora() : '';
        $('ev-btn-jornada').textContent = jornada ? 'Editar jornada' : 'Abrir jornada';
        $('ev-cerrar').classList.toggle('ev-oculto', !jornada || !!jornada.cerrada);

        if (!jornada) {
            $('ev-met').innerHTML = '';
            $('ev-tarj').innerHTML = `<div class="ev-vacio" style="grid-column:1/-1">No hay una jornada abierta para esta fecha.<br>Ábrela para elegir las cortadoras y sus mesas.</div>`;
            aviso('');
            return;
        }
        const ahoraMin = K.aMin(D.ahora());
        const an = jornada.cortadoras.map(c => K.analizar(c, recogidas, eventos, jornada, metas, ahoraMin, esHoy))
            .sort((x, y) => K.ORDEN[K.estadoFinal(x)] - K.ORDEN[K.estadoFinal(y)] || (Number(x.cortadora.mesa) || 99) - (Number(y.cortadora.mesa) || 99));
        const g = K.resumenGrupo(an, jornada, ahoraMin, esHoy);

        $('ev-met').innerHTML = `
            <div class="ev-m"><div class="ev-m-t">Tallos del día</div><div class="ev-m-n">${num(g.tallos)}</div></div>
            <div class="ev-m"><div class="ev-m-t">Ritmo del grupo</div><div class="ev-m-n">${num(g.ritmoGrupo)} <small>por hora</small></div></div>
            <div class="ev-m${g.atencion ? ' mal' : ''}"><div class="ev-m-t">Requieren atención</div><div class="ev-m-n">${g.atencion} <small>de ${an.length}</small></div></div>
            <div class="ev-m"><div class="ev-m-t">Cierre proyectado</div><div class="ev-m-n">${g.proyeccion ? num(g.proyeccion) : '—'}</div></div>`;
        $('ev-tarj').innerHTML = an.map(a => tarjeta(a, esHoy)).join('');

        if (jornada.cerrada) aviso(`Jornada cerrada a las ${esc(jornada.cierre || '')}.`, 'ok');
        else if (!(Number(metas.freedom) > 0) && !(Number(metas.colores) > 0)) aviso('Define las metas para ver el semáforo de cada cortadora. Toca el botón Metas.');
        else aviso('');
    }

    // ---------- Pausas (jornada y horario estándar) ----------
    function filaPausa(contenedor, p = {}) {
        const d = document.createElement('div');
        d.className = 'jr-pausa';
        d.innerHTML = `<input type="time" class="p-desde" value="${esc(p.desde || '')}" aria-label="Desde"> <span>a</span> <input type="time" class="p-hasta" value="${esc(p.hasta || '')}" aria-label="Hasta">
            <button type="button" class="ev-b" aria-label="Quitar pausa" style="padding:0 12px">✕</button>`;
        d.querySelector('button').onclick = () => d.remove();
        contenedor.appendChild(d);
    }
    const leerPausas = contenedor => [...contenedor.querySelectorAll('.jr-pausa')]
        .map(p => ({ desde: p.querySelector('.p-desde').value, hasta: p.querySelector('.p-hasta').value })).filter(p => p.desde && p.hasta);

    // ---------- Jornada ----------
    const opciones = (lista, sel, vacio = true) => (vacio ? '<option value="">--</option>' : '') + (lista || []).map(v => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
    const variedadesDe = (listas, corte) => {
        const todas = listas.variedades || [];
        const l = todas.filter(v => esRojo(v) === (corte === 'rojo'));
        return l.length ? l : (corte === 'rojo' ? ['Freedom (Rojo)'] : todas);
    };
    let listasJ = {};

    async function abrirJornada() {
        if (jornada && jornada.cerrada) { alert('La jornada de este día ya está cerrada.'); return; }
        listasJ = typeof obtenerListasConfiguracion === 'function' ? await obtenerListasConfiguracion() : {};
        const est = estandar();
        const anterior = jornada || [...jornadas].filter(j => j.id < fecha).sort((a, b) => b.id.localeCompare(a.id))[0] || null;
        $('jr-inicio').value = jornada ? jornada.inicio : est.inicio;
        $('jr-fin').value = jornada ? jornada.fin : est.fin;
        $('jr-pausas').innerHTML = '';
        (jornada ? jornada.pausas || [] : est.pausas).forEach(p => filaPausa($('jr-pausas'), p));

        const bloques = listasJ.bloques || [];
        const bloqueBase = bloques.includes('Bloque 2') ? 'Bloque 2' : '';
        const nombres = listasJ.cortadores || [];
        $('jr-cortadoras').innerHTML = nombres.length ? nombres.map((n, i) => {
            const p = anterior && anterior.cortadoras.find(c => c.nombre === n);
            const corte = (p && p.corte) || (p && esRojo(p.variedad) ? 'rojo' : 'color');
            const vars = variedadesDe(listasJ, corte);
            const variedad = p && vars.includes(p.variedad) ? p.variedad : '';
            return `<div class="jr-fila${anterior && !p ? ' off' : ''}" data-n="${esc(n)}">
                <div class="jr-fila-cab"><input type="checkbox" class="f-pres" ${!anterior || p ? 'checked' : ''} aria-label="Presente"><span>${esc(n)}</span></div>
                <div class="jr-fila-c">
                    <div><label>Mesa</label><input type="number" class="f-mesa" min="1" inputmode="numeric" value="${esc(p ? p.mesa : i + 1)}"></div>
                    <div><label>Etiqueta</label><input type="text" class="f-etq" value="${esc(p ? p.etiqueta : i + 1)}"></div>
                    <div><label>Empieza con</label><select class="f-corte"><option value="color"${corte === 'color' ? ' selected' : ''}>Color</option><option value="rojo"${corte === 'rojo' ? ' selected' : ''}>Rojo</option></select></div>
                    <div><label>Variedad</label><select class="f-var">${opciones(vars, variedad)}</select></div>
                    <div><label>Bloque</label><select class="f-blo">${opciones(bloques, (p && p.bloque) || bloqueBase)}</select></div>
                    <div><label>Empieza a las (si es distinto)</label><input type="time" class="f-ini" value="${esc(p && p.inicio || '')}"></div>
                </div></div>`;
        }).join('') : '<p class="ev-peq">No hay cortadores. Agrégalos en Configuración.</p>';
        $('modal-jornada').classList.remove('ev-oculto');
    }

    $('jr-cortadoras').addEventListener('change', e => {
        const fila = e.target.closest('.jr-fila');
        if (!fila) return;
        if (e.target.classList.contains('f-pres')) fila.classList.toggle('off', !e.target.checked);
        if (e.target.classList.contains('f-corte')) fila.querySelector('.f-var').innerHTML = opciones(variedadesDe(listasJ, e.target.value), '');
    });

    $('form-jornada').addEventListener('submit', async e => {
        e.preventDefault();
        const cortadoras = [];
        for (const f of document.querySelectorAll('#jr-cortadoras .jr-fila')) {
            if (!f.querySelector('.f-pres').checked) continue;
            const c = { nombre: f.dataset.n, mesa: f.querySelector('.f-mesa').value, etiqueta: f.querySelector('.f-etq').value.trim(), corte: f.querySelector('.f-corte').value, variedad: f.querySelector('.f-var').value, bloque: f.querySelector('.f-blo').value, inicio: f.querySelector('.f-ini').value };
            if (!c.mesa || !c.etiqueta || !c.variedad || !c.bloque) { alert(`Completa mesa, etiqueta, variedad y bloque de ${c.nombre}, o desmárcala si hoy no trabaja.`); f.scrollIntoView({ block: 'center' }); return; }
            cortadoras.push(c);
        }
        if (!cortadoras.length) { alert('Marca al menos una cortadora.'); return; }
        const guardada = await D.guardar('jornadas', { id: fecha, fecha, inicio: $('jr-inicio').value, fin: $('jr-fin').value, pausas: leerPausas($('jr-pausas')), cortadoras, cerrada: false });
        if (!guardada) alert(MENSAJE_LOCAL);
        $('modal-jornada').classList.add('ev-oculto');
        await cargar();
    });
    $('jr-add-pausa').onclick = () => filaPausa($('jr-pausas'));

    // ---------- Metas y horario estándar ----------
    function abrirMetas() {
        const est = estandar();
        const v = (id, x, d) => { $(id).value = x !== undefined && x !== null && x !== '' ? x : d; };
        v('mt-colores', metas.colores, ''); v('mt-freedom', metas.freedom, '');
        v('mt-tcolor', metas.tptColor, 25); v('mt-trojo', metas.tptRojo, 40);
        v('mt-verde', metas.verde, 100); v('mt-ambar', metas.ambar, 85); v('mt-alerta', metas.alertaMin, 75);
        v('mt-inicio', est.inicio, '06:00'); v('mt-fin', est.fin, '16:00');
        $('mt-pausas').innerHTML = '';
        est.pausas.forEach(p => filaPausa($('mt-pausas'), p));
        $('modal-metas').classList.remove('ev-oculto');
    }
    $('mt-add-pausa').onclick = () => filaPausa($('mt-pausas'));
    $('form-metas').addEventListener('submit', async e => {
        e.preventDefault();
        const n = id => Number($(id).value) || 0;
        if (n('mt-ambar') >= n('mt-verde')) { alert('El ámbar debe empezar por debajo del verde.'); return; }
        const guardada = await D.guardar('metas', {
            id: 'config', colores: n('mt-colores') || '', freedom: n('mt-freedom') || '', tptColor: n('mt-tcolor') || 25, tptRojo: n('mt-trojo') || 40,
            verde: n('mt-verde'), ambar: n('mt-ambar'), alertaMin: n('mt-alerta'),
            inicio: $('mt-inicio').value || '06:00', fin: $('mt-fin').value || '16:00', pausas: leerPausas($('mt-pausas'))
        });
        if (!guardada) alert(MENSAJE_LOCAL);
        $('modal-metas').classList.add('ev-oculto');
        await cargar();
    });

    // ---------- Cierre ----------
    async function cerrarJornada() {
        if (!jornada || jornada.cerrada) return;
        const ahoraMin = K.aMin(D.ahora());
        const an = jornada.cortadoras.map(c => K.analizar(c, recogidas, eventos, jornada, metas, ahoraMin, true)).filter(a => a.recogidas.length);
        const totalInc = an.reduce((s, a) => s + a.incompletos, 0);
        if (!an.length) { alert('Todavía no hay recogidas en esta jornada.'); return; }
        const sinFin = an.filter(a => !a.fin).map(a => a.cortadora.nombre);
        if (!confirm(`¿Cerrar la jornada del ${fecha.split('-').reverse().join('/')}?\n\nSe crearán los cortes del día de ${an.length} cortadoras y ${totalInc} incompletos para completar al día siguiente.` +
            (sinFin.length ? `\n\nSin hora de "terminó de cortar" (se usará la de su última recogida): ${sinFin.join(', ')}.` : ''))) return;

        let fallos = 0, cortes = 0, incompletos = 0;
        for (const a of an) {
            const c = a.cortadora, horas = a.minTrabajados / 60;
            const unicos = campo => [...new Set(a.recogidas.map(r => r[campo]).filter(Boolean))].join(', ');
            const corte = {
                id: `rg-${fecha}-${slug(c.nombre)}`, fecha, cortador: c.nombre, bloque: unicos('bloque'), variedad: unicos('variedad'),
                horaInicio: c.inicio || jornada.inicio, horaFin: a.fin || a.ultima, horas: horas.toFixed(2),
                tallosDirectos: a.tallos, totalTallos: a.tallos, promedioHora: horas > 0 ? Math.round(a.tallos / horas) : a.tallos
            };
            await D.borrar('cortes', corte.id);
            if (!await D.guardar('cortes', corte, { sinEspejo: true })) fallos++;
            cortes++;
            for (const r of a.recogidas) {
                for (const [k, n] of (r.incompletos || []).entries()) {
                    const inc = { id: `rgi-${r.id}-${k}`, fecha, ubicacion: 'Por ubicar', bloque: r.bloque, variedad: r.variedad, grado: 'Por clasificar', tallosActuales: n, tallosMeta: r.tallosPorTabaco, cortador: r.cortadora };
                    if (!await D.guardar('incompletos', inc, { sinEspejo: true })) fallos++;
                    incompletos++;
                }
            }
        }
        jornada.cerrada = true;
        jornada.cierre = D.ahora();
        await D.guardar('jornadas', jornada);
        await cargar();
        aviso(`Jornada cerrada. Se crearon ${cortes} cortes y ${incompletos} incompletos.` + (fallos ? ` ${fallos} no llegaron al servidor y quedaron pendientes en este equipo.` : ''), 'ok');
    }

    // ---------- Eventos ----------
    $('ev-fecha').addEventListener('change', e => { fecha = e.target.value || D.hoy(); cargar(); });
    $('ev-btn-jornada').onclick = abrirJornada;
    $('ev-btn-metas').onclick = abrirMetas;
    $('ev-cerrar').onclick = cerrarJornada;
    document.addEventListener('click', e => { const b = e.target.closest('[data-cerrar]'); if (b) $(b.dataset.cerrar).classList.add('ev-oculto'); });
    setInterval(() => {
        const abierto = [...document.querySelectorAll('.ev-modal')].some(m => !m.classList.contains('ev-oculto'));
        if (fecha === D.hoy() && !abierto) cargar();
    }, 30000);
    cargar();
})();
