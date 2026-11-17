// Comprueba qué partes del servidor responden y permiten guardar.
(function () {
    const PARTES = [
        ['entradas', 'Entradas', false], ['salidas', 'Salidas', false], ['cortes', 'Cortes', false], ['configuracion', 'Configuración', false],
        ['clientes', 'Clientes', true], ['remisiones', 'Remisiones', true], ['incompletos', 'Incompletos', true],
        ['jornadas', 'Jornadas (En vivo)', true], ['recogidas', 'Recogidas', true], ['eventos', 'Cambios y hora en que terminó', true], ['metas', 'Metas y horario', true]
    ];
    const $ = id => document.getElementById(id);

    async function leer(n) {
        try {
            const r = await fetch('/api/' + n);
            if (!r.ok) return { ok: false, txt: 'responde ' + r.status };
            const t = await r.text();
            try { const d = JSON.parse(t); return { ok: true, txt: Array.isArray(d) ? d.length + ' registros' : 'responde' }; }
            catch (e) { return { ok: false, txt: 'devuelve una página en vez de datos: esa parte no existe en el servidor' }; }
        } catch (e) { return { ok: false, txt: 'sin conexión' }; }
    }

    async function escribir(n) {
        const id = '__prueba__';
        try {
            const r = await fetch('/api/' + n, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, prueba: true }) });
            if (!r.ok) return { ok: false, txt: 'no permite guardar (responde ' + r.status + ')' };
            const d = await fetch(`/api/${n}/${id}`, { method: 'DELETE' });
            return d.ok ? { ok: true, txt: 'guarda y borra bien' } : { ok: false, txt: 'guarda, pero no borra (responde ' + d.status + ')' };
        } catch (e) { return { ok: false, txt: 'sin conexión' }; }
    }

    const celda = r => r ? `<span class="${r.ok ? 'si' : 'no'}">${r.ok ? '✓' : '✗'}</span><span class="peq">${r.txt}</span>` : '<span class="peq">No aplica</span>';

    async function probar() {
        $('dg-res').className = 'dg-res'; $('dg-res').textContent = 'Probando...';
        const filas = [];
        for (const [n, nombre, conEscritura] of PARTES) {
            const l = await leer(n), e = conEscritura && l.ok ? await escribir(n) : (conEscritura ? { ok: false, txt: 'no se probó: no se puede leer' } : null);
            filas.push({ n, nombre, l, e });
        }
        $('dg-filas').innerHTML = filas.map(f => `<tr><td>${f.nombre}<span class="peq">/api/${f.n}</span></td><td>${celda(f.l)}</td><td>${celda(f.e)}</td></tr>`).join('');
        const malas = filas.filter(f => !f.l.ok || (f.e && !f.e.ok)).map(f => f.nombre);
        $('dg-res').className = 'dg-res ' + (malas.length ? 'mal' : 'ok');
        $('dg-res').textContent = malas.length
            ? `Hay partes que no responden: ${malas.join(', ')}. Sube el server.js más reciente a la carpeta principal del proyecto (no a public) y vuelve a publicar en Railway.`
            : 'Todo en orden: el servidor responde y guarda en todas sus partes.';
    }
    $('dg-probar').onclick = probar;
    probar();
})();
