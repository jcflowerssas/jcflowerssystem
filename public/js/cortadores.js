let cortesGlobal = [];
let listaCortadoresGlobal = [];

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
            // Respaldo desde localStorage si no hay respuesta del backend
            cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
        }
        renderizarCortadores();
    } catch (err) {
        console.error('Error al cargar cortes desde API, leyendo localStorage:', err);
        cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
        renderizarCortadores();
    }
}

window.poblarSelectsCortador = function() {
    if (typeof actualizarTodosLosSelects === 'function') {
        actualizarTodosLosSelects();
        return;
    }

    const selectCortador = document.getElementById('sc-cortador');
    const selectBloque = document.getElementById('sc-bloque');
    const selectVariedad = document.getElementById('sc-variedad');

    const configGuardada = localStorage.getItem('app_configuracion_listas');
    if (!configGuardada) return;

    const config = JSON.parse(configGuardada);

    if (selectCortador && config.cortadores) {
        selectCortador.innerHTML = '<option value="">-- Seleccione Cortador --</option>';
        config.cortadores.forEach(c => {
            selectCortador.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }

    if (selectBloque && config.bloques) {
        selectBloque.innerHTML = '<option value="">-- Seleccione Bloque --</option>';
        config.bloques.forEach(b => {
            selectBloque.innerHTML += `<option value="${b}">${b}</option>`;
        });
    }

    if (selectVariedad && config.variedades) {
        selectVariedad.innerHTML = '<option value="">-- Seleccione Variedad --</option>';
        config.variedades.forEach(v => {
            selectVariedad.innerHTML += `<option value="${v}">${v}</option>`;
        });
    }
};

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

    // Si cortesGlobal está vacío, intentar cargar desde localStorage por respaldo
    if (!cortesGlobal || cortesGlobal.length === 0) {
        cortesGlobal = JSON.parse(localStorage.getItem('app_cortes') || '[]');
    }

    if (cortesGlobal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400">No hay registros de cortes.</td></tr>`;
        renderizarGraficoCortadores();
        return;
    }

    cortesGlobal.forEach(item => {
        const horas = calcularHorasTrabajadas(item.horaInicio, item.horaFin);
        const totalTallos = Number(item.totalTallos) || ((Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 0)) + Number(item.tallosDirectos || 0));
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

    renderizarGraficoCortadores();
};

window.guardarCorte = async function(event) {
    if (event) event.preventDefault();

    const fecha = document.getElementById('sc-fecha').value;
    const cortador = document.getElementById('sc-cortador').value;
    const horaInicio = document.getElementById('sc-hora-inicio').value;
    const horaFin = document.getElementById('sc-hora-fin').value;
    const tabacos = parseInt(document.getElementById('sc-tabacos').value) || 0;
    const tallosPorTabaco = parseInt(document.getElementById('sc-tallos-tabaco').value) || 0;
    const tallosDirectos = parseInt(document.getElementById('sc-tallos-directos').value) || 0;

    if (!cortador) {
        alert('Por favor seleccione un cortador.');
        return;
    }

    // Recolectar múltiples bloques seleccionados
    const bloquesSeleccionados = Array.from(document.querySelectorAll('input[name="sc-bloque-check"]:checked'))
        .map(cb => cb.value);

    // Recolectar múltiples variedades seleccionadas
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

    const bloqueTexto = bloquesSeleccionados.join(', ');
    const variedadTexto = variedadesSeleccionadas.join(', ');

    const horas = calcularHorasTrabajadas(horaInicio, horaFin);
    const totalTallos = (tabacos * tallosPorTabaco) + tallosDirectos;
    const promedioHora = horas > 0 ? Math.round(totalTallos / horas) : totalTallos;

    const nuevoRegistro = {
        id: Date.now().toString(),
        fecha,
        cortador,
        bloque: bloqueTexto,
        variedad: variedadTexto,
        horaInicio,
        horaFin,
        horas: horas.toFixed(2),
        tabacos,
        tallosPorTabaco,
        tallosDirectos,
        totalTallos,
        promedioHora
    };

    // 1. Guardar en servidor mediante API
    try {
        await fetch('/api/cortes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoRegistro)
        });
    } catch (err) {
        console.warn('API no disponible para POST /api/cortes, guardando en local:', err);
    }

    // 2. Guardar en memoria local y localStorage
    cortesGlobal.unshift(nuevoRegistro);
    localStorage.setItem('app_cortes', JSON.stringify(cortesGlobal));

    // 3. Resetear formulario, cerrar modal y refrescar la tabla
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

let chartCortadores = null;
function renderizarGraficoCortadores() {
    const canvas = document.getElementById('graficoComparacionCortadores');
    if (!canvas) return;

    const resumen = {};
    cortesGlobal.forEach(c => {
        const horas = calcularHorasTrabajadas(c.horaInicio, c.horaFin);
        const tallos = Number(c.totalTallos) || ((Number(c.tabacos || 0) * Number(c.tallosPorTabaco || 0)) + Number(c.tallosDirectos || 0));
        if (!resumen[c.cortador]) resumen[c.cortador] = { tallos: 0, horas: 0 };
        resumen[c.cortador].tallos += tallos;
        resumen[c.cortador].horas += horas;
    });

    const labels = Object.keys(resumen);
    const data = labels.map(k => {
        const h = resumen[k].horas;
        return h > 0 ? Math.round(resumen[k].tallos / h) : resumen[k].tallos;
    });

    if (chartCortadores) chartCortadores.destroy();

    chartCortadores = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Promedio Tallos / Hora',
                data: data,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}