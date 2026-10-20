// Valores por defecto (se usan solo si la base de datos está totalmente vacía)
const configuracionDefecto = {
    ubicaciones: ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Cuarto Frío Principal', 'Zona A', 'Zona B'],
    bloques: ['Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4', 'Bloque 5', 'Bloque 6'],
    variedades: ['Freedom (Rojo)', 'Vendela', 'Mondial', 'Gotcha', 'Explorer', 'Topaz'],
    grados: ['Grado 50', 'Grado 40', 'Nacional'],
    cortadores: ['Juan Pérez', 'María Gómez', 'Carlos Rodríguez', 'Ana Martínez']
};

// Obtener listas guardadas en producción sin sobrescribir nunca la información existente
function obtenerConfiguracion() {
    const configGuardada = localStorage.getItem('app_configuracion_listas');
    if (configGuardada) {
        try {
            const parsed = JSON.parse(configGuardada);
            // Validar que tenga las propiedades mínimas
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch (e) {
            console.error("Error al leer configuración de producción:", e);
        }
    }
    
    // Si no hay nada guardado, por primera vez podemos usar las por defecto o un objeto vacío seguro
    // (Aquí usamos las por defecto para que no inicie totalmente en blanco si es primera vez)
    return {
        ubicaciones: [],
        bloques: [],
        variedades: [],
        grados: [],
        cortadores: []
    };
}

// Cargar y mostrar los elementos actuales en la sección de configuración
window.cargarListasConfiguradas = function() {
    const config = obtenerConfiguracion();

    const mapaListas = {
        ubicaciones: 'lista-ubicaciones',
        bloques: 'lista-bloques',
        variedades: 'lista-variedades',
        grados: 'lista-grados',
        cortadores: 'lista-cortadores'
    };

    Object.keys(mapaListas).forEach(tipo => {
        const contenedor = document.getElementById(mapaListas[tipo]);
        if (!contenedor) return;

        contenedor.innerHTML = '';
        const elementos = config[tipo] || [];

        if (elementos.length === 0) {
            contenedor.innerHTML = '<li class="py-2 text-xs text-gray-400 italic">No hay elementos registrados</li>';
            return;
        }

        elementos.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition';
            li.innerHTML = `
                <span class="font-medium text-slate-700">${item}</span>
                <button type="button" onclick="eliminarItemConfig('${tipo}', ${index})" class="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 rounded hover:bg-rose-50 transition" title="Eliminar">
                    🗑️ Borrar
                </button>
            `;
            contenedor.appendChild(li);
        });
    });

    // Actualizar los selectores de los modales
    actualizarTodosLosSelects();
};

// Agregar un nuevo elemento sin recargar la página
window.agregarItemConfig = function(event, tipo) {
    if (event) {
        event.preventDefault(); // EVITA LA RECARGA DE LA PÁGINA
    }

    const input = document.getElementById(`nuevo-${tipo}`);
    if (!input) return;

    const valor = input.value.trim();
    if (!valor) return;

    const config = obtenerConfiguracion();
    if (!config[tipo]) config[tipo] = [];

    // Evitar duplicados
    if (!config[tipo].includes(valor)) {
        config[tipo].push(valor);
        localStorage.setItem('app_configuracion_listas', JSON.stringify(config));
        input.value = '';
        window.cargarListasConfiguradas();
    } else {
        alert('Este elemento ya existe en la lista.');
    }
};

// Eliminar un elemento
window.eliminarItemConfig = function(tipo, index) {
    const config = obtenerConfiguracion();
    if (config[tipo] && config[tipo][index] !== undefined) {
        config[tipo].splice(index, 1);
        localStorage.setItem('app_configuracion_listas', JSON.stringify(config));
        window.cargarListasConfiguradas();
    }
};

// Poblar automáticamente todos los dropdowns/selects de los formularios
window.actualizarTodosLosSelects = function() {
    const config = obtenerConfiguracion();

    const poblarSelect = (idSelect, lista, placeholder) => {
        const select = document.getElementById(idSelect);
        if (!select) return;
        const valorPrevio = select.value;
        select.innerHTML = `<option value="">-- ${placeholder} --</option>`;
        (lista || []).forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });
        if (valorPrevio) select.value = valorPrevio;
    };

    // Modal Entrada (IDs comunes)
    poblarSelect('input-ubicacion', config.ubicaciones, 'Seleccione Ubicación');
    poblarSelect('input-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('input-variedad', config.variedades, 'Seleccione Variedad');
    poblarSelect('input-grado', config.grados, 'Seleccione Grado');

    // Modal Salida (IDs comunes y prefijos ss-)
    poblarSelect('salida-ubicacion', config.ubicaciones, 'Seleccione Ubicación');
    poblarSelect('salida-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('salida-variedad', config.variedades, 'Seleccione Variedad');
    poblarSelect('salida-grado', config.grados, 'Seleccione Grado');
    
    poblarSelect('ss-ubicacion', config.ubicaciones, 'Seleccione Estiba');
    poblarSelect('ss-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('ss-variedad', config.variedades, 'Seleccione Variedad');
    poblarSelect('ss-grado', config.grados, 'Seleccione Grado');

    // Modal Cortadores
    poblarSelect('sc-cortador', config.cortadores, 'Seleccione Cortador');
    poblarSelect('sc-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('sc-variedad', config.variedades, 'Seleccione Variedad');
};

// Aliases globales para mantener compatibilidad con el resto del sistema
window.poblarSelectsEntrada = window.actualizarTodosLosSelects;
window.poblarSelectsSalidas = window.actualizarTodosLosSelects;
window.poblarSelectsCortador = window.actualizarTodosLosSelects;

// Ejecutar carga automática al abrir la página de configuración
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.cargarListasConfiguradas === 'function') {
        window.cargarListasConfiguradas();
    }
});

// Exportar un respaldo completo consultando al servidor y al almacenamiento local
window.exportarRespaldoSistema = async function() {
    const respaldo = {};

    try {
        // Consultar directamente al servidor para obtener los datos oficiales y actualizados
        const [resConfig, resEntradas, resSalidas, resCortes, resCortadores] = await Promise.all([
            fetch('/api/configuracion').catch(() => null),
            fetch('/api/entradas').catch(() => null),
            fetch('/api/salidas').catch(() => null),
            fetch('/api/cortes').catch(() => null),
            fetch('/api/cortadores').catch(() => null)
        ]);

        if (resConfig && resConfig.ok) respaldo['app_configuracion_listas'] = await resConfig.json();
        if (resEntradas && resEntradas.ok) respaldo['app_entradas'] = await resEntradas.json();
        if (resSalidas && resSalidas.ok) respaldo['app_salidas'] = await resSalidas.json();
        if (resCortes && resCortes.ok) respaldo['app_cortes'] = await resCortes.json();
        if (resCortadores && resCortadores.ok) respaldo['app_cortadores'] = await resCortadores.json();
    } catch (e) {
        console.warn('No se pudo conectar con el servidor para la exportación:', e);
    }

    // Respaldar también cualquier otra clave adicional en localStorage que empiece por 'app_'
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('app_') && !respaldo[key]) {
            try {
                respaldo[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
                respaldo[key] = localStorage.getItem(key);
            }
        }
    }

    // Crear y descargar el archivo JSON con toda la información unificada
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(respaldo, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const fechaActual = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `respaldo_sistema_san_sebastian_${fechaActual}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

// Importar y restaurar el respaldo completo desde un archivo JSON subido por el usuario
window.importarRespaldoSistema = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const contenido = e.target.result;
            const respaldo = JSON.parse(contenido);

            if (!respaldo || typeof respaldo !== 'object') {
                alert('El archivo seleccionado no tiene un formato válido.');
                return;
            }

            if (confirm('¿Estás seguro de restaurar este respaldo? Se sobrescribirán los datos actuales del sistema con los del archivo (incluyendo cortes, salidas y entradas).')) {
                // 1. Restaurar todas las claves en localStorage
                Object.keys(respaldo).forEach(key => {
                    const val = respaldo[key];
                    if (typeof val === 'object') {
                        localStorage.setItem(key, JSON.stringify(val));
                    } else {
                        localStorage.setItem(key, val);
                    }
                });

                // 2. Sincronizar listas de configuración con el servidor
                if (respaldo['app_configuracion_listas']) {
                    try {
                        await fetch('/api/configuracion', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(respaldo['app_configuracion_listas'])
                        });
                    } catch (err) {
                        console.warn('No se pudo sincronizar la configuración con el servidor:', err);
                    }
                }

                // Función auxiliar para enviar colecciones al servidor de manera ordenada
                const sincronizarColeccion = async (endpoint, arrayData) => {
                    if (Array.isArray(arrayData)) {
                        for (const item of arrayData) {
                            try {
                                await fetch(endpoint, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(item)
                                });
                            } catch (err) {
                                console.warn(`Error al sincronizar con ${endpoint}:`, err);
                            }
                        }
                    }
                };

                // 3. Sincronizar Entradas con el servidor
                await sincronizarColeccion('/api/entradas', respaldo['app_entradas']);

                // 4. Sincronizar Salidas con el servidor
                await sincronizarColeccion('/api/salidas', respaldo['app_salidas']);

                // 5. Sincronizar Cortes con el servidor
                await sincronizarColeccion('/api/cortes', respaldo['app_cortes']);

                // 6. Sincronizar Rendimiento de Cortadores con el servidor
                await sincronizarColeccion('/api/cortadores', respaldo['app_cortadores']);

                alert('¡Respaldo completo restaurado exitosamente (inventario, salidas, cortes y cortadores) en el navegador y en el servidor! La página se recargará.');
                location.reload();
            } else {
                event.target.value = '';
            }
        } catch (err) {
            console.error(err);
            alert('Error al leer el archivo JSON. Asegúrate de que sea un respaldo válido del sistema.');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
};