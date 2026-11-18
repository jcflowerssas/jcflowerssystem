// Acceso a datos de Recogida y En vivo: servidor, con copia local si no hay señal.
(function () {
    const H = { 'Content-Type': 'application/json' };
    const pad = n => String(n).padStart(2, '0');
    const leerLocal = n => { try { return JSON.parse(localStorage.getItem('app_' + n) || '[]'); } catch (e) { return []; } };
    const escribirLocal = (n, l) => localStorage.setItem('app_' + n, JSON.stringify(l));
    const unicos = l => Array.from(new Map(l.map(i => [String(i.id), i])).values());
    const enviar = async (url, op) => { try { return (await fetch(url, op)).ok; } catch (e) { return false; } };
    const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const ahora = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

    // ok, sin-ruta (el servidor aún no tiene esa parte), sin-conexion o error
    const estado = {};

    // Lo que quedó pendiente de enviar en este equipo se conserva junto a lo del servidor
    async function leer(nombre) {
        try {
            const r = await fetch('/api/' + nombre);
            if (r.ok) {
                let d = null;
                try { d = await r.json(); } catch (e) { d = null; }
                if (Array.isArray(d)) {
                    estado[nombre] = 'ok';
                    const ids = new Set(d.map(x => String(x.id)));
                    const pend = leerLocal(nombre).filter(x => x.pendiente && !ids.has(String(x.id)));
                    const todo = unicos([...d, ...pend]);
                    escribirLocal(nombre, todo);
                    return todo;
                }
                estado[nombre] = 'sin-ruta';       // el servidor devolvió una página en vez de datos
            } else {
                estado[nombre] = r.status === 404 ? 'sin-ruta' : 'error';
            }
        } catch (e) { estado[nombre] = 'sin-conexion'; }
        return unicos(leerLocal(nombre));
    }

    async function guardar(nombre, reg, opciones = {}) {
        const ok = await enviar('/api/' + nombre, { method: 'POST', headers: H, body: JSON.stringify(reg) });
        if (ok && opciones.sinEspejo) return true;
        const lista = leerLocal(nombre).filter(x => String(x.id) !== String(reg.id));
        lista.unshift(ok ? reg : { ...reg, pendiente: true });
        escribirLocal(nombre, lista);
        return ok;
    }

    async function borrar(nombre, id) {
        escribirLocal(nombre, leerLocal(nombre).filter(x => String(x.id) !== String(id)));
        return enviar(`/api/${nombre}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    const pendientes = nombre => leerLocal(nombre).filter(x => x.pendiente).length;

    async function sincronizar(nombre) {
        let enviados = 0;
        for (const r of leerLocal(nombre).filter(x => x.pendiente)) {
            const { pendiente, ...limpio } = r;
            if (await guardar(nombre, limpio)) enviados++;
        }
        return enviados;
    }

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = n => Math.round(Number(n) || 0).toLocaleString('es-CO');

    const MODULO = ['jornadas', 'recogidas', 'eventos', 'metas'];
    async function sincronizarTodo(nombres = MODULO) {
        let n = 0;
        for (const x of nombres) n += await sincronizar(x);
        return n;
    }
    const pendientesTodo = (nombres = MODULO) => nombres.reduce((s, x) => s + pendientes(x), 0);

    // Texto para avisar cuando lo que se guarda no está llegando al servidor
    function avisoServidor(nombres = MODULO) {
        const malas = nombres.filter(n => estado[n] && estado[n] !== 'ok');
        if (!malas.length) return '';
        const faltan = malas.filter(n => estado[n] === 'sin-ruta');
        if (faltan.length) return `Al servidor le faltan estas partes: ${faltan.join(', ')}. Hay que subir el server.js más reciente a la carpeta principal del proyecto en Railway. Mientras tanto, lo que registres aquí solo se ve en este equipo.`;
        return 'Sin conexión con el servidor. Lo que registres se enviará cuando vuelva la señal.';
    }

    window.DATOS = { leer, guardar, borrar, sincronizar, sincronizarTodo, pendientes, pendientesTodo, avisoServidor, estado, hoy, ahora, esc, num };
})();
