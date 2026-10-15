document.addEventListener('DOMContentLoaded', () => {
  cargarInventario();

  const inputBuscar = document.getElementById('input-buscar');
  const filtroClasificacion = document.getElementById('filtro-clasificacion');
  const filtroGrado = document.getElementById('filtro-grado');

  if (inputBuscar) inputBuscar.addEventListener('input', filtrarYRenderizar);
  if (filtroClasificacion) filtroClasificacion.addEventListener('change', filtrarYRenderizar);
  if (filtroGrado) filtroGrado.addEventListener('change', filtrarYRenderizar);
});

let inventarioGlobal = [];

async function cargarInventario() {
  try {
    const res = await fetch('/api/inventario'); // Ajusta la ruta según tu backend si es diferente
    inventarioGlobal = await res.json();
    filtrarYRenderizar();
  } catch (error) {
    console.error('Error al cargar el inventario:', error);
  }
}

function esFreedom(variedad) {
  if (!variedad) return false;
  return variedad.trim().toLowerCase() === 'freedom';
}

function calcularMatrizTotales(items) {
  let matriz = {
    rojo: { g50: 0, g40: 0, nac: 0, total: 0 },
    color: { g50: 0, g40: 0, nac: 0, total: 0 },
    totales: { g50: 0, g40: 0, nac: 0, general: 0 }
  };

  items.forEach(item => {
    const totalTallos = (item.tabacos || 0) * (item.tallosPorTabaco || 0);
    const esRojo = esFreedom(item.variedad);
    const grado = String(item.grado || '').trim().toLowerCase();

    if (esRojo) {
      matriz.rojo.total += totalTallos;
      if (grado === '50' || grado.includes('50')) matriz.rojo.g50 += totalTallos;
      else if (grado === '40' || grado.includes('40')) matriz.rojo.g40 += totalTallos;
      else matriz.rojo.nac += totalTallos;
    } else {
      matriz.color.total += totalTallos;
      if (grado === '50' || grado.includes('50')) matriz.color.g50 += totalTallos;
      else if (grado === '40' || grado.includes('40')) matriz.color.g40 += totalTallos;
      else matriz.color.nac += totalTallos;
    }
  });

  matriz.totales.g50 = matriz.rojo.g50 + matriz.color.g50;
  matriz.totales.g40 = matriz.rojo.g40 + matriz.color.g40;
  matriz.totales.nac = matriz.rojo.nac + matriz.color.nac;
  matriz.totales.general = matriz.rojo.total + matriz.color.total;

  // Actualizar la interfaz visual de la matriz si existen los elementos
  actualizarElementoDOM('rojo-g50', matriz.rojo.g50);
  actualizarElementoDOM('rojo-g40', matriz.rojo.g40);
  actualizarElementoDOM('rojo-nac', matriz.rojo.nac);
  actualizarElementoDOM('rojo-total', matriz.rojo.total);

  actualizarElementoDOM('color-g50', matriz.color.g50);
  actualizarElementoDOM('color-g40', matriz.color.g40);
  actualizarElementoDOM('color-nac', matriz.color.nac);
  actualizarElementoDOM('color-total', matriz.color.total);

  actualizarElementoDOM('tot-g50', matriz.totales.g50);
  actualizarElementoDOM('tot-g40', matriz.totales.g40);
  actualizarElementoDOM('tot-nac', matriz.totales.nac);
  actualizarElementoDOM('tot-general', matriz.totales.general);
}

function actualizarElementoDOM(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function filtrarYRenderizar() {
  const busqueda = document.getElementById('input-buscar')?.value.toLowerCase() || '';
  const filtroClasificacion = document.getElementById('filtro-clasificacion')?.value || 'todos';
  const filtroGrado = document.getElementById('filtro-grado')?.value || 'todos';

  const tbody = document.getElementById('tabla-inventario-body');
  if (!tbody) return;
  tbody.innerHTML = '';

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
      coincideGrado = String(item.grado || '').toLowerCase() === filtroGrado.toLowerCase();
    }

    return coincideBusqueda && coincideClasificacion && coincideGrado;
  });

  // Recalcular métricas de la matriz superior
  calcularMatrizTotales(filtrados);

  // Renderizar filas de la tabla
  filtrados.forEach(item => {
    const totalTallos = (item.tabacos || 0) * (item.tallosPorTabaco || 0);
    const esRojo = esFreedom(item.variedad);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 text-slate-700';

    tr.innerHTML = `
      <td class="p-3">${item.fecha || ''}</td>
      <td class="p-3">${item.ubicacion || ''}</td>
      <td class="p-3 font-semibold">${item.bloque || ''}</td>
      <td class="p-3 font-bold">${item.variedad || ''}</td>
      <td class="p-3">
        <span class="px-2 py-1 text-xs rounded-full font-bold ${esRojo ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}">
          ${esRojo ? 'Rojo' : 'Color'}
        </span>
      </td>
      <td class="p-3">${item.grado || ''}</td>
      <td class="p-3">${item.tabacos || 0}</td>
      <td class="p-3">${item.tallosPorTabaco || 0}</td>
      <td class="p-3 font-extrabold text-blue-900">${totalTallos}</td>
      <td class="p-3 text-center">
        <button onclick="eliminarItem(${item.id})" class="text-rose-600 hover:text-rose-800 font-bold text-xs">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function eliminarItem(id) {
  if (!confirm('¿Estás seguro de eliminar este registro?')) return;
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