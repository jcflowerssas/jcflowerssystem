let cortesData = [];
let listaCortadores = [];
let graficoCompInstance = null;

async function renderizarCortadores() {
    try {
        const resCortes = await fetch('/api/cortes');
        cortesData = resCortes.ok ? await resCortes.json() : [];

        const resInv = await fetch('/api/inventario');
        const inventarioData = resInv.ok ? await resInv.json() : [];

        const resCortadores = await fetch('/api/cortadores');
        const dataCortadores = resCortadores.ok ? await resCortadores.json() : [];
        
        listaCortadores = dataCortadores.length > 0 
            ? dataCortadores.map(c => typeof c === 'string' ? c : c.nombre) 
            : ['Juan Pérez', 'María Gómez', 'Carlos Ruiz'];

        actualizarDropdownsCortadores();
        actualizarFiltrosCortadoresGrafico();
        renderizarChipsCortadores();

        // 1. Renderizar detalle de cortes
        const tbodyCortadores = document.getElementById('tabla-cortadores-body');
        if (tbodyCortadores) {
            tbodyCortadores.innerHTML = '';
            
            if (cortesData.length === 0) {
                tbodyCortadores.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400">No hay registros de rendimiento.</td></tr>`;
            } else {
                cortesData.forEach(c => {
                    const horas = calcularHorasEfectivas(c.horaInicio, c.horaFin);
                    const totalTallos = c.tallosDirectos ? Number(c.tallosDirectos) : (Number(c.tabacos || 0) * Number(c.tallosPorTabaco || 0));
                    const promedioHora = horas > 0 ? Math.round(totalTallos / horas) : totalTallos;

                    tbodyCortadores.innerHTML += `
                        <tr class="hover:bg-slate-50">
                            <td class="p-4 text-xs font-semibold text-slate-600">${c.fecha}</td>
                            <td class="p-4 font-medium text-slate-800">${c.cortador}</td>
                            <td class="p-4"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">${c.bloque || 'General'}</span></td>
                            <td class="p-4 text-xs text-slate-600">${c.variedad || 'Varias'}</td>
                            <td class="p-4">${horas.toFixed(1)} hrs</td>
                            <td class="p-4 font-bold text-emerald-700">${totalTallos.toLocaleString()} tallos</td>
                            <td class="p-4 text-blue-600 font-semibold">${promedioHora.toLocaleString()} tallos/hora</td>
                            <td class="p-4 text-center">
                                <button onclick="eliminarCorte(${c.id})" class="px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold">Eliminar</button>
                            </td>
                        </tr>
                    `;
                });
            }
        }

        // 2. Auditoría por Bloque (repartiendo tallos si seleccionó varios bloques)
        const tbodyAuditoria = document.getElementById('tabla-auditoria-body');
        if (tbodyAuditoria) {
            tbodyAuditoria.innerHTML = '';

            const tallosCortadosPorBloque = {};
            cortesData.forEach(c => {
                const totalTallos = c.tallosDirectos ? Number(c.tallosDirectos) : (Number(c.tabacos || 0) * Number(c.tallosPorTabaco || 0));
                const listaBloques = c.bloque ? c.bloque.split(',').map(b => b.trim()) : ['Sin Bloque'];
                const tallosPorBloque = totalTallos / listaBloques.length;

                listaBloques.forEach(b => {
                    tallosCortadosPorBloque[b] = (tallosCortadosPorBloque[b] || 0) + tallosPorBloque;
                });
            });

            const tallosInventarioPorBloque = {};
            inventarioData.forEach(inv => {
                const b = inv.bloque || 'Sin Bloque';
                const total = Number(inv.tabacos) * Number(inv.tallosPorTabaco);
                tallosInventarioPorBloque[b] = (tallosInventarioPorBloque[b] || 0) + total;
            });

            const todosBloques = [...new Set([...Object.keys(tallosCortadosPorBloque), ...Object.keys(tallosInventarioPorBloque)])];

            if (todosBloques.length === 0) {
                tbodyAuditoria.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400">No hay registros para auditar.</td></tr>`;
            } else {
                todosBloques.forEach(b => {
                    const cortados = Math.round(tallosCortadosPorBloque[b] || 0);
                    const ingresados = Math.round(tallosInventarioPorBloque[b] || 0);
                    const diferencia = ingresados - cortados;

                    let badgeDiferencia = `<span class="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">Exacto (0)</span>`;
                    if (diferencia > 0) {
                        badgeDiferencia = `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">+${diferencia.toLocaleString()} (Ingresó más)</span>`;
                    } else if (diferencia < 0) {
                        badgeDiferencia = `<span class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">${diferencia.toLocaleString()} (Pendiente de ingreso)</span>`;
                    }

                    tbodyAuditoria.innerHTML += `
                        <tr class="hover:bg-slate-50">
                            <td class="p-3 font-bold text-slate-800">${b}</td>
                            <td class="p-3 text-emerald-700 font-semibold">${cortados.toLocaleString()} tallos</td>
                            <td class="p-3 text-blue-700 font-semibold">${ingresados.toLocaleString()} tallos</td>
                            <td class="p-3">${badgeDiferencia}</td>
                        </tr>
                    `;
                });
            }
        }

        renderizarGraficoComparacion();

    } catch (err) {
        console.error('Error al renderizar cortadores y auditoría:', err);
    }
}

// Cálculo de horas efectivas restando descanso de 10:00 a 10:30 a.m. (0.5 hrs)
function calcularHorasEfectivas(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return 8;
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff <= 0) return 8;

    if (h1 <= 10 && h2 >= 10.5) {
        diff -= 0.5;
    }
    return diff > 0 ? diff : 8;
}

// Eliminar un registro de corte erróneo
async function eliminarCorte(id) {
    if (!confirm('¿Está seguro de eliminar este registro de corte?')) return;
    try {
        const res = await fetch(`/api/cortes/${id}`, { method: 'DELETE' });
        if (res.ok) {
            renderizarCortadores();
        } else {
            alert('No se pudo eliminar el registro.');
        }
    } catch (err) {
        console.error('Error de red al eliminar corte:', err);
    }
}

// Gestión de Cortadores (Agregar / Eliminar)
async function agregarCortadorDirecto() {
    const input = document.getElementById('nuevo-cortador-input');
    if (!input) return;
    const nombre = input.value.trim();
    if (!nombre) {
        alert('Ingrese el nombre del cortador.');
        return;
    }

    try {
        const res = await fetch('/api/cortadores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre })
        });

        if (res.ok) {
            input.value = '';
            renderizarCortadores();
        } else {
            alert('El cortador ya existe o no se pudo registrar.');
        }
    } catch (err) {
        console.error('Error al agregar cortador:', err);
    }
}

async function eliminarCortador(nombre) {
    if (!confirm(`¿Desea eliminar a "${nombre}" de la lista de cortadores?`)) return;
    try {
        const res = await fetch(`/api/cortadores/${encodeURIComponent(nombre)}`, { method: 'DELETE' });
        if (res.ok) {
            renderizarCortadores();
        } else {
            alert('No se pudo eliminar el cortador.');
        }
    } catch (err) {
        console.error('Error al eliminar cortador:', err);
    }
}

function renderizarChipsCortadores() {
    const contenedor = document.getElementById('lista-cortadores-chips');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (listaCortadores.length === 0) {
        contenedor.innerHTML = '<span class="text-xs text-gray-400">No hay cortadores registrados.</span>';
        return;
    }

    listaCortadores.forEach(c => {
        contenedor.innerHTML += `
            <div class="flex items-center gap-2 bg-slate-100 border px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
                <span>👤 ${c}</span>
                <button onclick="eliminarCortador('${c}')" class="text-red-500 hover:text-red-700 font-bold ml-1">✕</button>
            </div>
        `;
    });
}

function actualizarFiltrosCortadoresGrafico() {
    const container = document.getElementById('comp-cortadores-container');
    if (!container) return;
    
    const prevSel = Array.from(container.querySelectorAll('input[name="comp-cortador-chk"]:checked')).map(el => el.value);

    container.innerHTML = '';
    listaCortadores.forEach(c => {
        const isChecked = prevSel.length === 0 || prevSel.includes(c);
        container.innerHTML += `
            <label class="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 border rounded shadow-sm text-sm">
                <input type="checkbox" name="comp-cortador-chk" value="${c}" ${isChecked ? 'checked' : ''} onchange="renderizarGraficoComparacion()" class="rounded text-emerald-600">
                <span class="text-slate-700">${c}</span>
            </label>
        `;
    });
}

function renderizarGraficoComparacion() {
    const canvas = document.getElementById('graficoComparacionCortadores');
    if (!canvas) return;

    const periodo = document.getElementById('comp-periodo')?.value || 'dia';
    const fechaFiltro = document.getElementById('comp-fecha-filtro')?.value || '';
    const metaValor = Number(document.getElementById('comp-meta')?.value) || 150;

    const chks = document.querySelectorAll('input[name="comp-cortador-chk"]:checked');
    const cortadoresSeleccionados = Array.from(chks).map(el => el.value);

    const datosAgrupados = {};

    cortesData.forEach(c => {
        if (cortadoresSeleccionados.length > 0 && !cortadoresSeleccionados.includes(c.cortador)) {
            return;
        }

        if (periodo === 'dia' && fechaFiltro && c.fecha !== fechaFiltro) {
            return;
        }

        let etiqueta = c.fecha;
        if (periodo === 'semana' && c.fecha) {
            const d = new Date(c.fecha);
            const ano = d.getFullYear();
            const semana = Math.ceil((((d - new Date(ano, 0, 1)) / 86400000) + new Date(ano, 0, 1).getDay() + 1) / 7);
            etiqueta = `${ano}-S${semana}`;
        } else if (periodo === 'mes' && c.fecha) {
            etiqueta = c.fecha.substring(0, 7);
        }

        if (!datosAgrupados[c.cortador]) datosAgrupados[c.cortador] = {};
        if (!datosAgrupados[c.cortador][etiqueta]) datosAgrupados[c.cortador][etiqueta] = { tallos: 0, horas: 0 };

        const horas = calcularHorasEfectivas(c.horaInicio, c.horaFin);
        const tallos = c.tallosDirectos ? Number(c.tallosDirectos) : (Number(c.tabacos || 0) * Number(c.tallosPorTabaco || 0));

        datosAgrupados[c.cortador][etiqueta].tallos += tallos;
        datosAgrupados[c.cortador][etiqueta].horas += horas;
    });

    let todasEtiquetas = [];
    Object.keys(datosAgrupados).forEach(cortador => {
        Object.keys(datosAgrupados[cortador]).forEach(et => {
            if (!todasEtiquetas.includes(et)) todasEtiquetas.push(et);
        });
    });
    todasEtiquetas.sort();

    const colores = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
    let colorIndex = 0;

    const datasets = Object.keys(datosAgrupados).map(cortador => {
        const color = colores[colorIndex % colores.length];
        colorIndex++;

        const dataPuntos = todasEtiquetas.map(et => {
            const obj = datosAgrupados[cortador][et];
            if (!obj || obj.horas === 0) return 0;
            return Math.round(obj.tallos / obj.horas);
        });

        return {
            label: cortador,
            data: dataPuntos,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            tension: 0.2,
            fill: false
        };
    });

    datasets.push({
        label: `Meta (${metaValor} tallos/h)`,
        data: todasEtiquetas.map(() => metaValor),
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
    });

    if (graficoCompInstance) {
        graficoCompInstance.destroy();
    }

    graficoCompInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: todasEtiquetas,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Promedio Tallos / Hora' }
                },
                x: {
                    title: { display: true, text: periodo.toUpperCase() }
                }
            }
        }
    });
}

async function actualizarDropdownsCortadores() {
    const selects = document.querySelectorAll('.select-cortadores');
    selects.forEach(select => {
        const actual = select.value;
        select.innerHTML = '<option value="">-- Seleccione Cortador --</option>';
        
        listaCortadores.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
        });

        const optNuevo = document.createElement('option');
        optNuevo.value = '__NUEVO__';
        optNuevo.textContent = '+ Agregar nuevo cortador...';
        select.appendChild(optNuevo);

        if (actual) select.value = actual;

        select.onchange = async function() {
            if (this.value === '__NUEVO__') {
                const nuevoNombre = prompt('Ingrese el nombre del nuevo cortador:');
                if (nuevoNombre && nuevoNombre.trim() !== '') {
                    const limpio = nuevoNombre.trim();
                    if (!listaCortadores.includes(limpio)) {
                        listaCortadores.push(limpio);
                        await fetch('/api/cortadores', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nombre: limpio })
                        });
                    }
                    actualizarDropdownsCortadores();
                    actualizarFiltrosCortadoresGrafico();
                    renderizarChipsCortadores();
                    this.value = limpio;
                } else {
                    this.selectedIndex = 0;
                }
            }
        };
    });
}

async function guardarCorte(e) {
    e.preventDefault();
    const fecha = document.getElementById('sc-fecha').value;
    const cortador = document.getElementById('sc-cortador').value;
    const horaInicio = document.getElementById('sc-inicio').value;
    const horaFin = document.getElementById('sc-fin').value;
    const tallosDirectos = Number(document.getElementById('sc-tallos-directos').value);

    // Obtener bloques seleccionados por casillas múltiples
    const chksBloques = document.querySelectorAll('input[name="sc-bloque-chk"]:checked');
    const bloquesSel = Array.from(chksBloques).map(b => b.value);

    // Obtener variedades seleccionadas por casillas múltiples
    const chksVars = document.querySelectorAll('input[name="sc-variedad-chk"]:checked');
    const variedadesSel = Array.from(chksVars).map(v => v.value);

    if (!cortador || cortador === '__NUEVO__') {
        alert('Por favor seleccione un cortador válido.');
        return;
    }

    if (bloquesSel.length === 0) {
        alert('Por favor seleccione al menos un bloque de producción.');
        return;
    }

    if (variedadesSel.length === 0) {
        alert('Por favor seleccione al menos una variedad cortada.');
        return;
    }

    const bloqueTexto = bloquesSel.join(', ');
    const variedadTexto = variedadesSel.join(', ');

    const data = { 
        fecha, 
        cortador, 
        bloque: bloqueTexto,
        variedad: variedadTexto, 
        horaInicio, 
        horaFin, 
        tallosDirectos,
        tabacos: 0,
        tallosPorTabaco: 0
    };

    try {
        const res = await fetch('/api/cortes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            cerrarModal('modal-cortador');
            e.target.reset();
            document.getElementById('sc-fecha').valueAsDate = new Date();
            renderizarCortadores();
            alert('¡Rendimiento de corte guardado con éxito!');
        } else {
            alert('Error al guardar el corte.');
        }
    } catch (err) {
        console.error('Error de red:', err);
    }
}