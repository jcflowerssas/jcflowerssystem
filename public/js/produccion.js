let graficoProduccionInstance = null;

async function renderizarGraficoProduccion() {
    const canvas = document.getElementById('graficoProduccion');
    if (!canvas) return;

    try {
        const res = await fetch('/api/inventario');
        const inventarioData = res.ok ? await res.json() : [];

        const periodoRadio = document.querySelector('input[name="periodoGrafico"]:checked')?.value || 'diario';
        const filtroDia = document.getElementById('filtro-produccion-dia')?.value || '';
        const filtroMes = document.getElementById('filtro-produccion-mes')?.value || '';
        const filtroAnio = document.getElementById('filtro-produccion-anio')?.value || '';
        const filtroBloque = document.getElementById('filtro-grafico-bloque')?.value || '';

        const datosAgrupados = {};

        // Procesar exclusivamente los datos del Inventario del Cuarto Frío
        inventarioData.forEach(item => {
            if (!item.fecha) return;
            const [ano, mes, dia] = item.fecha.split('-');
            
            // Aplicar filtros seleccionados
            if (filtroBloque && item.bloque !== filtroBloque) return;
            if (periodoRadio === 'diario' && filtroDia && item.fecha !== filtroDia) return;
            if (periodoRadio === 'mensual' && filtroAnio && ano !== filtroAnio) return;
            if (periodoRadio === 'mensual' && filtroMes && mes !== filtroMes) return;
            if (periodoRadio === 'anual' && filtroAnio && ano !== filtroAnio) return;

            // Definir etiqueta según el periodo seleccionado
            let etiqueta = item.fecha;
            if (periodoRadio === 'mensual') etiqueta = `${ano}-${mes}`;
            if (periodoRadio === 'anual') etiqueta = `${ano}`;

            // Calcular total de tallos (tabacos * tallosPorTabaco)
            const totalTallos = Number(item.tabacos || 0) * Number(item.tallosPorTabaco || 40);
            datosAgrupados[etiqueta] = (datosAgrupados[etiqueta] || 0) + totalTallos;
        });

        let etiquetas = Object.keys(datosAgrupados).sort();
        let valores = etiquetas.map(et => Math.round(datosAgrupados[et]));

        if (graficoProduccionInstance) {
            graficoProduccionInstance.destroy();
        }

        graficoProduccionInstance = new Chart(canvas, {
            type: 'line', // Tipo línea para lograr el estilo de tendencia con área
            data: {
                labels: etiquetas,
                datasets: [{
                    label: filtroBloque ? `Inventario Cuarto Frío - ${filtroBloque}` : 'Inventario Cuarto Frío - Total Tallos',
                    data: valores,
                    borderColor: '#4338ca', // Tono índigo/morado oscuro para la línea superior
                    backgroundColor: 'rgba(67, 56, 202, 0.25)', // Área sombreada semitransparente
                    borderWidth: 2,
                    fill: true, // Habilita el sombreado debajo de la línea
                    tension: 0.2, // Suaviza ligeramente la curva
                    pointRadius: 4,
                    pointBackgroundColor: '#4338ca'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.08)' // Líneas de cuadrícula sutiles de fondo
                        },
                        title: { display: true, text: 'Cantidad Total de Tallos' }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.08)'
                        },
                        title: { display: true, text: periodoRadio.toUpperCase() }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

    } catch (err) {
        console.error('Error al generar gráfico de producción estilizado:', err);
    }
}

// Inicializar vista de producción al cargar
window.addEventListener('DOMContentLoaded', () => {
    const fechaInput = document.getElementById('filtro-produccion-dia');
    if (fechaInput && !fechaInput.value) {
        fechaInput.valueAsDate = new Date();
    }
});