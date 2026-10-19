// Valores por defecto si la base de datos local está vacía
const configuracionDefecto = {
    ubicaciones: ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Cuarto Frío Principal', 'Zona A', 'Zona B'],
    bloques: ['Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4', 'Bloque 5', 'Bloque 6'],
    variedades: ['Freedom (Rojo)', 'Vendela', 'Mondial', 'Gotcha', 'Explorer', 'Topaz'],
    grados: ['Grado 50', 'Grado 40', 'Nacional'],
    cortadores: ['Juan Pérez', 'María Gómez', 'Carlos Rodríguez', 'Ana Martínez']
};

// Obtener listas guardadas o usar las por defecto
// Obtener listas guardadas en producción sin sobrescribir nunca la información existente
function obtenerConfiguracion() {
    const configGuardada = localStorage.getItem('app_configuracion_listas');
    if (configGuardada) {
        try {
            return JSON.parse(configGuardada);
        } catch (e) {
            console.error("Error al leer configuración de producción:", e);
        }
    }
    
    // Si la base de datos está totalmente vacía por primera vez, inicializa un objeto vacío.
    // NUNCA restablece ni pisa listas existentes con valores por defecto en actualizaciones.
    const configVacia = {
        ubicaciones: [],
        bloques: [],
        variedades: [],
        grados: [],
        cortadores: []
    };
    return configVacia;
}

// Cargar y renderizar los elementos actuales en la sección de configuración
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

    // Actualizar los dropdowns/selects en todos los modales de la aplicación
    actualizarTodosLosSelects();
};

// Agregar un nuevo elemento conservando estrictamente la lista de producción
window.agregarItemConfig = function(event, tipo) {
    if (event) {
        event.preventDefault(); // Evita recargar la página
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

// Eliminar un elemento manteniendo el resto de la base de datos de producción intacta
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
    console.log("Datos de configuración leídos:", config); // Muestra en F12 si hay datos

    // Modal Cortadores (Contenedores de Selección Múltiple con Checkbox)
    const contBloques = document.getElementById('sc-bloques-contenedor');
    if (contBloques) {
        contBloques.innerHTML = '';
        if (!config.bloques || config.bloques.length === 0) {
            contBloques.innerHTML = '<p class="text-xs text-rose-500 italic">No hay bloques registrados en el sistema. Agréguelos en Configurar Listas.</p>';
        } else {
            config.bloques.forEach((b) => {
                contBloques.innerHTML += `
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                        <input type="checkbox" name="sc-bloque-check" value="${b}" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4">
                        <span class="text-slate-700 font-medium text-sm">${b}</span>
                    </label>
                `;
            });
        }
    }

    const contVariedades = document.getElementById('sc-variedades-contenedor');
    if (contVariedades) {
        contVariedades.innerHTML = '';
        if (!config.variedades || config.variedades.length === 0) {
            contVariedades.innerHTML = '<p class="text-xs text-rose-500 italic">No hay variedades registradas en el sistema. Agréguelas en Configurar Listas.</p>';
        } else {
            config.variedades.forEach((v) => {
                contVariedades.innerHTML += `
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                        <input type="checkbox" name="sc-variedad-check" value="${v}" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4">
                        <span class="text-slate-700 font-medium text-sm">${v}</span>
                    </label>
                `;
            });
        }
    }

    // Poblar selectores simples (como el de cortadores)
    const selectCortador = document.getElementById('sc-cortador');
    if (selectCortador) {
        selectCortador.innerHTML = '<option value="">-- Seleccione Cortador --</option>';
        (config.cortadores || []).forEach(c => {
            selectCortador.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
};

window.poblarSelectsCortador = window.actualizarTodosLosSelects;
window.poblarSelectsEntrada = window.actualizarTodosLosSelects;
window.poblarSelectsSalidas = window.actualizarTodosLosSelects;

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
                    🗑️ Ocultar / Borrar
                </button>
            `;
            contenedor.appendChild(li);
        });
    });

    // Actualizar los selectores de los modales de entrada, salida y cortadores
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

    // Modal Entrada
    poblarSelect('input-ubicacion', config.ubicaciones, 'Seleccione Ubicación');
    poblarSelect('input-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('input-variedad', config.variedades, 'Seleccione Variedad');
    poblarSelect('input-grado', config.grados, 'Seleccione Grado');

    // Modal Salida
    poblarSelect('salida-ubicacion', config.ubicaciones, 'Seleccione Ubicación');
    poblarSelect('salida-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('salida-variedad', config.variedades, 'Seleccione Variedad');
    poblarSelect('salida-grado', config.grados, 'Seleccione Grado');

    // Modal Cortadores
    poblarSelect('sc-cortador', config.cortadores, 'Seleccione Cortador');
    poblarSelect('sc-bloque', config.bloques, 'Seleccione Bloque');
    poblarSelect('sc-variedad', config.variedades, 'Seleccione Variedad');
};

// Aliases para los modales
window.poblarSelectsEntrada = window.actualizarTodosLosSelects;
window.poblarSelectsSalidas = window.actualizarTodosLosSelects;
window.poblarSelectsCortador = window.actualizarTodosLosSelects;