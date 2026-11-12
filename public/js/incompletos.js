let incompletos = [];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const porTexto = (a, b) => String(a || '').localeCompare(String(b || ''), 'es', { numeric: true });

function hoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Servidor + los que quedaron pendientes en este equipo (si el servidor no los recibió)
async function cargarIncompletos() {
    let servidor = [];
    try {
        const res = await fetch('/api/incompletos');
        if (res.ok) servidor = await res.json();
    } catch (err) {
        console.error('Error al cargar tabacos incompletos:', err);
    }
    const ids = new Set(servidor.map(i => String(i.id)));
    const locales = JSON.parse(localStorage.getItem('app_incompletos') || '[]').filter(i => !ids.has(String(i.id)));
    incompletos = [...servidor, ...locales];
    renderizarIncompletos();
}

document.addEventListener('DOMContentLoaded', cargarIncompletos);

function renderizarIncompletos() {
    const tbody = document.getElementById('tabla-incompletos-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (incompletos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-400">No hay tabacos incompletos registrados.</td></tr>`;
        return;
    }

    incompletos.forEach(item => {
        const faltantes = (Number(item.tallosMeta) || 0) - (Number(item.tallosActuales) || 0);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50/50 border-b';
        tr.innerHTML = `
            <td class="p-4 font-semibold text-amber-700">${esc(item.ubicacion)}</td>
            <td class="p-4 font-bold text-amber-900">${esc(item.bloque)}</td>
            <td class="p-4 font-medium">${esc(item.variedad)}</td>
            <td class="p-4"><span class="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs">${esc(item.grado)}</span></td>
            <td class="p-4 font-bold text-slate-800">${item.tallosActuales || 0} tallos</td>
            <td class="p-4 text-gray-600">${item.tallosMeta || 0} tallos</td>
            <td class="p-4 font-bold text-rose-600">Faltan ${faltantes} tallos</td>
            <td class="p-4 text-xs font-semibold text-slate-700">${esc(item.cortador || 'N/A')}</td>
            <td class="p-4 text-center">
                <button onclick="completarIncompleto('${esc(item.id)}')" class="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 font-bold">Completar Lote</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function completarIncompleto(id) {
    const item = incompletos.find(i => String(i.id) === String(id));
    if (!item) return;
    const faltantes = item.tallosMeta - item.tallosActuales;
    const abono = prompt(`¿Cuántos tallos llegaron hoy para completar ${item.variedad}? (Faltan ${faltantes})`, faltantes);
    if (abono === null) return;

    const cant = parseInt(abono) || 0;
    if (cant <= 0) return;
    item.tallosActuales += cant;

    if (item.tallosActuales >= item.tallosMeta) {
        // El tabaco completo entra al inventario por la misma ruta que las demás entradas
        const entrada = {
            id: String(Date.now()),
            fecha: hoyLocal(),
            ubicacion: item.ubicacion,
            bloque: item.bloque,
            variedad: item.variedad,
            tipo: String(item.variedad || '').toLowerCase().includes('freedom') ? 'Rojo' : 'Color',
            grado: item.grado,
            tabacos: 1,
            tallosPorTabaco: item.tallosMeta,
            totalTallos: item.tallosMeta
        };
        try {
            const res = await fetch('/api/entradas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entrada)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
        } catch (err) {
            alert('No se pudo pasar el tabaco al inventario. Sigue como incompleto; intenta de nuevo.');
            cargarIncompletos();
            return;
        }
        const entradasLocal = JSON.parse(localStorage.getItem('app_entradas') || '[]');
        entradasLocal.unshift(entrada);
        localStorage.setItem('app_entradas', JSON.stringify(entradasLocal));

        try { await fetch(`/api/incompletos/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); } catch (err) { /* puede estar solo en este equipo */ }
        const pendientes = JSON.parse(localStorage.getItem('app_incompletos') || '[]').filter(i => String(i.id) !== String(item.id));
        localStorage.setItem('app_incompletos', JSON.stringify(pendientes));
        alert('¡El tabaco ha quedado completo y se movió al inventario principal!');
    }
    cargarIncompletos();
}

// ---------- Informe para completar al día siguiente ----------
function datosInforme() {
    const resumen = {};
    incompletos.forEach(i => {
        const actuales = Number(i.tallosActuales) || 0;
        const faltan = Math.max(0, (Number(i.tallosMeta) || 0) - actuales);
        const k = `${i.variedad}|${i.grado}`;
        const r = resumen[k] = resumen[k] || { variedad: i.variedad, grado: i.grado, tabacos: 0, actuales: 0, faltan: 0 };
        r.tabacos++; r.actuales += actuales; r.faltan += faltan;
    });
    const filas = Object.values(resumen).sort((a, b) => porTexto(a.variedad, b.variedad) || porTexto(a.grado, b.grado));
    const detalle = [...incompletos].sort((a, b) => porTexto(a.ubicacion, b.ubicacion) || porTexto(a.variedad, b.variedad));
    const total = filas.reduce((t, r) => ({ tabacos: t.tabacos + r.tabacos, faltan: t.faltan + r.faltan }), { tabacos: 0, faltan: 0 });
    return { filas, detalle, total };
}

const faltanDe = i => Math.max(0, (Number(i.tallosMeta) || 0) - (Number(i.tallosActuales) || 0));
const fechaInforme = () => new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

window.abrirInformeIncompletos = function () {
    const { filas, detalle, total } = datosInforme();
    const area = document.getElementById('area-informe');
    if (!filas.length) {
        area.innerHTML = '<h3 class="text-lg font-bold text-amber-900">Informe para completar tabacos</h3><p class="text-sm text-slate-500">No hay tabacos incompletos pendientes.</p>';
    } else {
        const th = 'p-2 text-xs font-bold text-slate-600 text-left';
        area.innerHTML = `
            <div>
                <h3 class="text-xl font-bold text-amber-900">Informe para completar tabacos</h3>
                <p class="text-sm text-slate-500">${esc(fechaInforme())}</p>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                Hay <b>${total.tabacos}</b> tabaco${total.tabacos === 1 ? '' : 's'} incompleto${total.tabacos === 1 ? '' : 's'}. Para completarlos faltan <b>${total.faltan.toLocaleString()}</b> tallos.
            </div>
            <div>
                <p class="text-sm font-bold text-slate-700 mb-1">Qué hay que cortar, por variedad y grado</p>
                <table class="w-full text-sm border-collapse">
                    <thead><tr class="bg-slate-100 border-b"><th class="${th}">Variedad</th><th class="${th}">Grado</th><th class="${th}">Tabacos</th><th class="${th}">Tallos que faltan</th></tr></thead>
                    <tbody>${filas.map(r => `<tr class="border-b"><td class="p-2 font-bold">${esc(r.variedad)}</td><td class="p-2">${esc(r.grado)}</td><td class="p-2">${r.tabacos}</td><td class="p-2 font-extrabold text-rose-700">${r.faltan.toLocaleString()}</td></tr>`).join('')}</tbody>
                </table>
            </div>
            <div>
                <p class="text-sm font-bold text-slate-700 mb-1">Dónde está cada tabaco</p>
                <table class="w-full text-sm border-collapse">
                    <thead><tr class="bg-slate-100 border-b"><th class="${th}">Estiba</th><th class="${th}">Bloque</th><th class="${th}">Variedad</th><th class="${th}">Grado</th><th class="${th}">Tiene / Meta</th><th class="${th}">Faltan</th></tr></thead>
                    <tbody>${detalle.map(i => `<tr class="border-b"><td class="p-2 font-semibold">${esc(i.ubicacion)}</td><td class="p-2">${esc(i.bloque)}</td><td class="p-2">${esc(i.variedad)}</td><td class="p-2">${esc(i.grado)}</td><td class="p-2">${i.tallosActuales} / ${i.tallosMeta}</td><td class="p-2 font-bold text-rose-700">${faltanDe(i)}</td></tr>`).join('')}</tbody>
                </table>
            </div>`;
    }
    document.getElementById('modal-informe').classList.remove('hidden');
};

window.cerrarInforme = () => document.getElementById('modal-informe').classList.add('hidden');

window.copiarInforme = async function () {
    const { filas, detalle, total } = datosInforme();
    if (!filas.length) { alert('No hay tabacos incompletos pendientes.'); return; }
    const lineas = [
        `INFORME PARA COMPLETAR TABACOS - ${fechaInforme()}`,
        `${total.tabacos} tabacos incompletos, faltan ${total.faltan} tallos.`,
        '',
        'Qué hay que cortar:',
        ...filas.map(r => `- ${r.variedad} ${r.grado}: ${r.tabacos} tabaco(s), faltan ${r.faltan} tallos`),
        '',
        'Dónde está cada tabaco:',
        ...detalle.map(i => `- ${i.ubicacion}, ${i.bloque}, ${i.variedad} ${i.grado}: tiene ${i.tallosActuales} de ${i.tallosMeta}, faltan ${faltanDe(i)}`)
    ];
    try {
        await navigator.clipboard.writeText(lineas.join('\n'));
        alert('Informe copiado. Ya puedes pegarlo en WhatsApp.');
    } catch (err) {
        alert('No se pudo copiar automáticamente. Usa el botón Imprimir.');
    }
};
