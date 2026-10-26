document.addEventListener('DOMContentLoaded', () => {
    cargarDatosSalidas();
});

// Función para normalizar textos y evitar errores por tildes, mayúsculas o espacios
function normalizarTexto(txt) {
    if (!txt) return '';
    return String(txt).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Cargar entradas y salidas para calcular stock por estiba
async function cargarDatosSalidas() {
    let entradas = [];
    let salidas = [];

    try {
        const [resEntradas, resSalidas] = await Promise.all([
            fetch('/api/entradas'),
            fetch('/api/salidas')
        ]);
        if (resEntradas.ok) entradas = await resEntradas.json();
        if (resSalidas.ok) salidas = await resSalidas.json();
    } catch (e) {
        entradas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
        salidas = JSON.parse(localStorage.getItem('app_salidas') || '[]');
    }

    // Deduplicar por ID
    entradas = Array.from(new Map(entradas.map(item => [item.id, item])).values());
    salidas = Array.from(new Map(salidas.map(item => [item.id, item])).values());

    window.entradasGlobal = entradas;
    window.salidasGlobal = salidas;

    renderizarEstibas(entradas, salidas);
    renderizarTablaSalidas(salidas);
}

// Calcular y renderizar tarjetas de estibas con control especial para Devoluciones
function renderizarEstibas(entradas, salidas) {
    const grid = document.getElementById('grid-estibas');
    if (!grid) return;

    const inventarioPorEstiba = {};

    // 1. Sumar Entradas
    entradas.forEach(item => {
        const ub = item.ubicacion || 'Sin Ubicación';
        const ubNorm = normalizarTexto(ub);
        const esDevolucion = ubNorm.includes('devolucion');

        if (!inventarioPorEstiba[ub]) {
            inventarioPorEstiba[ub] = { totalTallos: 0, totalTabacos: 0, variedades: {} };
        }

        const tallos = Math.abs(Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0);
        const tabacos = Math.abs(Number(item.tabacos) || 0);
        
        const varNombre = esDevolucion ? (item.variedad || 'Todas') : (item.variedad || 'General');

        inventarioPorEstiba[ub].totalTallos += tallos;
        inventarioPorEstiba[ub].totalTabacos += tabacos;

        if (!inventarioPorEstiba[ub].variedades[varNombre]) {
            inventarioPorEstiba[ub].variedades[varNombre] = { tallos: 0, tabacos: 0 };
        }
        inventarioPorEstiba[ub].variedades[varNombre].tallos += tallos;
        inventarioPorEstiba[ub].variedades[varNombre].tabacos += tabacos;
    });

    // 2. Restar Salidas de forma estricta y segura
    salidas.forEach(item => {
        const ub = item.ubicacion || 'Sin Ubicación';
        const ubNorm = normalizarTexto(ub);
        const esDevolucion = ubNorm.includes('devolucion');

        if (inventarioPorEstiba[ub]) {
            const tallos = Math.abs(Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0);
            const tabacos = Math.abs(Number(item.tabacos) || 0);
            const varNombre = esDevolucion ? (item.variedad || 'Todas') : (item.variedad || 'General');

            inventarioPorEstiba[ub].totalTallos = Math.max(0, inventarioPorEstiba[ub].totalTallos - tallos);
            inventarioPorEstiba[ub].totalTabacos = Math.max(0, inventarioPorEstiba[ub].totalTabacos - tabacos);

            if (inventarioPorEstiba[ub].variedades[varNombre]) {
                inventarioPorEstiba[ub].variedades[varNombre].tallos = Math.max(0, inventarioPorEstiba[ub].variedades[varNombre].tallos - tallos);
                inventarioPorEstiba[ub].variedades[varNombre].tabacos = Math.max(0, inventarioPorEstiba[ub].variedades[varNombre].tabacos - tabacos);
            } else {
                const keysVar = Object.keys(inventarioPorEstiba[ub].variedades);
                if (keysVar.length > 0) {
                    const primeraKey = keysVar[0];
                    inventarioPorEstiba[ub].variedades[primeraKey].tallos = Math.max(0, inventarioPorEstiba[ub].variedades[primeraKey].tallos - tallos);
                    inventarioPorEstiba[ub].variedades[primeraKey].tabacos = Math.max(0, inventarioPorEstiba[ub].variedades[primeraKey].tabacos - tabacos);
                }
            }
        }
    });

    grid.innerHTML = '';
    const estibasKeys = Object.keys(inventarioPorEstiba);

    if (estibasKeys.length === 0) {
        grid.innerHTML = `<div class="col-span-full p-6 bg-white rounded-2xl border text-center text-gray-400 italic">No hay estibas con inventario registrado. Registre una entrada primero.</div>`;
        return;
    }

    estibasKeys.forEach(ub => {
        const estiba = inventarioPorEstiba[ub];
        
        let htmlVariedades = '';
        Object.keys(estiba.variedades).forEach(v => {
            const vData = estiba.variedades[v];
            if (vData.tallos > 0) {
                htmlVariedades += `
                    <div class="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                        <span class="font-bold text-slate-700">${v}</span>
                        <span class="text-slate-500 font-semibold">${vData.tallos.toLocaleString()} tallos <span class="text-[10px] text-gray-400">(${vData.tabacos} tab.)</span></span>
                    </div>
                `;
            }
        });

        if (!htmlVariedades) {
            htmlVariedades = `<p class="text-xs text-gray-400 italic py-1">Estiba vacía (sin stock disponible).</p>`;
        }

        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl p-5 shadow-sm border transition hover:shadow-md flex flex-col justify-between ${estiba.totalTallos > 0 ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'}`;
        card.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b pb-2">
                    <h4 class="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                        <span>📍</span> ${ub}
                    </h4>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${estiba.totalTallos > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${estiba.totalTallos > 0 ? 'Disponible' : 'Sin Stock'}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                    <div>
                        <span class="block text-[10px] uppercase font-bold text-slate-400">Total Tallos</span>
                        <span class="text-lg font-black text-emerald-900">${estiba.totalTallos.toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="block text-[10px] uppercase font-bold text-slate-400">Total Tabacos</span>
                        <span class="text-lg font-black text-slate-700">${estiba.totalTabacos.toLocaleString()}</span>
                    </div>
                </div>

                <div class="space-y-1">
                    <span class="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Variedades en esta Estiba:</span>
                    <div class="max-h-28 overflow-y-auto pr-1 space-y-1">
                        ${htmlVariedades}
                    </div>
                </div>
            </div>

            <!-- BOTONES DUALES: RETIRO PARCIAL O VACIAR ESTIBA COMPLETA -->
            <div class="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button onclick="abrirModalSalidaParaEstiba('${ub}')" class="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1" title="Retirar cantidad o variedad específica">
                    <span>🔍</span> Retiro Parcial
                </button>
                <button onclick="retirarEstibaCompleta('${ub}')" class="py-2 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center gap-1 ${estiba.totalTallos <= 0 ? 'opacity-40 cursor-not-allowed bg-rose-400' : ''}" ${estiba.totalTallos <= 0 ? 'disabled' : ''} title="Despachar toda la estiba de un golpe">
                    <span>⚡</span> Vaciar Estiba
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Función para vaciar completamente una estiba con confirmación de seguridad
window.retirarEstibaCompleta = async function(ubicacion) {
    if (!confirm(`⚠️ ¿Estás completamente seguro de retirar TODO el contenido de "${ubicacion}"? Esta acción despachará la estiba completa.`)) {
        return;
    }

    const entradas = window.entradasGlobal || [];
    const salidas = window.salidasGlobal || [];

    const entradasEstiba = entradas.filter(e => e.ubicacion === ubicacion);
    if (entradasEstiba.length === 0) {
        alert('Esta estiba no tiene registros activos.');
        return;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const itemsMap = {};

    // Agrupar stock actual de la estiba por bloque, variedad y grado
    entradasEstiba.forEach(e => {
        const key = `${e.bloque || 'General'}_${e.variedad || 'General'}_${e.grado || 'General'}`;
        const tallos = Number(e.totalTallos) || (Number(e.tabacos || 0) * Number(e.tallosPorTabaco || 40)) || 0;
        const tabacos = Number(e.tabacos) || 0;
        const tallosPorTabaco = Number(e.tallosPorTabaco) || 40;

        if (!itemsMap[key]) {
            itemsMap[key] = {
                bloque: e.bloque || 'General',
                variedad: e.variedad || 'General',
                grado: e.grado || 'General',
                tallos: 0,
                tabacos: 0,
                tallosPorTabaco: tallosPorTabaco
            };
        }
        itemsMap[key].tallos += tallos;
        itemsMap[key].tabacos += tabacos;
    });

    // Descontar salidas previas de esta estiba
    salidas.forEach(s => {
        if (s.ubicacion === ubicacion) {
            const key = `${s.bloque || 'General'}_${s.variedad || 'General'}_${s.grado || 'General'}`;
            const tallos = Number(s.totalTallos) || (Number(s.tabacos || 0) * Number(s.tallosPorTabaco || 40)) || 0;
            const tabacos = Number(s.tabacos) || 0;

            if (itemsMap[key]) {
                itemsMap[key].tallos = Math.max(0, itemsMap[key].tallos - tallos);
                itemsMap[key].tabacos = Math.max(0, itemsMap[key].tabacos - tabacos);
            }
        }
    });

    const nuevasSalidas = [];
    Object.keys(itemsMap).forEach(key => {
        const item = itemsMap[key];
        if (item.tallos > 0) {
            nuevasSalidas.push({
                id: (Date.now() + Math.random()).toString(),
                fecha: fechaHoy,
                ubicacion: ubicacion,
                bloque: item.bloque,
                variedad: item.variedad,
                grado: item.grado,
                tabacos: item.tabacos,
                tallosPorTabaco: item.tallosPorTabaco,
                totalTallos: item.tallos
            });
        }
    });

    if (nuevasSalidas.length === 0) {
        alert('La estiba ya se encuentra vacía o sin stock disponible.');
        return;
    }

    let salidasGuardadas = JSON.parse(localStorage.getItem('app_salidas') || '[]');

    for (const salida of nuevasSalidas) {
        salidasGuardadas.unshift(salida);
        try {
            await fetch('/api/salidas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(salida)
            });
        } catch (err) {
            console.warn('Backend no disponible al vaciar estiba:', err);
        }
    }

    localStorage.setItem('app_salidas', JSON.stringify(salidasGuardadas));

    alert(`✅ Estiba "${ubicacion}" vaciada exitosamente.`);
    cargarDatosSalidas();
};

// Renderizar tabla de historial de salidas
function renderizarTablaSalidas(salidas) {
    const tbody = document.getElementById('tabla-salidas-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!salidas || salidas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros de salidas.</td></tr>`;
        return;
    }

    salidas.forEach(item => {
        const tallosTotales = Number(item.totalTallos) || (Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40)) || 0;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b text-slate-700 text-sm';
        tr.innerHTML = `
            <td class="p-3 text-xs font-semibold text-slate-500">${item.fecha || '-'}</td>
            <td class="p-3 font-medium text-slate-800">${item.ubicacion || '-'}</td>
            <td class="p-3">${item.bloque || '-'}</td>
            <td class="p-3 font-bold text-slate-800">${item.variedad || '-'}</td>
            <td class="p-3">${item.grado || '-'}</td>
            <td class="p-3 font-semibold">${item.tabacos || 0} tabacos</td>
            <td class="p-3 font-extrabold text-rose-700">${tallosTotales.toLocaleString()} tallos</td>
            <td class="p-3 text-center">
                <button onclick="eliminarSalida('${item.id}')" class="px-3 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-xs font-bold transition shadow-sm">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Abrir modal seleccionando una estiba específica
window.abrirModalSalidaParaEstiba = async function(ubicacionNombre) {
    const m = document.getElementById('modal-salida');
    if (!m) return;

    m.classList.remove('hidden');
    const campoFecha = document.getElementById('ss-fecha');
    if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];

    const selectUbicacion = document.getElementById('ss-ubicacion');
    if (selectUbicacion) {
        if (typeof poblarSelectsSalidas === 'function') {
            await poblarSelectsSalidas();
        }
        selectUbicacion.value = ubicacionNombre;
        actualizarFiltrosPorEstiba();
    }
};

window.abrirModalSalidaGeneral = async function() {
    const m = document.getElementById('modal-salida');
    if (!m) return;
    m.classList.remove('hidden');
    const campoFecha = document.getElementById('ss-fecha');
    if (campoFecha) campoFecha.value = new Date().toISOString().split('T')[0];

    if (typeof poblarSelectsSalidas === 'function') {
        await poblarSelectsSalidas();
    }
};

// Filtrar Bloque, Variedad y Grado según lo disponible en la estiba seleccionada
window.actualizarFiltrosPorEstiba = function() {
    const estibaSeleccionada = document.getElementById('ss-ubicacion')?.value;
    const selectBloque = document.getElementById('ss-bloque');
    const selectVariedad = document.getElementById('ss-variedad');
    const selectGrado = document.getElementById('ss-grado');

    if (selectBloque) selectBloque.innerHTML = '<option value="">-- Seleccione Bloque --</option>';
    if (selectVariedad) selectVariedad.innerHTML = '<option value="">-- Seleccione Variedad --</option>';
    if (selectGrado) selectGrado.innerHTML = '<option value="">-- Seleccione Grado --</option>';

    if (!estibaSeleccionada || !window.entradasGlobal) return;

    const bloquesEnEstiba = new Set();
    const variedadesEnEstiba = new Set();
    const gradosEnEstiba = new Set();

    window.entradasGlobal.forEach(item => {
        if (item.ubicacion === estibaSeleccionada) {
            if (item.bloque) bloquesEnEstiba.add(item.bloque);
            if (item.variedad) variedadesEnEstiba.add(item.variedad);
            if (item.grado) gradosEnEstiba.add(item.grado);
        }
    });

    bloquesEnEstiba.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        selectBloque.appendChild(opt);
    });

    variedadesEnEstiba.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        selectVariedad.appendChild(opt);
    });

    gradosEnEstiba.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        selectGrado.appendChild(opt);
    });
};

// Guardar Salida
window.guardarSalida = async function(event) {
    if (event) event.preventDefault();

    const ubicacion = document.getElementById('ss-ubicacion')?.value;
    const bloque = document.getElementById('ss-bloque')?.value;
    const variedad = document.getElementById('ss-variedad')?.value;
    const grado = document.getElementById('ss-grado')?.value;
    const tabacos = Number(document.getElementById('ss-tabacos')?.value) || 0;
    const tallosPorTabaco = Number(document.getElementById('ss-tallos-tabaco')?.value) || 40;
    const fecha = document.getElementById('ss-fecha')?.value || new Date().toISOString().split('T')[0];
    const totalTallos = tabacos * tallosPorTabaco;

    if (!ubicacion || !variedad || tabacos <= 0) {
        alert('Por favor complete todos los campos obligatorios y asegúrese de que la cantidad de tabacos sea mayor a 0.');
        return;
    }

    const nuevaSalida = {
        id: Date.now().toString(),
        fecha,
        ubicacion,
        bloque: bloque || 'General',
        variedad,
        grado: grado || 'Devolución / General',
        tabacos,
        tallosPorTabaco,
        totalTallos
    };

    try {
        await fetch('/api/salidas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaSalida)
        });
    } catch (err) {
        console.warn('Backend no disponible, guardando en localStorage:', err);
    }

    let salidasGuardadas = JSON.parse(localStorage.getItem('app_salidas') || '[]');
    salidasGuardadas.unshift(nuevaSalida);
    localStorage.setItem('app_salidas', JSON.stringify(salidasGuardadas));

    if (typeof cerrarModal === 'function') cerrarModal('modal-salida');
    document.getElementById('form-salida')?.reset();

    cargarDatosSalidas();
};

// Eliminar Salida
window.eliminarSalida = async function(id) {
    if (!confirm('¿Deseas eliminar este registro de salida y devolver el stock a la estiba?')) return;
    try {
        await fetch(`/api/salidas/${id}`, { method: 'DELETE' });
    } catch (err) {
        console.warn('Error al eliminar del servidor:', err);
    }

    let salidasGuardadas = JSON.parse(localStorage.getItem('app_salidas') || '[]');
    salidasGuardadas = salidasGuardadas.filter(s => String(s.id) !== String(id));
    localStorage.setItem('app_salidas', JSON.stringify(salidasGuardadas));

    cargarDatosSalidas();
};