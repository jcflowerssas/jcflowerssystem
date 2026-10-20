let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    inicializarFiltrosProduccion();
    cargarDatosYGraficar();
});

// Inicializar los inputs temporales y la lista de bloques
async function inicializarFiltrosProduccion() {
    cambiarTipoTemporal();
    await cargarCheckboxesBloques();
}

// Cambiar el input temporal según se elija Día, Semana o Mes
window.cambiarTipoTemporal = function() {
    const tipo = document.getElementById('filtro-tipo-temporal')?.value;
    const contenedor = document.getElementById('contenedor-dinamico-temporal');
    if (!contenedor) return;

    const fechaHoy = new Date().toISOString().split('T')[0];
    const mesActual = fechaHoy.substring(0, 7); // YYYY-MM

    if (tipo === 'dia') {
        contenedor.innerHTML = `
            <label class="block text-xs font-bold text-slate-600 mb-1">Seleccionar Fecha</label>
            <input type="date" id="input-valor-temporal" value="${fechaHoy}" onchange="cargarDatosYGraficar()" class="w-full border rounded-xl px-3 py-2 text-sm bg-slate-50 font-medium">
        `;
    } else if (tipo === 'mes') {
        contenedor.innerHTML = `
            <label class="block text-xs font-bold text-slate-600 mb-1">Seleccionar Mes</label>
            <input type="month" id="input-valor-temporal" value="${mesActual}" onchange="cargarDatosYGraficar()" class="w-full border rounded-xl px-3 py-2 text-sm bg-slate-50 font-medium">
        `;
    } else if (tipo === 'semana') {
        contenedor.innerHTML = `
            <label class="block text-xs font-bold text-slate-600 mb-1">Número de Semana (1 - 52)</label>
            <input type="number" id="input-valor-temporal" min="1" max="52" value="43" placeholder="Ej. 43" oninput="cargarDatosYGraficar()" class="w-full border rounded-xl px-3 py-2 text-sm bg-slate-50 font-medium">
        `;
    }
    cargarDatosYGraficar();
};

// Cargar opciones de bloques en el menú desplegable con checkboxes
async function cargarCheckboxesBloques() {
    let bloques = [];
    try {
        const res = await fetch('/api/configuracion');
        if (res.ok) {
            const data = await res.json();
            bloques = data.bloques || [];
        }
    } catch (e) {
        const local = JSON.parse(localStorage.getItem('app_configuracion_listas') || '{}');
        bloques = local.bloques || ['Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4'];
    }

    const listaContainer = document.getElementById('lista-checkbox-bloques');
    if (!listaContainer) return;

    listaContainer.innerHTML = '';
    bloques.forEach(b => {
        listaContainer.innerHTML += `
            <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input type="checkbox" name="filtro-bloque-check" value="${b}" checked onchange="actualizarSeleccionBloques()" class="rounded text-emerald-600 w-4 h-4">
                <span>${b}</span>
            </label>
        `;
    });
}

window.toggleDropdownBloques = function() {
    const drop = document.getElementById('dropdown-bloques');
    if (drop) drop.classList.toggle('hidden');
};

window.seleccionarTodosBloques = function(master) {
    const checkboxes = document.querySelectorAll('input[name="filtro-bloque-check"]');
    checkboxes.forEach(cb => cb.checked = master.checked);
    actualizarSeleccionBloques();
};

window.actualizarSeleccionBloques = function() {
    const checkboxes = document.querySelectorAll('input[name="filtro-bloque-check"]:checked');
    const texto = document.getElementById('texto-bloques-seleccionados');
    
    if (checkboxes.length === 0) {
        texto.textContent = "Ningún bloque seleccionado";
    } else {
        const nombres = Array.from(checkboxes).map(cb => cb.value);
        texto.textContent = nombres.length === document.querySelectorAll('input[name="filtro-bloque-check"]').length ? "Todos los Bloques" : nombres.join(', ');
    }
    cargarDatosYGraficar();
};

// Función auxiliar para calcular el número de semana de una fecha
function obtenerNumeroSemana(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

async function cargarDatosYGraficar() {
    let cortes = [];
    
    // 1. Intentar cargar desde la API del servidor
    try {
        const res = await fetch('/api/cortes');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                cortes = data;
            }
        }
    } catch (e) {
        console.warn('API cortes no disponible, buscando en almacenamiento local...');
    }

    // 2. Si la API está vacía, buscar en todas las llaves posibles de localStorage
    if (!cortes || cortes.length === 0) {
        const posiblesLlaves = ['app_cortes', 'app_entradas', 'cortes', 'entradas'];
        for (const llave of posiblesLlaves) {
            const datosLocal = localStorage.getItem(llave);
            if (datosLocal) {
                try {
                    const parsed = JSON.parse(datosLocal);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        cortes = parsed;
                        console.log(`✅ Datos encontrados en localStorage bajo la llave: "${llave}"`, cortes);
                        break;
                    }
                } catch (err) {
                    console.warn(`Error al parsear ${llave}:`, err);
                }
            }
        }
    }

    console.log("📊 Total de registros cargados para el gráfico:", cortes);

    const tipoTemporal = document.getElementById('filtro-tipo-temporal')?.value;
    const valorTemporal = document.getElementById('input-valor-temporal')?.value;
    
    const checkboxesSeleccionados = document.querySelectorAll('input[name="filtro-bloque-check"]:checked');
    const bloquesPermitidos = Array.from(checkboxesSeleccionados).map(cb => cb.value);

    // 3. Filtrar los registros según el periodo y los bloques seleccionados
    const cortesFiltrados = cortes.filter(item => {
        const fechaStr = item.fecha || item.fechaIngreso || '';
        const bloqueStr = item.bloque || '';
        
        if (!fechaStr || !bloqueStr) return false;
        if (bloquesPermitidos.length > 0 && !bloquesPermitidos.includes(bloqueStr)) return false;

        if (tipoTemporal === 'dia') {
            return fechaStr === valorTemporal;
        } else if (tipoTemporal === 'mes') {
            const mesItem = fechaStr.substring(0, 7); // Formato YYYY-MM
            return mesItem === valorTemporal;
        } else if (tipoTemporal === 'semana') {
            const fechaItem = new Date(fechaStr + 'T00:00:00');
            if (isNaN(fechaItem.getTime())) return false;
            const semanaItem = obtenerNumeroSemana(fechaItem);
            return Number(semanaItem) === Number(valorTemporal);
        }
        return true;
    });

    console.log("🔍 Registros filtrados después de aplicar los filtros:", cortesFiltrados);

    // 4. Extraer etiquetas únicas (fechas) ordenadas cronológicamente
    const etiquetasSet = new Set();
    cortesFiltrados.forEach(c => etiquetasSet.add(c.fecha || c.fechaIngreso));
    const etiquetas = Array.from(etiquetasSet).sort();

    const coloresPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let colorIndex = 0;

    const datasets = bloquesPermitidos.map(bloque => {
        const color = coloresPalette[colorIndex % coloresPalette.length];
        colorIndex++;

        const dataPuntos = etiquetas.map(fecha => {
            const registrosMismaFechaBloque = cortesFiltrados.filter(c => (c.fecha || c.fechaIngreso) === fecha && c.bloque === bloque);
            let totalTallos = 0;
            registrosMismaFechaBloque.forEach(r => {
                totalTallos += Number(r.totalTallos) || (Number(r.tabacos || 0) * Number(r.tallosPorTabaco || 40)) || 0;
            });
            return totalTallos;
        });

        return {
            label: bloque,
            data: dataPuntos,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            fill: false,
            tension: 0.1
        };
    });

    renderizarGrafico(etiquetas.length > 0 ? etiquetas : ['Sin registros en este periodo'], datasets);
}

// Renderizar o actualizar la gráfica usando Chart.js
function renderizarGrafico(etiquetas, datasets) {
    const ctx = document.getElementById('graficoProduccion')?.getContext('2d');
    if (!ctx) return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line', // Tipo línea uniendo puntos de dispersión
        data: {
            labels: etiquetas.length > 0 ? etiquetas : ['Sin datos'],
            datasets: datasets.length > 0 ? datasets : [{ label: 'Sin registros', data: [0], borderColor: '#cbd5e1' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total de Tallos Cosechados'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                }
            }
        }
    });
}