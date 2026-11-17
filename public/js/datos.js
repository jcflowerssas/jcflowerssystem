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

    // Lo que quedó pendiente de enviar en este equipo se conserva junto a lo del servidor
    async function leer(nombre) {
        try {
            const r = await fetch('/api/' + nombre);
            if (r.ok) {
                const d = await r.json();
                if (Array.isArray(d)) {
                    const ids = new Set(d.map(x => String(x.id)));
                    const pend = leerLocal(nombre).filter(x => x.pendiente && !ids.has(String(x.id)));
                    const todo = unicos([...d, ...pend]);
                    escribirLocal(nombre, todo);
                    return todo;
                }
            }
        } catch (e) { /* sin servidor: se usa la copia local */ }
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

    window.DATOS = { leer, guardar, borrar, sincronizar, pendientes, hoy, ahora, esc, num };
})();
