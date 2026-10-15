let listasGlobales = { bloques: [], variedades: [], ubicaciones: [], grados: [] };

async function cargarListasConfiguradas() {
    try {
        const res = await fetch('/api/config/listas');
        if (res.ok) {
            listasGlobales = await res.json();
            poblarSelectsDinamicos();
        }
    } catch (err) {
        console.error("Error al cargar listas:", err);
    }
}

// Hacemos la función accesible globalmente
window.cargarListasConfiguradas = cargarListasConfiguradas;

function poblarSelectsDinamicos() {
    const llenarSelect = (id, items, esFiltro = false, textoDefault = 'Seleccione...') => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const actual = sel.value;
        
        sel.innerHTML = esFiltro ? `<option value="">Todos</option>` : `<option value="">-- ${textoDefault} --</option>`;
        
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            sel.appendChild(opt);
        });
        if (actual) sel.value = actual;
    };

    ['input-bloque', 'inc-bloque', 'sc-bloque'].forEach(id => llenarSelect(id, listasGlobales.bloques, false, 'Bloque'));
    ['filtro-bloque', 'filtro-grafico-bloque'].forEach(id => llenarSelect(id, listasGlobales.bloques, true));

    // Llenar filtro de ubicación y select de entrada
    llenarSelect('input-ubicacion', listasGlobales.ubicaciones, false, 'Ubicación');
    llenarSelect('filtro-ubicacion', listasGlobales.ubicaciones, true);

    const gradosFmt = listasGlobales.grados.map(g => g.startsWith('Grado') ? g : `Grado ${g}`);
    llenarSelect('input-grado', gradosFmt, false, 'Grado');
    llenarSelect('filtro-grado', gradosFmt, true);

    ['input-variedad', 'inc-variedad'].forEach(id => {
        llenarSelect(id, listasGlobales.variedades, false, 'Variedad');
    });

    const contenedorVar = document.getElementById('sc-variedades-container');
    if (contenedorVar) {
        contenedorVar.innerHTML = '';
        if (listasGlobales.variedades.length === 0) {
            contenedorVar.innerHTML = '<span class="text-xs text-gray-400">No hay variedades configuradas.</span>';
        } else {
            listasGlobales.variedades.forEach(v => {
                contenedorVar.innerHTML += `
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                        <input type="checkbox" name="sc-variedad-chk" value="${v}" class="rounded text-emerald-600 focus:ring-emerald-500">
                        <span class="text-slate-700 font-medium">${v}</span>
                    </label>
                `;
            });
        }
    }
}

function abrirModalAdmin() {
    const pass = prompt("Ingrese la contraseña de Administrador:");
    if (pass === null) return;
    if (pass !== 'admin123') {
        alert('Contraseña incorrecta.');
        return;
    }
    renderizarListasAdmin();
    document.getElementById('modal-admin').classList.remove('hidden');
}

function renderizarListasAdmin() {
    const contenedor = document.getElementById('admin-lista-elementos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const categorias = [
        { nombre: 'bloque', label: 'Bloques' },
        { nombre: 'variedad', label: 'Variedades' },
        { nombre: 'ubicacion', label: 'Ubicaciones' },
        { nombre: 'grado', label: 'Grados' }
    ];

    categorias.forEach(cat => {
        const items = cat.nombre === 'bloque' ? listasGlobales.bloques :
                      cat.nombre === 'variedad' ? listasGlobales.variedades :
                      cat.nombre === 'ubicacion' ? listasGlobales.ubicaciones : listasGlobales.grados;

        contenedor.innerHTML += `<p class="text-xs font-bold text-purple-800 mt-2">${cat.label}:</p>`;
        if (items.length === 0) {
            contenedor.innerHTML += `<p class="text-xs text-gray-400 italic pl-2">Sin elementos</p>`;
        } else {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'flex flex-wrap gap-1.5 pl-2 mb-1';
            items.forEach(item => {
                rowDiv.innerHTML += `
                    <span class="inline-flex items-center gap-1 bg-white border px-2 py-1 rounded shadow-sm text-xs font-medium text-slate-700">
                        ${item}
                        <button onclick="eliminarItemAdmin('${cat.nombre}', '${item}')" class="text-red-500 hover:text-red-700 font-bold ml-1">✕</button>
                    </span>
                `;
            });
            contenedor.appendChild(rowDiv);
        }
    });
}

async function agregarItemAdmin(e) {
    e.preventDefault();
    const categoria = document.getElementById('admin-cat').value;
    const valor = document.getElementById('admin-nuevo-valor').value.trim();
    const password = document.getElementById('admin-password-confirm').value;

    if (!valor) return;

    try {
        const res = await fetch('/api/config/listas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoria, valor, password })
        });

        if (res.ok) {
            document.getElementById('admin-nuevo-valor').value = '';
            document.getElementById('admin-password-confirm').value = '';
            await cargarListasConfiguradas();
            renderizarListasAdmin();
            alert('¡Elemento agregado exitosamente!');
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'No se pudo guardar'));
        }
    } catch (err) {
        alert('Error de conexión con el servidor.');
    }
}

async function eliminarItemAdmin(categoria, valor) {
    const pass = prompt(`Confirme la contraseña de Administrador para eliminar "${valor}":`);
    if (pass === null) return;
    if (pass !== 'admin123') {
        alert('Contraseña incorrecta.');
        return;
    }

    try {
        const res = await fetch(`/api/config/listas/${categoria}/${encodeURIComponent(valor)}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            await cargarListasConfiguradas();
            renderizarListasAdmin();
        } else {
            alert('No se pudo eliminar el elemento.');
        }
    } catch (err) {
        console.error('Error al eliminar elemento de lista:', err);
    }
}