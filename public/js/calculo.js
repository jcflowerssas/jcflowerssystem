// Cálculo de rendimientos por cortadora. Sin acceso a pantalla ni a datos: solo operaciones.
(function (raiz) {
    const aMin = h => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };

    // Minutos entre dos horas sin contar las pausas
    function minNetos(desde, hasta, pausas) {
        let t = hasta - desde;
        (pausas || []).forEach(p => {
            const a = Math.max(desde, aMin(p.desde)), b = Math.min(hasta, aMin(p.hasta));
            if (b > a) t -= (b - a);
        });
        return Math.max(0, t);
    }

    // Tipo de corte de una recogida (las antiguas no lo traen: se deduce de la variedad)
    const corteDe = r => r.corte || (/freedom/i.test(r.variedad || '') ? 'rojo' : 'color');
    // Las metas se guardan como colores (color) y freedom (rojo)
    const metaDe = (metas, corte) => { const n = Number(corte === 'rojo' ? metas.freedom : metas.colores); return n > 0 ? n : null; };

    // En qué está cortando ahora: el último cambio que anotó el patinador, o lo asignado al abrir la jornada
    function frenteActual(c, eventos) {
        const ev = (eventos || []).filter(e => e.cortadora === c.nombre && e.evento === 'frente')
            .sort((a, b) => aMin(a.hora) - aMin(b.hora) || String(a.id).localeCompare(String(b.id))).pop();
        return ev ? { corte: ev.corte, variedad: ev.variedad, bloque: ev.bloque, desde: ev.hora }
                  : { corte: c.corte || 'color', variedad: c.variedad, bloque: c.bloque, desde: null };
    }

    // Tramos de tiempo [desde, hasta] con el tipo de corte de cada uno
    function tramos(c, eventos, inicio, fin) {
        const ev = (eventos || []).filter(e => e.cortadora === c.nombre && e.evento === 'frente').sort((a, b) => aMin(a.hora) - aMin(b.hora));
        let corte = c.corte || 'color', desde = inicio;
        const t = [];
        ev.forEach(e => {
            const h = Math.min(Math.max(aMin(e.hora), inicio), fin);
            if (h > desde) { t.push({ desde, hasta: h, corte }); desde = h; }
            corte = e.corte;
        });
        if (fin > desde) t.push({ desde, hasta: fin, corte });
        return t;
    }

    // Rendimiento de una cortadora: tallos por hora desde que empieza hasta su última recogida
    // (o hasta la hora en que terminó de cortar, si el patinador la anotó)
    function analizar(c, recogidas, eventos, jornada, metas, ahoraMin, esHoy) {
        metas = metas || {};
        const recs = recogidas.filter(r => r.cortadora === c.nombre)
            .sort((a, b) => aMin(a.hora) - aMin(b.hora) || String(a.id).localeCompare(String(b.id)));
        const inicio = aMin(c.inicio || jornada.inicio || '06:00');
        const pausas = jornada.pausas || [];
        const fin = (eventos || []).filter(e => e.cortadora === c.nombre && e.evento === 'fin').sort((a, b) => aMin(b.hora) - aMin(a.hora))[0] || null;
        const ultima = recs.length ? recs[recs.length - 1].hora : null;
        const hasta = fin ? aMin(fin.hora) : ultima ? aMin(ultima) : null;

        let tallos = 0, tabacos = 0, incompletos = 0;
        const porCorte = { color: { tabacos: 0, tallos: 0 }, rojo: { tabacos: 0, tallos: 0 } };
        const serie = [];
        recs.forEach(r => {
            tallos += r.tallos || 0; tabacos += r.tabacos || 0; incompletos += (r.incompletos || []).length;
            const k = porCorte[corteDe(r)]; k.tabacos += r.tabacos || 0; k.tallos += r.tallos || 0;
            const m = minNetos(inicio, aMin(r.hora), pausas);
            if (m >= 10) serie.push(tallos / (m / 60));       // cómo va cambiando su promedio con cada recogida
        });

        const minTrab = hasta !== null ? minNetos(inicio, hasta, pausas) : 0;
        const promedio = minTrab >= 10 ? tallos / (minTrab / 60) : null;

        // Meta esperada: pondera la meta de cada tipo por el tiempo que estuvo en él
        const minCorte = { color: 0, rojo: 0 };
        if (hasta !== null) tramos(c, eventos, inicio, hasta).forEach(t => { minCorte[t.corte] += minNetos(t.desde, t.hasta, pausas); });
        let suma = 0, peso = 0;
        ['color', 'rojo'].forEach(k => { const m = metaDe(metas, k); if (m && minCorte[k] > 0) { suma += m * minCorte[k]; peso += minCorte[k]; } });
        const meta = peso > 0 ? suma / peso : null;
        const pct = meta && promedio !== null ? promedio / meta * 100 : null;

        // Semáforo sobre el promedio, con un mínimo de tiempo para no juzgar muy temprano
        const verde = Number(metas.verde) || 100, ambar = Number(metas.ambar) || 85, minJuzgar = Number(metas.minJuzgar) || 30;
        let estado = 'n';
        if (pct !== null && minTrab >= minJuzgar) estado = pct >= verde ? 'v' : pct >= ambar ? 'a' : 'r';

        // Tendencia: lo recogido desde la recogida anterior a la última hora, frente a su promedio.
        // La ventana arranca en una recogida real (no en "hace 60 minutos") para no inflar el ritmo.
        let ultimaHora = null, tendencia = null;
        if (ultima && !fin) {
            const u = aMin(ultima);
            const previas = recs.filter(r => aMin(r.hora) <= u - 60);
            const p0 = previas.length ? aMin(previas[previas.length - 1].hora) : inicio;
            const mw = minNetos(p0, u, pausas);
            if (mw >= 30) {
                ultimaHora = recs.filter(r => aMin(r.hora) > p0 && aMin(r.hora) <= u).reduce((x, r) => x + (r.tallos || 0), 0) / (mw / 60);
                if (promedio && minTrab >= 90) { const q = ultimaHora / promedio; tendencia = q < 0.85 ? 'baja' : q > 1.15 ? 'sube' : null; }
            }
        }

        const alerta = Number(metas.alertaMin) || 75;
        const minDesde = ultima ? Math.max(0, ahoraMin - aMin(ultima)) : null;
        const sinRecogida = !!esHoy && !jornada.cerrada && !fin && ahoraMin >= inicio &&
            (ultima ? minNetos(aMin(ultima), ahoraMin, pausas) > alerta : minNetos(inicio, ahoraMin, pausas) > alerta);

        return {
            cortadora: c, recogidas: recs, tallos, tabacos, incompletos, porCorte, ultima, minDesde, fin: fin ? fin.hora : null,
            minTrabajados: minTrab, promedio, ritmo: promedio, meta, pct, estado, serie, ultimaHora, tendencia, sinRecogida,
            frente: frenteActual(c, eventos)
        };
    }

    const estadoFinal = a => (a.estado === 'r' ? 'r' : a.sinRecogida ? 'g' : a.estado);
    const ORDEN = { r: 0, g: 1, a: 2, n: 3, v: 4 };

    function resumenGrupo(analisis, jornada, ahoraMin, esHoy) {
        const tallos = analisis.reduce((s, a) => s + a.tallos, 0);
        const ritmoGrupo = analisis.reduce((s, a) => s + (a.promedio || 0), 0);
        const atencion = analisis.filter(a => ['r', 'g'].includes(estadoFinal(a))).length;
        const finJ = jornada.fin ? aMin(jornada.fin) : null;
        let proyeccion = null;
        if (esHoy && !jornada.cerrada && finJ && finJ > ahoraMin) {
            const activos = analisis.filter(a => !a.fin).reduce((s, a) => s + (a.promedio || 0), 0);
            if (activos > 0) proyeccion = tallos + activos * (minNetos(ahoraMin, finJ, jornada.pausas) / 60);
        }
        return { tallos, ritmoGrupo, atencion, proyeccion };
    }

    raiz.CALCULO = { aMin, minNetos, corteDe, metaDe, frenteActual, tramos, analizar, estadoFinal, ORDEN, resumenGrupo };
    if (typeof module !== 'undefined') module.exports = raiz.CALCULO;
})(typeof window !== 'undefined' ? window : globalThis);
