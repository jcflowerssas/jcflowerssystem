// Resumen de inventario interactivo. inventario.js le entrega los datos (renderResumenInteractivo).
(function () {
    const GRADOS = [
        { k: 'g50', nombre: 'Grado 50', color: '#163827', filtro: 'Grado 50' },
        { k: 'g40', nombre: 'Grado 40', color: '#2c6d4d', filtro: 'Grado 40' },
        { k: 'nac', nombre: 'Nacional', color: '#a5864c', filtro: 'Nacional' },
        { k: 'dev', nombre: 'Devoluciones', color: '#a3304a', filtro: null }
    ];
    const TIPOS = [
        { id: 'rojo', nombre: 'Freedom (Rojo)', punto: '#c62839', filtro: 'freedom' },
        { id: 'color', nombre: 'Colores (otras variedades)', punto: '#a5864c', filtro: 'colores' }
    ];
    const INK = '#16211b', MUTED = '#61756b', LINEA = '#e3e9e5';

    let datos = null;
    let unidad = 'tallos';
    let filtro = null;

    const $ = id => document.getElementById(id);
    const nf = n => Math.round(Number(n) || 0).toLocaleString('es-CO');
    const otra = u => (u === 'tallos' ? 'tabacos' : 'tallos');
    const clave = (k, u) => `${k}_${u}`;
    const totalDe = (cat, u) => (u === 'tallos' ? cat.totalTallos : cat.totalTabacos);

    function inyectarEstilo() {
        if ($('estilo-resumen')) return;
        const s = document.createElement('style');
        s.id = 'estilo-resumen';
        s.textContent = `
            #resumen-interactivo button { font-family: inherit; }
            #resumen-interactivo .rs-seg { border: none; padding: 0; height: 100%; cursor: pointer; transition: filter .15s; }
            #resumen-interactivo .rs-seg:hover { filter: brightness(1.18); }
            #resumen-interactivo .rs-fila { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border: none; background: none; border-radius: 8px; cursor: pointer; text-align: left; color: ${INK}; font-size: 14px; }
            #resumen-interactivo .rs-fila:hover { background: #f1f5f2; }
            #resumen-interactivo .rs-fila.act { background: #e3efe8; }
            #resumen-interactivo .rs-tipo { border: none; background: none; padding: 0; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: ${INK}; text-align: left; }
            #resumen-interactivo .rs-tipo:hover { text-decoration: underline; }
            #resumen-interactivo .rs-tog { display: inline-flex; border: 1px solid ${LINEA}; border-radius: 10px; overflow: hidden; }
            #resumen-interactivo .rs-tog button { border: none; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: #fff; color: ${MUTED}; }
            #resumen-interactivo .rs-tog button.act { background: #163827; color: #fff; }
        `;
        document.head.appendChild(s);
    }

    function barra(cat, u) {
        const total = totalDe(cat, u);
        if (total <= 0) return `<div style="height:12px;border-radius:6px;background:#eef3ef"></div>`;
        const segs = GRADOS.filter(g => cat[clave(g.k, u)] > 0).map(g => {
            const v = cat[clave(g.k, u)];
            return `<button type="button" class="rs-seg" data-tipo="${cat._id}" data-grado="${g.k}" title="${g.nombre}: ${nf(v)} ${u}" aria-label="${g.nombre}: ${nf(v)} ${u}" style="width:${v / total * 100}%;background:${g.color}"></button>`;
        }).join('');
        return `<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px;background:#eef3ef">${segs}</div>`;
    }

    function filas(cat, u) {
        const total = totalDe(cat, u);
        return GRADOS.map(g => {
            const v = cat[clave(g.k, u)], o = cat[clave(g.k, otra(u))];
            const act = filtro && filtro.tipo === cat._id && filtro.grado === g.k;
            return `<button type="button" class="rs-fila${act ? ' act' : ''}" data-tipo="${cat._id}" data-grado="${g.k}">
                <span style="width:10px;height:10px;border-radius:2px;background:${g.color};flex:none"></span>
                <span style="flex:1">${g.nombre}</span>
                <span style="font-weight:700">${nf(v)} <span style="font-weight:400;color:${MUTED}">(${nf(o)})</span></span>
                <span style="width:40px;text-align:right;font-size:12px;color:${MUTED}">${total > 0 ? Math.round(v / total * 100) : 0}%</span>
            </button>`;
        }).join('');
    }

    function pintar() {
        const cont = $('resumen-interactivo');
        if (!cont || !datos) return;
        inyectarEstilo();
        const u = unidad;
        const rojo = { ...datos.rojo, _id: 'rojo' }, color = { ...datos.color, _id: 'color' };
        const general = { _id: 'todos', totalTallos: rojo.totalTallos + color.totalTallos, totalTabacos: rojo.totalTabacos + color.totalTabacos };
        GRADOS.forEach(g => ['tallos', 'tabacos'].forEach(x => { general[clave(g.k, x)] = rojo[clave(g.k, x)] + color[clave(g.k, x)]; }));

        const nombreFiltro = filtro ? [filtro.tipo === 'todos' ? 'Todo el inventario' : TIPOS.find(t => t.id === filtro.tipo).nombre, filtro.grado ? GRADOS.find(g => g.k === filtro.grado).nombre : ''].filter(Boolean).join(', ') : '';

        cont.innerHTML = `
        <div style="background:#fff;border:1px solid ${LINEA};border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(22,56,39,.06),0 4px 14px rgba(22,56,39,.05);color:${INK}">
            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px">
                <div>
                    <h2 style="font-size:18px;font-weight:700;margin:0">Resumen de inventario</h2>
                    <p style="margin:2px 0 0;font-size:13px;color:${MUTED}">Toca un grado o un tipo para filtrar la tabla de registros.</p>
                </div>
                <div class="rs-tog" role="group" aria-label="Unidad">
                    <button type="button" data-unidad="tallos" class="${u === 'tallos' ? 'act' : ''}">Tallos</button>
                    <button type="button" data-unidad="tabacos" class="${u === 'tabacos' ? 'act' : ''}">Tabacos</button>
                </div>
            </div>

            ${filtro ? `<div style="margin-top:12px;display:inline-flex;align-items:center;gap:8px;background:#e3efe8;color:#163827;border-radius:999px;padding:6px 8px 6px 14px;font-size:13px;font-weight:600">
                Filtrando: ${nombreFiltro}
                <button type="button" data-quitar="1" style="border:none;background:#163827;color:#fff;border-radius:999px;width:22px;height:22px;cursor:pointer;font-size:13px;line-height:1" aria-label="Quitar filtro">&times;</button></div>` : ''}

            <div style="margin-top:18px">
                <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
                    <span style="font-size:34px;font-weight:800;letter-spacing:-.5px">${nf(totalDe(general, u))}</span>
                    <span style="font-size:15px;color:${MUTED}">${u} (${nf(totalDe(general, otra(u)))} ${otra(u)})</span>
                </div>
                <div style="margin-top:10px">${barra(general, u)}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:10px">
                    ${GRADOS.map(g => `<button type="button" class="rs-fila" data-tipo="todos" data-grado="${g.k}" style="width:auto;padding:4px 6px;font-size:12px;color:#3b4740"><span style="width:10px;height:10px;border-radius:2px;background:${g.color}"></span>${g.nombre} ${nf(general[clave(g.k, u)])}</button>`).join('')}
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px;margin-top:20px">
                ${[[TIPOS[0], rojo], [TIPOS[1], color]].map(([t, cat]) => `
                <div style="border:1px solid ${LINEA};border-radius:12px;padding:14px">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
                        <button type="button" class="rs-tipo" data-tipo="${t.id}" data-grado=""><span style="width:12px;height:12px;border-radius:50%;background:${t.punto}"></span>${t.nombre}</button>
                        <span style="font-size:15px;font-weight:700">${nf(totalDe(cat, u))} <span style="font-weight:400;font-size:12px;color:${MUTED}">(${nf(totalDe(cat, otra(u)))})</span></span>
                    </div>
                    ${barra(cat, u)}
                    <div style="margin-top:8px">${filas(cat, u)}</div>
                </div>`).join('')}
            </div>
        </div>`;
    }

    function aplicarFiltro(tipo, grado) {
        const selTipo = $('filtro-clasificacion'), selGrado = $('filtro-grado'), buscar = $('input-buscar');
        if (!selTipo || !selGrado || !buscar) return;
        const t = TIPOS.find(x => x.id === tipo), g = GRADOS.find(x => x.k === grado);
        selTipo.value = t ? t.filtro : 'todos';
        selGrado.value = g && g.filtro ? g.filtro : 'todos';
        buscar.value = g && !g.filtro ? 'devol' : '';       // Devoluciones se filtra por texto
        selTipo.dispatchEvent(new Event('change'));        // la tabla lee los tres controles
        filtro = (t || g) ? { tipo: t ? tipo : 'todos', grado: g ? grado : '' } : null;
        pintar();
        const barraFiltros = $('barra-filtros');
        if (barraFiltros && filtro) barraFiltros.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.addEventListener('click', e => {
        const cont = $('resumen-interactivo');
        if (!cont || !cont.contains(e.target)) return;
        const u = e.target.closest('[data-unidad]');
        if (u) { unidad = u.dataset.unidad; pintar(); return; }
        if (e.target.closest('[data-quitar]')) { aplicarFiltro('', ''); return; }
        const f = e.target.closest('[data-tipo]');
        if (f) aplicarFiltro(f.dataset.tipo, f.dataset.grado);
    });

    window.renderResumenInteractivo = function (resumen) {
        datos = resumen;
        pintar();
    };
})();
