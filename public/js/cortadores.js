let cortesGlobal = [];
let listaCortadoresGlobal = [];
let chartCortadores = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarCortadores();
    cargarCortes();
});

async function cargarCortadores() {
    try {
        const res = await fetch('/api/cortadores');
        listaCortadoresGlobal = res.ok ? await res.json() : [];
    } catch (err) {
        console.error('Error al cargar cortadores:', err);
    }
}

async function cargarCortes() {
    try {
        const res = await fetch('/api/cortes');
        if (res.ok) {
            cortesGlobal = await res.json();
        } else {
            cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
        }
    } catch (err) {
        cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
    }
    renderizarCortadores();
}

function calcularHorasTrabajadas(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return 0;
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const inicio = h1 + m1 / 60;
    const fin = h2 + m2 / 60;
    const dif = fin - inicio;
    return dif > 0 ? dif : 0;
}

window.renderizarCortadores = function() {
    const tbody = document.getElementById('tabla-cortadores-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!cortesGlobal || cortesGlobal.length === 0) {
        cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
    }

    poblarFiltroCortadoresSelect();

    // Obtener filtros
    const rango = document.getElementById('filtro-rango-tiempo')?.value || 'semana';
    const cortadorFiltro = document.getElementById('filtro-cortador-grafico')?.value || 'todos';

    // Filtrar por Rango Temporal
    const hoy = new Date();
    const cortesFiltrados = cortesGlobal.filter(c => {
        if (!c.fecha) return true;
        const fechaCorte = new Date(c.fecha + 'T00:00:00');

        if (cortadorFiltro !== 'todos' && c.cortador !== cortadorFiltro) {
            return false;
        }

        if (rango === 'hoy') {
            return fechaCorte.toDateString() === hoy.toDateString();
        } else if (rango === 'semana') {
            const haceSieteDias = new Date();
            haceSieteDias.setDate(hoy.getDate() - 7);
            return fechaCorte >= haceSieteDias;
        } else if (rango === 'mes') {
            return fechaCorte.getMonth() === hoy.getMonth() && fechaCorte.getFullYear() === hoy.getFullYear();
        }
        return true;
    });

    if (cortesFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros para los filtros seleccionados.</td></tr>`;
        renderizarGraficoDispersion([]);
        renderizarRankingCortadores([]);
        return;
    }

    cortesFiltrados.forEach(item => {
        const horas = calcularHorasTrabajadas(item.horaInicio, item.horaFin);
        const totalTallos = Number(item.totalTallos) || Number(item.tallosDirectos) || 0;
        const promedioHora = horas > 0 ? Math.round(totalTallos / horas) : totalTallos;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b text-slate-700';
        tr.innerHTML = `
            <td class="p-4 text-xs font-semibold">${item.fecha || ''}</td>
            <td class="p-4 font-bold text-emerald-900">${item.cortador || ''}</td>
            <td class="p-4">${item.bloque || ''}</td>
            <td class="p-4 font-medium">${item.variedad || ''}</td>
            <td class="p-4 text-xs font-semibold">${horas.toFixed(1)} hrs (${item.horaInicio || ''} - ${item.horaFin || ''})</td>
            <td class="p-4 font-extrabold text-slate-800">${totalTallos.toLocaleString()} tallos</td>
            <td class="p-4 font-bold text-emerald-700">${promedioHora.toLocaleString()} tallos/hr</td>
            <td class="p-4 text-center">
                <button onclick="eliminarCorte('${item.id}')" class="px-2.5 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-xs font-bold">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderizarGraficoDispersion(cortesFiltrados);
    renderizarRankingCortadores(cortesFiltrados);
};

// Poblar filtro desplegable de cortadores
function poblarFiltroCortadoresSelect() {
    const select = document.getElementById('filtro-cortador-grafico');
    if (!select) return;
    const valorActual = select.value;

    const cortadoresUnicos = [...new Set(cortesGlobal.map(c => c.cortador))].filter(Boolean);
    select.innerHTML = '<option value="todos">Todos los Cortadores</option>';
    cortadoresUnicos.forEach(c => {
        select.innerHTML += `<option value="${c}">${c}</option>`;
    });
    if (valorActual) select.value = valorActual;
}

// Guardar nuevo registro simplificado
window.guardarCorte = async function(event) {
    if (event) event.preventDefault();

    const fecha = document.getElementById('sc-fecha').value;
    const cortador = document.getElementById('sc-cortador').value;
    const horaInicio = document.getElementById('sc-hora-inicio').value;
    const horaFin = document.getElementById('sc-hora-fin').value;
    const totalTallos = parseInt(document.getElementById('sc-tallos-directos').value) || 0;

    if (!cortador) {
        alert('Por favor seleccione un cortador.');
        return;
    }

    const bloquesSeleccionados = Array.from(document.querySelectorAll('input[name="sc-bloque-check"]:checked'))
        .map(cb => cb.value);

    const variedadesSeleccionadas = Array.from(document.querySelectorAll('input[name="sc-variedad-check"]:checked'))
        .map(cb => cb.value);

    if (bloquesSeleccionados.length === 0) {
        alert('Por favor selecciona al menos un bloque.');
        return;
    }

    if (variedadesSeleccionadas.length === 0) {
        alert('Por favor selecciona al menos una variedad.');
        return;
    }

    const horas = calcularHorasTrabajadas(horaInicio, horaFin);
    const promedioHora = horas > 0 ? Math.round(totalTallos / horas) : totalTallos;

    const nuevoRegistro = {
        id: Date.now().toString(),
        fecha,
        cortador,
        bloque: bloquesSeleccionados.join(', '),
        variedad: variedadesSeleccionadas.join(', '),
        horaInicio,
        horaFin,
        horas: horas.toFixed(2),
        tallosDirectos: totalTallos,
        totalTallos: totalTallos,
        promedioHora
    };

    try {
        await fetch('/api/cortes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoRegistro)
        });
    } catch (err) {
        console.warn('API no disponible para POST /api/cortes, guardando localmente:', err);
    }

    cortesGlobal.unshift(nuevoRegistro);
    localStorage.setItem('app_cortes', JSON.stringify(cortesGlobal));

    document.getElementById('form-cortador').reset();
    if (typeof cerrarModal === 'function') cerrarModal('modal-cortador');
    renderizarCortadores();
};

window.eliminarCorte = async function(id) {
    if (!confirm('¿Deseas eliminar este registro de corte?')) return;

    try {
        await fetch(`/api/cortes/${id}`, { method: 'DELETE' });
    } catch (err) {
        console.warn('API no disponible para DELETE /api/cortes:', err);
    }

    cortesGlobal = cortesGlobal.filter(c => String(c.id) !== String(id));
    localStorage.setItem('app_cortes', JSON.stringify(cortesGlobal));
    renderizarCortadores();
};

// GRÁFICO DE DISPERSIÓN (PUNTOS DE RENDIMIENTO COMPARATIVOS)
function renderizarGraficoDispersion(cortes) {
    const canvas = document.getElementById('graficoComparacionCortadores');
    if (!canvas) return;

    if (chartCortadores) chartCortadores.destroy();

    if (!cortes || cortes.length === 0) return;

    // Colores aleatorios por cortador
    const colores = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
    const mapaCortadores = {};

    cortes.forEach(c => {
        const horas = calcularHorasTrabajadas(c.horaInicio, c.horaFin);
        const tallos = Number(c.totalTallos) || 0;
        const promedio = horas > 0 ? Math.round(tallos / horas) : tallos;

        if (!mapaCortadores[c.cortador]) {
            mapaCortadores[c.cortador] = [];
        }
        mapaCortadores[c.cortador].push({
            x: c.fecha,
            y: promedio
        });
    });

    const datasets = Object.keys(mapaCortadores).map((nombre, i) => ({
        label: nombre,
        data: mapaCortadores[nombre],
        backgroundColor: colores[i % colores.length],
        borderColor: colores[i % colores.length],
        pointRadius: 6,
        pointHoverRadius: 9
    }));

    chartCortadores = new Chart(canvas, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.y} tallos/hr (${ctx.raw.x})`
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Fecha del Corte' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Tallos / Hora' }
                }
            }
        }
    });
}

// GENERAR RANKING DE MAYOR A MENOR RENDIMIENTO
function renderizarRankingCortadores(cortes) {
    const contenedor = document.getElementById('contenedor-ranking-cortadores');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!cortes || cortes.length === 0) {
        contenedor.innerHTML = '<p class="text-xs text-gray-400 italic py-2">Sin datos para el periodo seleccionado.</p>';
        return;
    }

    // Calcular promedio acumulado por cortador
    const resumen = {};
    cortes.forEach(c => {
        const horas = calcularHorasTrabajadas(c.horaInicio, c.horaFin);
        const tallos = Number(c.totalTallos) || 0;
        if (!resumen[c.cortador]) resumen[c.cortador] = { tallos: 0, horas: 0 };
        resumen[c.cortador].tallos += tallos;
        resumen[c.cortador].horas += horas;
    });

    const ranking = Object.keys(resumen).map(nombre => {
        const h = resumen[nombre].horas;
        const promedio = h > 0 ? Math.round(resumen[nombre].tallos / h) : resumen[nombre].tallos;
        return { nombre, promedio, totalTallos: resumen[nombre].tallos };
    }).sort((a, b) => b.promedio - a.promedio);

    ranking.forEach((item, index) => {
        const medallas = ['🥇', '🥈', '🥉'];
        const icono = medallas[index] || `#${index + 1}`;

        const div = document.createElement('div');
        div.className = 'py-2.5 flex items-center justify-between text-sm';
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-base">${icono}</span>
                <div>
                    <p class="font-bold text-slate-800 leading-tight">${item.nombre}</p>
                    <p class="text-[11px] text-gray-500">${item.totalTallos.toLocaleString()} tallos acumulados</p>
                </div>
            </div>
            <span class="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs">
                ${item.promedio.toLocaleString()} t/h
            </span>
        `;
        contenedor.appendChild(div);
    });
}