let cortesGlobal = [];
let listaCortadoresGlobal = [];
let chartCortadores = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarCortadores();
    cargarCortes();
    inicializarNumeroSemanaActual();
});

// Función para calcular el número de semana ISO del año
function obtenerNumeroSemana(fechaStr) {
    if (!fechaStr) return 0;
    const fecha = new Date(fechaStr + 'T00:00:00');
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Establecer la semana actual por defecto en el input
function inicializarNumeroSemanaActual() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const semanaActual = obtenerNumeroSemana(hoyStr);
    const inputSemana = document.getElementById('filtro-numero-semana');
    if (inputSemana) {
        inputSemana.value = semanaActual;
    }
}

// Ocultar/Mostrar el selector de semana según la opción elegida
window.toggleSelectorSemana = function() {
    const rango = document.getElementById('filtro-rango-tiempo')?.value;
    const contSemana = document.getElementById('contenedor-filtro-semana');
    if (contSemana) {
        if (rango === 'semana') {
            contSemana.classList.remove('hidden');
        } else {
            contSemana.classList.add('hidden');
        }
    }
};

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

// Función auxiliar para obtener siempre el promedio correcto
function obtenerPromedioHoraDelCorte(item) {
    if (item.promedioHora && Number(item.promedioHora) > 0) {
        return Number(item.promedioHora);
    }
    const horas = calcularHorasTrabajadas(item.horaInicio, item.horaFin);
    const totalTallos = Number(item.totalTallos) || Number(item.tallosDirectos) || 0;
    return horas > 0 ? Math.round(totalTallos / horas) : totalTallos;
}

window.renderizarCortadores = function() {
    const tbody = document.getElementById('tabla-cortadores-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!cortesGlobal || cortesGlobal.length === 0) {
        cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
    }

    poblarFiltroCortadoresSelect();

    const rango = document.getElementById('filtro-rango-tiempo')?.value || 'semana';
    const numSemanaFiltro = parseInt(document.getElementById('filtro-numero-semana')?.value) || 0;
    const cortadorFiltro = document.getElementById('filtro-cortador-grafico')?.value || 'todos';

    const hoy = new Date();

    const cortesFiltrados = cortesGlobal.filter(c => {
        if (!c.fecha) return true;

        if (cortadorFiltro !== 'todos' && c.cortador !== cortadorFiltro) {
            return false;
        }

        const fechaCorte = new Date(c.fecha + 'T00:00:00');

        if (rango === 'semana') {
            const semanaCorte = obtenerNumeroSemana(c.fecha);
            return semanaCorte === numSemanaFiltro;
        } else if (rango === 'hoy') {
            return fechaCorte.toDateString() === hoy.toDateString();
        } else if (rango === 'mes') {
            return fechaCorte.getMonth() === hoy.getMonth() && fechaCorte.getFullYear() === hoy.getFullYear();
        }
        return true;
    });

    if (cortesFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay registros de cortes para la Semana ${numSemanaFiltro} o filtros seleccionados.</td></tr>`;
        renderizarGraficoDispersion([]);
        renderizarRankingCortadores([]);
        return;
    }

    cortesFiltrados.forEach(item => {
        const horas = calcularHorasTrabajadas(item.horaInicio, item.horaFin);
        const totalTallos = Number(item.totalTallos) || Number(item.tallosDirectos) || 0;
        const promedioHora = obtenerPromedioHoraDelCorte(item);
        const semanaCorte = obtenerNumeroSemana(item.fecha);

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b text-slate-700';
        tr.innerHTML = `
            <td class="p-4 text-xs font-semibold">${item.fecha || ''} <span class="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Sem ${semanaCorte}</span></td>
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
        console.warn('API no disponible para POST /api/cortes:', err);
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

// GRÁFICO DE DISPERSIÓN (USA EXACTAMENTE EL VALOR DE PROMEDIO / HORA)
// Paleta de la marca; el color sigue a cada cortador
const colores = ['#2c6d4d', '#a5864c', '#4a86a8', '#9b5d7e', '#8a9a3f', '#2f8f8a', '#c07a45', '#6b5b95'];

function leyendaCortadores() {
    let l = document.getElementById('leyenda-cortadores');
    if (!l) {
        l = document.createElement('div');
        l.id = 'leyenda-cortadores';
        l.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:4px';
        document.getElementById('graficoComparacionCortadores').parentElement.before(l);
    }
    return l;
}

function renderizarGraficoDispersion(cortes) {
    const canvas = document.getElementById('graficoComparacionCortadores');
    if (!canvas) return;
    if (chartCortadores) chartCortadores.destroy();
    chartCortadores = null;
    const leyenda = leyendaCortadores();
    leyenda.innerHTML = '';
    if (!cortes || cortes.length === 0) return;

    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#61756b';

    const mapa = {};
    cortes.forEach(c => { (mapa[c.cortador] = mapa[c.cortador] || []).push({ x: c.fecha, y: obtenerPromedioHoraDelCorte(c) }); });
    const nombres = Object.keys(mapa).sort();
    const todos = [...new Set(cortesGlobal.map(c => c.cortador))].filter(Boolean).sort();
    const color = n => colores[Math.max(0, todos.indexOf(n)) % colores.length];   // el color sigue al cortador
    const formas = ['circle', 'rectRot', 'triangle', 'rect'];
    const formasCss = ['border-radius:50%', 'transform:rotate(45deg);border-radius:1px', 'clip-path:polygon(50% 0,100% 100%,0 100%)', 'border-radius:2px'];

    chartCortadores = new Chart(canvas, {
        type: 'scatter',
        data: { datasets: nombres.map((n, i) => ({ label: n, data: mapa[n], backgroundColor: color(n), borderColor: '#fff', borderWidth: 2, pointStyle: formas[i % 4], pointRadius: 7, pointHoverRadius: 9 })) },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#fff', titleColor: '#16211b', bodyColor: '#3b4740', borderColor: '#dbe3de', borderWidth: 1, padding: 10, cornerRadius: 8, usePointStyle: true, boxPadding: 4,
                    callbacks: { title: items => items[0].raw.x, label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.raw.y.toLocaleString('es-CO') + ' tallos/hr' } }
            },
            scales: {
                x: { type: 'category', grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, border: { display: false }, grid: { color: '#e8eeea', drawTicks: false }, ticks: { padding: 8 }, title: { display: true, text: 'Tallos por hora' } }
            }
        }
    });

    nombres.forEach((n, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'display:flex;align-items:center;gap:7px;border:none;background:none;padding:2px 4px;font-size:12px;color:#3b4740;cursor:pointer';
        chip.innerHTML = `<span style="width:10px;height:10px;background:${color(n)};${formasCss[i % 4]}"></span>${n}`;
        chip.onclick = () => {
            chartCortadores.setDatasetVisibility(i, !chartCortadores.isDatasetVisible(i));
            chartCortadores.update();
            chip.style.opacity = chartCortadores.isDatasetVisible(i) ? 1 : 0.35;
        };
        leyenda.appendChild(chip);
    });
}

// RANKING DE RENDIMIENTO (USA EXACTAMENTE EL TOTAL DE TALLOS Y HORAS REGISTRADAS)
function renderizarRankingCortadores(cortes) {
    const contenedor = document.getElementById('contenedor-ranking-cortadores');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!cortes || cortes.length === 0) {
        contenedor.innerHTML = '<p class="text-xs text-gray-400 italic py-2">Sin datos para la semana o periodo seleccionado.</p>';
        return;
    }

    const resumen = {};
    cortes.forEach(c => {
        const horas = calcularHorasTrabajadas(c.horaInicio, c.horaFin);
        const tallos = Number(c.totalTallos) || Number(c.tallosDirectos) || 0;
        if (!resumen[c.cortador]) resumen[c.cortador] = { tallos: 0, horas: 0 };
        resumen[c.cortador].tallos += tallos;
        resumen[c.cortador].horas += horas;
    });

    const ranking = Object.keys(resumen).map(nombre => {
        const h = resumen[nombre].horas;
        const promedio = h > 0 ? Math.round(resumen[nombre].tallos / h) : resumen[nombre].tallos;
        return { nombre, promedio, totalTallos: resumen[nombre].tallos };
    }).sort((a, b) => b.promedio - a.promedio);

    const maximo = ranking[0].promedio || 1;
    const nf = n => Math.round(n).toLocaleString('es-CO');
    contenedor.innerHTML = ranking.map((r, i) => `
        <div style="padding:9px 0">
            <div style="display:flex;align-items:center;gap:10px">
                <span style="width:22px;height:22px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:${i === 0 ? '#163827' : '#e3efe8'};color:${i === 0 ? '#fff' : '#163827'}">${i + 1}</span>
                <span style="flex:1;font-size:13px;font-weight:600;color:#16211b">${r.nombre}</span>
                <span style="font-size:13px;font-weight:700;color:#16211b">${nf(r.promedio)} <span style="font-weight:400;font-size:11px;color:#61756b">t/h</span></span>
            </div>
            <div style="margin:6px 0 0 32px;height:8px;background:#eef3ef;border-radius:4px"><div style="width:${Math.round(r.promedio / maximo * 100)}%;height:100%;border-radius:4px;background:${i === 0 ? '#163827' : '#7fa88f'}"></div></div>
            <div style="margin:3px 0 0 32px;font-size:11px;color:#61756b">${nf(r.totalTallos)} tallos acumulados</div>
        </div>`).join('');
}
