// Pantalla del patinador: registra los tabacos que recoge de cada mesa, lo que corta cada una y cuándo termina.
(function () {
    const D = window.DATOS, K = window.CALCULO, esc = D.esc, num = D.num;
    const $ = id => document.getElementById(id);

    let jornada = null, recogidas = [], eventos = [], metas = {}, listas = null, hoja = null;
    let borrador = { final: false, c: {} };        // lo que lleva en esta ronda; se guarda en el teléfono
    const claveBorrador = () => 'rg_borrador_v2_' + D.hoy();

    const tpt = corte => (corte === 'rojo' ? Number(metas.tptRojo) || 40 : Number(metas.tptColor) || 25);
    const nombreCorte = c => (c === 'rojo' ? 'Rojo' : 'Color');
    const colorCorte = c => (c === 'rojo' ? '#c62839' : '#a5864c');
    const esRojo = v => /freedom/i.test(v || '');
    const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const restarMin = (hhmm, m) => { const t = Math.max(0, K.aMin(hhmm) - m); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
    const cortadoras = () => [...jornada.cortadoras].sort((a, b) => (Number(a.mesa) || 99) - (Number(b.mesa) || 99));
    const idTile = c => 't-' + jornada.cortadoras.indexOf(c);
    const mismoFrente = (l, f) => l.corte === f.corte && l.variedad === f.variedad && l.bloque === f.bloque;

    function leerBorrador() {
        try { borrador = JSON.parse(localStorage.getItem(claveBorrador())) || borrador; } catch (e) { /* borrador nuevo */ }
        borrador.c = borrador.c || {};
    }
    const guardarBorrador = () => localStorage.setItem(claveBorrador(), JSON.stringify(borrador));
    const estadoDe = c => (borrador.c[c.nombre] = borrador.c[c.nombre] || { lineas: [], inc: [] });
    const finDe = c => eventos.find(e => e.evento === 'fin' && e.cortadora === c.nombre);
    function activa(c) {
        const f = K.frenteActual(c, eventos), s = estadoDe(c);
        return { f, linea: [...s.lineas].reverse().find(l => mismoFrente(l, f)) || null };
    }

    function aviso(texto, tipo, segundos) {
        $('rg-aviso').innerHTML = texto ? `<div class="rg-aviso ${tipo || 'info'}">${texto}</div>` : '';
        if (texto && segundos) setTimeout(() => { if ($('rg-aviso').innerHTML.includes(texto)) $('rg-aviso').innerHTML = ''; }, segundos * 1000);
    }

    // ---------- Mesas ----------
    function htmlTile(c) {
        const s = estadoDe(c), { f, linea } = activa(c), fin = finDe(c), t = tpt(f.corte);
        const n = linea ? linea.n : 0;
        const otras = s.lineas.map((l, k) => ({ l, k })).filter(x => x.l !== linea && x.l.n > 0);
        const activo = s.lineas.some(l => l.n > 0) || s.inc.length;
        const inc = borrador.final ? `
            <div class="rg-inc">
                <div class="rg-inc-t">Incompletos (${nombreCorte(f.corte).toLowerCase()})</div>
                <div class="rg-chips">${s.inc.map((v, k) => `<button type="button" class="rg-chip" data-a="inc-del" data-n="${esc(c.nombre)}" data-k="${k}" aria-label="Quitar incompleto de ${v} tallos">${v} tallos ✕</button>`).join('')}</div>
                <div class="rg-inc-f">
                    <input type="number" inputmode="numeric" min="1" max="${t - 1}" placeholder="tallos" class="rg-inc-in" id="${idTile(c)}-in" aria-label="Tallos del incompleto de ${esc(c.nombre)}">
                    <button type="button" class="rg-inc-b" data-a="inc-add" data-n="${esc(c.nombre)}">Agregar</button>
                </div>
            </div>` : '';
        return `<div class="rg-tile${activo ? ' on' : ''}" id="${idTile(c)}">
            <div class="rg-mesa">Mesa ${esc(c.mesa)}</div>
            <div class="rg-nombre">${esc(c.nombre)}</div>
            <button type="button" class="rg-frente" data-a="frente" data-n="${esc(c.nombre)}" aria-label="Cambiar lo que corta ${esc(c.nombre)}">
                <span class="rg-punto" style="background:${colorCorte(f.corte)}"></span>
                <span>${nombreCorte(f.corte)}, ${esc(f.variedad || 'sin variedad')}, ${esc(f.bloque || 'sin bloque')}</span>
            </button>
            <div class="rg-cuenta">${n}</div>
            <div class="rg-hora">${linea && linea.hora ? `tabacos x${t}, a las ${linea.hora}` : `tabacos x${t}`}</div>
            ${otras.length ? `<div class="rg-otras">${otras.map(x => `<button type="button" class="rg-chip peq" data-a="lin-del" data-n="${esc(c.nombre)}" data-k="${x.k}" aria-label="Quitar ${x.l.n} tabacos">${nombreCorte(x.l.corte)} ${x.l.n} ✕</button>`).join('')}</div>` : ''}
            <div class="rg-bots">
                <button type="button" class="rg-btn" data-a="menos" data-n="${esc(c.nombre)}" aria-label="Quitar un tabaco a ${esc(c.nombre)}">−</button>
                <button type="button" class="rg-btn mas" data-a="mas" data-n="${esc(c.nombre)}" aria-label="Sumar un tabaco a ${esc(c.nombre)}">+</button>
            </div>
            <button type="button" class="rg-fin ${fin ? 'listo' : borrador.final ? 'falta' : ''}" data-a="fin" data-n="${esc(c.nombre)}">${fin ? 'Terminó a las ' + esc(fin.hora) + ' (cambiar)' : 'Terminó de cortar'}</button>${inc}
        </div>`;
    }

    function totales() {
        let cortadorasN = 0, tabacos = 0, tallos = 0, inc = 0;
        jornada.cortadoras.forEach(c => {
            const s = estadoDe(c), n = s.lineas.reduce((a, l) => a + l.n, 0);
            if (n > 0 || s.inc.length) cortadorasN++;
            tabacos += n; tallos += s.lineas.reduce((a, l) => a + l.n * tpt(l.corte), 0); inc += s.inc.length;
        });
        return { cortadorasN, tabacos, tallos, inc };
    }

    function pintarResumen() {
        const t = totales();
        $('rg-resumen').innerHTML = `<b>${t.cortadorasN}</b> cortadoras, <b>${num(t.tabacos)}</b> tabacos, <b>${num(t.tallos)}</b> tallos` + (borrador.final ? `, <b>${t.inc}</b> incompletos` : '');
        $('rg-guardar').textContent = borrador.final ? 'Guardar recogida final' : 'Guardar recogida';
    }

    function pintarCabecera() {
        const ronda = Math.max(0, ...recogidas.map(r => r.ronda || 0)) + 1;
        const ultima = recogidas.map(r => r.hora).sort().pop();
        $('rg-titulo').textContent = borrador.final ? 'Recogida final' : 'Recogida ' + ronda;
        $('rg-sub').textContent = ultima ? 'La anterior se guardó a las ' + ultima : 'Aún no hay recogidas hoy';
        $('rg-reloj').textContent = D.ahora();
        $('rg-final').checked = !!borrador.final;
    }

    function pintar() {
        if (!jornada) {
            $('rg-panel').classList.add('rg-oculto');
            aviso('El supervisor aún no abrió la jornada de hoy. Se abre en <a href="envivo.html" style="font-weight:700;text-decoration:underline">En vivo</a>.', 'info');
            return;
        }
        if (jornada.cerrada) {
            $('rg-panel').classList.add('rg-oculto');
            aviso('La jornada de hoy ya está cerrada.', 'info');
            return;
        }
        $('rg-panel').classList.remove('rg-oculto');
        $('rg-tiles').innerHTML = cortadoras().map(htmlTile).join('');
        pintarCabecera();
        pintarResumen();
    }

    function repintarTile(c) {
        const el = $(idTile(c));
        if (el) el.outerHTML = htmlTile(c);
        pintarResumen();
        guardarBorrador();
    }

    // ---------- Toques en las mesas ----------
    $('rg-tiles').addEventListener('click', e => {
        const b = e.target.closest('button[data-a]');
        if (!b) return;
        const c = jornada.cortadoras.find(x => x.nombre === b.dataset.n);
        if (!c) return;
        const s = estadoDe(c), a = b.dataset.a;
        if (a === 'frente') return abrirFrente(c);
        if (a === 'fin') return abrirFin(c);
        const { f, linea } = activa(c);
        if (a === 'mas') {
            const l = linea || (s.lineas.push({ corte: f.corte, variedad: f.variedad, bloque: f.bloque, n: 0, hora: '' }), s.lineas[s.lineas.length - 1]);
            l.n++; l.hora = D.ahora();
        }
        if (a === 'menos' && linea) { linea.n--; if (linea.n <= 0) s.lineas.splice(s.lineas.indexOf(linea), 1); }
        if (a === 'lin-del') s.lineas.splice(Number(b.dataset.k), 1);
        if (a === 'inc-del') s.inc.splice(Number(b.dataset.k), 1);
        if (a === 'inc-add') {
            const entrada = $(idTile(c) + '-in'), v = parseInt(entrada.value), t = tpt(f.corte);
            if (!(v >= 1 && v < t)) { entrada.style.borderColor = '#a3304a'; entrada.focus(); aviso(`Un incompleto de ${nombreCorte(f.corte).toLowerCase()} tiene entre 1 y ${t - 1} tallos.`, 'mal', 4); return; }
            s.inc.push(v);
        }
        repintarTile(c);
        if (a === 'inc-add') { const i = $(idTile(c) + '-in'); if (i) i.focus(); }
    });

    $('rg-final').addEventListener('change', e => {
        borrador.final = e.target.checked;
        guardarBorrador();
        $('rg-tiles').innerHTML = cortadoras().map(htmlTile).join('');
        pintarCabecera();
        pintarResumen();
    });

    // ---------- Hojas: cambiar lo que corta / hora en que terminó ----------
    async function cargarListas() {
        if (!listas) listas = typeof obtenerListasConfiguracion === 'function' ? await obtenerListasConfiguracion() : {};
        return listas;
    }
    const opciones = (lista, sel) => (lista || []).map(v => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');

    function llenarVariedades(corte, sel) {
        const todas = listas.variedades || [];
        let l = todas.filter(v => esRojo(v) === (corte === 'rojo'));
        if (!l.length) l = corte === 'rojo' ? ['Freedom (Rojo)'] : todas;
        $('sh-var').innerHTML = opciones(l, l.includes(sel) ? sel : l[0]);
    }

    function mostrarHoja(titulo, cuerpo, pie) {
        $('sh-titulo').textContent = titulo;
        $('sh-cuerpo').innerHTML = cuerpo;
        $('sh-pie').innerHTML = pie;
        $('rg-sheet').classList.remove('rg-oculto');
    }
    const cerrarHoja = () => { $('rg-sheet').classList.add('rg-oculto'); hoja = null; };

    async function abrirFrente(c) {
        await cargarListas();
        const f = K.frenteActual(c, eventos);
        hoja = { modo: 'frente', c, corte: f.corte };
        mostrarHoja(`Qué corta ${c.nombre} ahora`, `
            <div class="sh-seg"><button type="button" data-corte="color" class="${f.corte === 'color' ? 'act' : ''}">Color</button><button type="button" data-corte="rojo" class="${f.corte === 'rojo' ? 'act' : ''}">Rojo</button></div>
            <label for="sh-var">Variedad</label><select id="sh-var"></select>
            <label for="sh-blo">Bloque de donde recoges</label><select id="sh-blo">${opciones(listas.bloques, f.bloque)}</select>
            <label for="sh-hora">Desde las</label><input type="time" id="sh-hora" value="${D.ahora()}">`,
            `<button type="button" data-h="cancelar">Cancelar</button><button type="button" class="pri" data-h="guardar">Guardar</button>`);
        llenarVariedades(f.corte, f.variedad);
    }

    function abrirFin(c) {
        const fin = finDe(c);
        hoja = { modo: 'fin', c };
        mostrarHoja(`Terminó de cortar ${c.nombre}`, `
            <label for="sh-hora">Hora en que terminó</label><input type="time" id="sh-hora" value="${fin ? fin.hora : D.ahora()}">
            <div class="sh-rap"><button type="button" data-min="0">Ahora</button><button type="button" data-min="5">Hace 5 min</button><button type="button" data-min="10">Hace 10 min</button><button type="button" data-min="20">Hace 20 min</button></div>`,
            `<button type="button" data-h="cancelar">Cancelar</button>${fin ? '<button type="button" class="pel" data-h="quitar">Quitar</button>' : ''}<button type="button" class="pri" data-h="guardar">Guardar</button>`);
    }

    $('rg-sheet').addEventListener('click', async e => {
        if (e.target === $('rg-sheet')) return cerrarHoja();
        const seg = e.target.closest('[data-corte]');
        if (seg && hoja) {
            hoja.corte = seg.dataset.corte;
            document.querySelectorAll('.sh-seg button').forEach(b => b.classList.toggle('act', b === seg));
            llenarVariedades(hoja.corte, '');
            return;
        }
        const rap = e.target.closest('[data-min]');
        if (rap) { $('sh-hora').value = restarMin(D.ahora(), Number(rap.dataset.min)); return; }
        const acc = e.target.closest('[data-h]');
        if (!acc || !hoja) return;
        const { modo, c } = hoja;
        if (acc.dataset.h === 'cancelar') return cerrarHoja();
        if (acc.dataset.h === 'quitar') {
            const fin = finDe(c);
            if (fin) { eventos = eventos.filter(x => x.id !== fin.id); await D.borrar('eventos', fin.id); }
        }
        if (acc.dataset.h === 'guardar') {
            const hora = $('sh-hora').value;
            if (!hora) { aviso('Escribe la hora.', 'mal', 4); return; }
            if (modo === 'frente') {
                const ev = { id: `fr-${Date.now()}`, fecha: D.hoy(), cortadora: c.nombre, hora, evento: 'frente', corte: hoja.corte, variedad: $('sh-var').value, bloque: $('sh-blo').value };
                if (!ev.variedad || !ev.bloque) { aviso('Elige variedad y bloque.', 'mal', 4); return; }
                eventos.push(ev); await D.guardar('eventos', ev);
            } else {
                const ev = { id: `fin-${D.hoy()}-${slug(c.nombre)}`, fecha: D.hoy(), cortadora: c.nombre, hora, evento: 'fin' };
                eventos = eventos.filter(x => x.id !== ev.id); eventos.push(ev); await D.guardar('eventos', ev);
            }
        }
        cerrarHoja();
        repintarTile(c);
    });

    // ---------- Guardar la recogida ----------
    $('rg-guardar').addEventListener('click', async () => {
        const con = jornada.cortadoras.filter(c => estadoDe(c).lineas.some(l => l.n > 0) || estadoDe(c).inc.length);
        if (!con.length) { aviso('Toca + en las cortadoras de las que recogiste tabacos.', 'mal', 5); return; }
        const boton = $('rg-guardar');
        boton.disabled = true;
        const ronda = Math.max(0, ...recogidas.map(r => r.ronda || 0)) + 1;
        const base = Date.now(), final = !!borrador.final;
        let sinEnviar = 0, tabacos = 0, k = 0;
        for (const c of con) {
            const s = estadoDe(c), f = K.frenteActual(c, eventos);
            const lineas = s.lineas.filter(l => l.n > 0);
            const registros = lineas.map(l => ({
                id: `${base}${k++}`, fecha: D.hoy(), ronda, tipo: final ? 'final' : 'normal', hora: l.hora || D.ahora(),
                cortadora: c.nombre, mesa: c.mesa, etiqueta: c.etiqueta, corte: l.corte, variedad: l.variedad, bloque: l.bloque,
                tabacos: l.n, tallosPorTabaco: tpt(l.corte), tallos: l.n * tpt(l.corte), incompletos: []
            }));
            if (final && s.inc.length) {      // los incompletos van con lo que estaba cortando al terminar
                let r = [...registros].reverse().find(x => x.corte === f.corte && x.variedad === f.variedad && x.bloque === f.bloque);
                if (!r) { r = { id: `${base}${k++}`, fecha: D.hoy(), ronda, tipo: 'final', hora: D.ahora(), cortadora: c.nombre, mesa: c.mesa, etiqueta: c.etiqueta, corte: f.corte, variedad: f.variedad, bloque: f.bloque, tabacos: 0, tallosPorTabaco: tpt(f.corte), tallos: 0, incompletos: [] }; registros.push(r); }
                r.incompletos = [...s.inc];
            }
            for (const r of registros) { tabacos += r.tabacos; if (!await D.guardar('recogidas', r)) sinEnviar++; recogidas.push(r); }
        }
        borrador = { final: false, c: {} };
        guardarBorrador();
        boton.disabled = false;
        pintar();
        const sinFin = final ? con.filter(c => !finDe(c)).map(c => c.nombre) : [];
        aviso(`${final ? 'Recogida final' : 'Recogida ' + ronda} guardada: ${con.length} cortadoras, ${num(tabacos)} tabacos.` +
            (sinFin.length ? ` Falta anotar a qué hora terminó de cortar: ${sinFin.map(esc).join(', ')}.` : '') +
            (sinEnviar ? ' Quedó pendiente de enviar por falta de señal.' : ''), sinEnviar || sinFin.length ? 'info' : 'ok', 12);
    });

    async function cargar() {
        await D.sincronizarTodo();
        const jornadas = await D.leer('jornadas');
        jornada = jornadas.find(j => j.id === D.hoy()) || null;
        recogidas = (await D.leer('recogidas')).filter(r => r.fecha === D.hoy());
        eventos = (await D.leer('eventos')).filter(e => e.fecha === D.hoy());
        metas = (await D.leer('metas')).find(m => m.id === 'config') || {};
        leerBorrador();
        pintar();
        pintarConexion();
    }

    // Avisa si lo que se guarda no está llegando al servidor (los demás teléfonos no lo verían)
    function pintarConexion() {
        const texto = D.avisoServidor(), pend = D.pendientesTodo();
        $('rg-conex').innerHTML = (texto || pend)
            ? `<div class="rg-aviso mal">${texto ? texto + ' ' : ''}${pend ? `${pend} registro${pend > 1 ? 's' : ''} sin enviar. ` : ''}<button type="button" id="rg-reintentar" style="font-weight:700;text-decoration:underline">Reintentar</button> <a href="diagnostico.html" style="font-weight:700;text-decoration:underline;margin-left:8px">Ver detalle</a></div>` : '';
    }
    document.addEventListener('click', e => { if (e.target.id === 'rg-reintentar') cargar(); });

    window.addEventListener('online', () => cargar());
    setInterval(() => { if (jornada && $('rg-reloj')) $('rg-reloj').textContent = D.ahora(); }, 20000);
    cargar();
})();
