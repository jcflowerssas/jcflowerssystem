let inventarioGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarInventario();

  const inputBuscar = document.getElementById('input-buscar');
  const filtroClasificacion = document.getElementById('filtro-clasificacion');
  const filtroGrado = document.getElementById('filtro-grado');
  const filtroAntiguedad = document.getElementById('filtro-antiguedad');

  if (inputBuscar) inputBuscar.addEventListener('input', filtrarYRenderizar);
  if (filtroClasificacion) filtroClasificacion.addEventListener('change', filtrarYRenderizar);
  if (filtroGrado) filtroGrado.addEventListener('change', filtrarYRenderizar);
  if (filtroAntiguedad) filtroAntiguedad.addEventListener('change', filtrarYRenderizar);
});

window.cargarInventario = function() {
    const tbody = document.getElementById('tabla-inventario-body');
    
    // 1. Cargar Entradas y Salidas buscando en todas las claves posibles
    const entradasRaw = JSON.parse(localStorage.getItem('app_entradas') || localStorage.getItem('entradas') || '[]');
    const salidasRaw = JSON.parse(localStorage.getItem('app_salidas') || localStorage.getItem('salidas') || '[]');

    // Función auxiliar para limpiar y estandarizar nombres de variedad
    const normalizarVariedad = (v) => {
        if (!v) return '';
        return String(v).toLowerCase().replace(/\(.*\)/g, '').trim();
    };

    const mapaStock = {};

    // 2. Acumular ENTRADAS
    entradasRaw.forEach(e => {
        const u = (e.ubicacion || '').trim().toLowerCase();
        const b = (e.bloque || '').trim().toLowerCase();
        const vNorm = normalizarVariedad(e.variedad);
        const g = (e.grado || '').trim().toLowerCase();

        const clave = `${u}_${b}_${vNorm}_${g}`;

        const tallos = Number(e.totalTallos) || Number(e.tallosDirectos) || (Number(e.tabacos || 0) * Number(e.tallosPorTabaco || 0)) || 0;
        const tabacos = Number(e.tabacos || 0);

        // Detectar Tipo (Rojo vs Color)
        const esRojo = vNorm.includes('freedom') || (e.tipo && e.tipo.toLowerCase() === 'rojo');
        const tipoFinal = esRojo ? 'Rojo' : 'Color';

        if (!mapaStock[clave]) {
            mapaStock[clave] = {
                ubicacion: e.ubicacion || '-',
                bloque: e.bloque || '-',
                variedad: e.variedad || '-',
                variedadNorm: vNorm,
                tipo: tipoFinal,
                grado: e.grado || '-',
                tallosPorTabaco: Number(e.tallosPorTabaco) || 40,
                entradasTallos: 0,
                salidasTallos: 0,
                entradasTabacos: 0,
                salidasTabacos: 0
            };
        }

        mapaStock[clave].entradasTallos += tallos;
        mapaStock[clave].entradasTabacos += tabacos;
    });

    // 3. Restar SALIDAS
    salidasRaw.forEach(s => {
        const u = (s.ubicacion || '').trim().toLowerCase();
        const b = (s.bloque || '').trim().toLowerCase();
        const vNorm = normalizarVariedad(s.variedad);
        const g = (s.grado || '').trim().toLowerCase();

        const clave = `${u}_${b}_${vNorm}_${g}`;

        const tallos = Number(s.totalTallos) || Number(s.tallosDirectos) || (Number(s.tabacos || 0) * Number(s.tallosPorTabaco || 0)) || 0;
        const tabacos = Number(s.tabacos || 0);

        if (!mapaStock[clave]) {
            const esRojo = vNorm.includes('freedom') || (s.tipo && s.tipo.toLowerCase() === 'rojo');
            mapaStock[clave] = {
                ubicacion: s.ubicacion || '-',
                bloque: s.bloque || '-',
                variedad: s.variedad || '-',
                variedadNorm: vNorm,
                tipo: esRojo ? 'Rojo' : 'Color',
                grado: s.grado || '-',
                tallosPorTabaco: Number(s.tallosPorTabaco) || 40,
                entradasTallos: 0,
                salidasTallos: 0,
                entradasTabacos: 0,
                salidasTabacos: 0
            };
        }

        mapaStock[clave].salidasTallos += tallos;
        mapaStock[clave].salidasTabacos += tabacos;
    });

    const items = Object.values(mapaStock);

    // 4. Actualizar las tarjetas de resumen (Resumen de Clasificación y Grado)
    actualizarTablaResumen(items);

    // 5. Renderizar en la tabla principal
    if (tbody) {
        tbody.innerHTML = '';

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay productos registrados en inventario.</td></tr>`;
            return;
        }

        items.forEach(item => {
            const tallosNetos = item.entradasTallos - item.salidasTallos;
            const tabacosNetos = item.entradasTabacos - item.salidasTabacos;

            const badgeTipo = item.tipo === 'Rojo' 
                ? '<span class="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">Rojo</span>'
                : '<span class="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">Color</span>';

            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-slate-50 text-sm text-slate-700';
            tr.innerHTML = `
                <td class="p-3 font-medium">${item.ubicacion}</td>
                <td class="p-3">${item.bloque}</td>
                <td class="p-3 font-bold text-slate-800">${item.variedad}</td>
                <td class="p-3">${badgeTipo}</td>
                <td class="p-3">${item.grado}</td>
                <td class="p-3">${tabacosNetos > 0 ? tabacosNetos : 0} tabacos</td>
                <td class="p-3 text-xs text-gray-500">${item.tallosPorTabaco} c/u</td>
                <td class="p-3 font-extrabold ${tallosNetos < 0 ? 'text-rose-600' : 'text-emerald-900'}">
                    ${tallosNetos.toLocaleString()} tallos
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
};

// Función para rellenar los datos de la tarjeta de Resumen por Grado
function actualizarTablaResumen(items) {
    // Estructura contenedora del resumen
    const resumen = {
        rojo: { g50: 0, g40: 0, nacional: 0, totalTallos: 0, totalTabacos: 0 },
        color: { g50: 0, g40: 0, nacional: 0, totalTallos: 0, totalTabacos: 0 }
    };

    items.forEach(item => {
        const tallos = item.entradasTallos - item.salidasTallos;
        const tabacos = item.entradasTabacos - item.salidasTabacos;
        
        if (tallos <= 0) return; // Solo sumar saldo positivo

        const cat = item.tipo === 'Rojo' ? resumen.rojo : resumen.color;
        const g = item.grado.toLowerCase();

        if (g.includes('50')) {
            cat.g50 += tallos;
        } else if (g.includes('40')) {
            cat.g40 += tallos;
        } else {
            cat.nacional += tallos;
        }

        cat.totalTallos += tallos;
        cat.totalTabacos += tabacos;
    });

    // Actualizar elementos HTML del Resumen si existen los IDs en la vista
    const setTexto = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };

    // Rojo (Freedom)
    setTexto('resumen-rojo-g50', `${resumen.rojo.g50.toLocaleString()} tallos`);
    setTexto('resumen-rojo-g40', `${resumen.rojo.g40.toLocaleString()} tallos`);
    setTexto('resumen-rojo-nac', `${resumen.rojo.nacional.toLocaleString()} tallos`);
    setTexto('resumen-rojo-total', `${resumen.rojo.totalTallos.toLocaleString()} tallos`);

    // Colores
    setTexto('resumen-color-g50', `${resumen.color.g50.toLocaleString()} tallos`);
    setTexto('resumen-color-g40', `${resumen.color.g40.toLocaleString()} tallos`);
    setTexto('resumen-color-nac', `${resumen.color.nacional.toLocaleString()} tallos`);
    setTexto('resumen-color-total', `${resumen.color.totalTallos.toLocaleString()} tallos`);
}

function esFreedom(variedad) {
  if (!variedad) return false;
  return variedad.trim().toLowerCase().includes('freedom');
}

function calcularMatrizTotales(items) {
  let matriz = {
    rojo: { g50: {tallos:0, tabacos:0}, g40: {tallos:0, tabacos:0}, nac: {tallos:0, tabacos:0}, total: {tallos:0, tabacos:0} },
    color: { g50: {tallos:0, tabacos:0}, g40: {tallos:0, tabacos:0}, nac: {tallos:0, tabacos:0}, total: {tallos:0, tabacos:0} },
    totales: { g50: {tallos:0, tabacos:0}, g40: {tallos:0, tabacos:0}, nac: {tallos:0, tabacos:0}, general: {tallos:0, tabacos:0} }
  };

  items.forEach(item => {
    const numTabacos = Number(item.tabacos) || 0;
    const tallosPorTabaco = Number(item.tallosPorTabaco) || 0;
    const totalTallos = numTabacos * tallosPorTabaco;
    const esRojo = esFreedom(item.variedad);
    const grado = String(item.grado || '').trim().toLowerCase();

    const destino = esRojo ? matriz.rojo : matriz.color;

    destino.total.tallos += totalTallos;
    destino.total.tabacos += numTabacos;

    if (grado.includes('50')) {
      destino.g50.tallos += totalTallos;
      destino.g50.tabacos += numTabacos;
    } else if (grado.includes('40')) {
      destino.g40.tallos += totalTallos;
      destino.g40.tabacos += numTabacos;
    } else {
      destino.nac.tallos += totalTallos;
      destino.nac.tabacos += numTabacos;
    }
  });

  ['g50', 'g40', 'nac', 'total'].forEach(k => {
    if(k === 'total') {
      matriz.totales.general.tallos = matriz.rojo.total.tallos + matriz.color.total.tallos;
      matriz.totales.general.tabacos = matriz.rojo.total.tabacos + matriz.color.total.tabacos;
    } else {
      matriz.totales[k].tallos = matriz.rojo[k].tallos + matriz.color[k].tallos;
      matriz.totales[k].tabacos = matriz.rojo[k].tabacos + matriz.color[k].tabacos;
    }
  });

  const pintarCelda = (id, obj) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `${obj.tallos.toLocaleString()} tallos<br><span class="text-gray-500 font-normal">(${obj.tabacos} tabacos)</span>`;
    }
  };

  pintarCelda('rojo-g50', matriz.rojo.g50);
  pintarCelda('rojo-g40', matriz.rojo.g40);
  pintarCelda('rojo-nac', matriz.rojo.nac);
  pintarCelda('rojo-total', matriz.rojo.total);

  pintarCelda('color-g50', matriz.color.g50);
  pintarCelda('color-g40', matriz.color.g40);
  pintarCelda('color-nac', matriz.color.nac);
  pintarCelda('color-total', matriz.color.total);

  pintarCelda('tot-g50', matriz.totales.g50);
  pintarCelda('tot-g40', matriz.totales.g40);
  pintarCelda('tot-nac', matriz.totales.nac);
  pintarCelda('tot-general', matriz.totales.general);
}

function filtrarYRenderizar() {
  const busqueda = document.getElementById('input-buscar')?.value.toLowerCase() || '';
  const filtroClasificacion = document.getElementById('filtro-clasificacion')?.value || 'todos';
  const filtroGrado = document.getElementById('filtro-grado')?.value || 'todos';
  const filtroAntiguedad = document.getElementById('filtro-antiguedad')?.value || 'todos';

  const tbody = document.getElementById('tabla-inventario-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const hoy = new Date();

  const filtrados = inventarioGlobal.filter(item => {
    const textoVariedad = (item.variedad || '').toLowerCase();
    const textoBloque = (item.bloque || '').toLowerCase();
    const textoUbicacion = (item.ubicacion || '').toLowerCase();

    const coincideBusqueda = textoVariedad.includes(busqueda) || 
                             textoBloque.includes(busqueda) ||
                             textoUbicacion.includes(busqueda);
    
    const esRojo = esFreedom(item.variedad);
    let coincideClasificacion = true;
    if (filtroClasificacion === 'freedom') coincideClasificacion = esRojo;
    if (filtroClasificacion === 'colores') coincideClasificacion = !esRojo;

    let coincideGrado = true;
    if (filtroGrado !== 'todos') {
      coincideGrado = String(item.grado || '').toLowerCase().includes(filtroGrado.toLowerCase());
    }

    let coincideAntiguedad = true;
    if (filtroAntiguedad !== 'todos' && item.fecha) {
      const fechaItem = new Date(item.fecha);
      const diferenciaDias = Math.floor((hoy - fechaItem) / (1000 * 60 * 60 * 24));

      if (filtroAntiguedad === 'hoy') coincideAntiguedad = diferenciaDias === 0;
      else if (filtroAntiguedad === '7dias') coincideAntiguedad = diferenciaDias <= 7;
      else if (filtroAntiguedad === '30dias') coincideAntiguedad = diferenciaDias <= 30;
    }

    return coincideBusqueda && coincideClasificacion && coincideGrado && coincideAntiguedad;
  });

  calcularMatrizTotales(filtrados);

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-400">No hay registros en el inventario.</td></tr>`;
    return;
  }

  filtrados.forEach(item => {
    const totalTallos = (Number(item.tabacos) || 0) * (Number(item.tallosPorTabaco) || 0);
    const esRojo = esFreedom(item.variedad);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 text-slate-700 border-b';

    tr.innerHTML = `
      <td class="p-3 text-xs font-semibold text-slate-600">${item.fecha || ''}</td>
      <td class="p-3 text-xs">${item.ubicacion || ''}</td>
      <td class="p-3 font-semibold">${item.bloque || ''}</td>
      <td class="p-3 font-bold">${item.variedad || ''}</td>
      <td class="p-3">
        <span class="px-2 py-1 text-xs rounded-full font-bold ${esRojo ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}">
          ${esRojo ? 'Rojo' : 'Color'}
        </span>
      </td>
      <td class="p-3 text-xs">${item.grado || ''}</td>
      <td class="p-3 font-semibold text-slate-800">${item.tabacos || 0} tabacos</td>
      <td class="p-3 text-xs text-slate-500">${item.tallosPorTabaco || 0} c/u</td>
      <td class="p-3 font-extrabold text-blue-900">${totalTallos} tallos</td>
      <td class="p-3 text-center">
        <button onclick="eliminarItem(${item.id})" class="px-2.5 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-xs font-bold">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function poblarSelectsEntrada() {
    if (typeof listasGlobales === 'undefined') return;

    const llenarSelect = (id, items) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const actual = sel.value;
        sel.innerHTML = `<option value="">-- Seleccione --</option>`;
        (items || []).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            sel.appendChild(opt);
        });
        if (actual) sel.value = actual;
    };

    llenarSelect('input-ubicacion', listasGlobales.ubicaciones);
    llenarSelect('input-bloque', listasGlobales.bloques);
    llenarSelect('input-variedad', listasGlobales.variedades);
    llenarSelect('input-grado', listasGlobales.grados);
}

async function guardarEntrada(e) {
    e.preventDefault();
    const nuevaEntrada = {
        fecha: document.getElementById('input-fecha-ingreso').value,
        ubicacion: document.getElementById('input-ubicacion').value,
        bloque: document.getElementById('input-bloque').value,
        variedad: document.getElementById('input-variedad').value,
        grado: document.getElementById('input-grado').value,
        tabacos: parseInt(document.getElementById('input-tabacos').value) || 0,
        tallosPorTabaco: parseInt(document.getElementById('input-tallos').value) || 40
    };

    try {
        const res = await fetch('/api/inventario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaEntrada)
        });

        if (res.ok) {
            cerrarModal('modal-entrada');
            e.target.reset();
            cargarInventario();
        } else {
            alert('No se pudo registrar la entrada.');
        }
    } catch (error) {
        console.error('Error al guardar entrada:', error);
    }
}

async function eliminarItem(id) {
  if (!confirm('¿Estás seguro de eliminar este registro del inventario?')) return;
  try {
    const res = await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
    if (res.ok) {
      cargarInventario();
    } else {
      alert('No se pudo eliminar el registro.');
    }
  } catch (error) {
    console.error('Error al eliminar:', error);
  }
}