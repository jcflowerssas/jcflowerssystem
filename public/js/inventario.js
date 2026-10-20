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
    if (!tbody) return;

    // Obtener entradas y salidas
    const entradas = JSON.parse(localStorage.getItem('app_entradas') || '[]');
    const salidas = JSON.parse(localStorage.getItem('app_salidas') || '[]');

    // Función para normalizar texto (convierte "Freedom (Rojo)" y "Freedom" al mismo texto)
    const normalizar = (txt) => {
        if (!txt) return '';
        return String(txt)
            .toLowerCase()
            .replace(/\(.*\)/g, '') // Elimina lo que esté entre paréntesis como (Rojo)
            .trim();
    };

    const mapaStock = {};

    // 1. Procesar ENTRADAS
    entradas.forEach(e => {
        const u = normalizar(e.ubicacion);
        const b = normalizar(e.bloque);
        const v = normalizar(e.variedad);
        const g = normalizar(e.grado);

        const clave = `${u}_${b}_${v}_${g}`;

        const tallos = Number(e.totalTallos) || Number(e.tallosDirectos) || (Number(e.tabacos || 0) * Number(e.tallosPorTabaco || 0)) || 0;
        const tabacos = Number(e.tabacos || 0);

        if (!mapaStock[clave]) {
            mapaStock[clave] = {
                ubicacion: e.ubicacion || '-',
                bloque: e.bloque || '-',
                variedad: e.variedad || '-',
                tipo: e.tipo || (v.includes('freedom') ? 'Rojo' : 'Color'),
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

    // 2. Procesar SALIDAS (Restar)
    salidas.forEach(s => {
        const u = normalizar(s.ubicacion);
        const b = normalizar(s.bloque);
        const v = normalizar(s.variedad);
        const g = normalizar(s.grado);

        const clave = `${u}_${b}_${v}_${g}`;

        const tallos = Number(s.totalTallos) || Number(s.tallosDirectos) || (Number(s.tabacos || 0) * Number(s.tallosPorTabaco || 0)) || 0;
        const tabacos = Number(s.tabacos || 0);

        if (!mapaStock[clave]) {
            mapaStock[clave] = {
                ubicacion: s.ubicacion || '-',
                bloque: s.bloque || '-',
                variedad: s.variedad || '-',
                tipo: s.tipo || (v.includes('freedom') ? 'Rojo' : 'Color'),
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

    // 3. Renderizar resultados
    tbody.innerHTML = '';
    const items = Object.values(mapaStock);

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">No hay productos registradas en el inventario.</td></tr>`;
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
};

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