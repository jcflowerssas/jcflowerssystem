const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Directorio para almacenamiento persistente de datos (con soporte para volumen en Railway)
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Rutas de archivos JSON de almacenamiento dentro del volumen persistente
const ARCHIVOS = {
    entradas: path.join(DATA_DIR, 'entradas.json'),
    salidas: path.join(DATA_DIR, 'salidas.json'),
    cortes: path.join(DATA_DIR, 'cortes.json'),
    cortadores: path.join(DATA_DIR, 'cortadores.json'),
    configuracion: path.join(DATA_DIR, 'configuracion.json')
};

// Funciones auxiliares para leer y escribir datos de forma segura
function leerJSON(nombreArchivo) {
    if (!fs.existsSync(nombreArchivo)) return [];
    try {
        const contenido = fs.readFileSync(nombreArchivo, 'utf8');
        return JSON.parse(contenido);
    } catch (error) {
        console.error(`Error leyendo ${nombreArchivo}:`, error);
        return [];
    }
}

function guardarJSON(nombreArchivo, datos) {
    try {
        fs.writeFileSync(nombreArchivo, JSON.stringify(datos, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error guardando ${nombreArchivo}:`, error);
        return false;
    }
}


// ==========================================
// 1. ENDPOINTS DE ENTRADAS (/api/entradas)
// ==========================================
app.get('/api/entradas', (req, res) => {
    const entradas = leerJSON(ARCHIVOS.entradas);
    res.json(entradas);
});

app.post('/api/entradas', (req, res) => {
    const entradas = leerJSON(ARCHIVOS.entradas);
    const nuevaEntrada = {
        id: req.body.id || Date.now().toString(),
        fecha: req.body.fecha || new Date().toISOString().split('T')[0],
        ubicacion: req.body.ubicacion || '',
        bloque: req.body.bloque || '',
        variedad: req.body.variedad || '',
        grado: req.body.grado || '',
        tabacos: Number(req.body.tabacos) || 0,
        tallosPorTabaco: Number(req.body.tallosPorTabaco) || 40,
        totalTallos: Number(req.body.totalTallos) || (Number(req.body.tabacos || 0) * Number(req.body.tallosPorTabaco || 40))
    };

    entradas.unshift(nuevaEntrada);
    guardarJSON(ARCHIVOS.entradas, entradas);
    res.status(201).json({ success: true, data: nuevaEntrada });
});

app.delete('/api/entradas/:id', (req, res) => {
    let entradas = leerJSON(ARCHIVOS.entradas);
    entradas = entradas.filter(e => String(e.id) !== String(req.params.id));
    guardarJSON(ARCHIVOS.entradas, entradas);
    res.json({ success: true, message: 'Entrada eliminada' });
});


// ==========================================
// 2. ENDPOINTS DE SALIDAS (/api/salidas)
// ==========================================
app.get('/api/salidas', (req, res) => {
    const salidas = leerJSON(ARCHIVOS.salidas);
    res.json(salidas);
});

app.post('/api/salidas', (req, res) => {
    const salidas = leerJSON(ARCHIVOS.salidas);
    const nuevaSalida = {
        id: req.body.id || Date.now().toString(),
        fecha: req.body.fecha || new Date().toISOString().split('T')[0],
        ubicacion: req.body.ubicacion || '',
        bloque: req.body.bloque || '',
        variedad: req.body.variedad || '',
        grado: req.body.grado || '',
        tabacos: Number(req.body.tabacos) || 0,
        tallosPorTabaco: Number(req.body.tallosPorTabaco) || 40,
        totalTallos: Number(req.body.totalTallos) || (Number(req.body.tabacos || 0) * Number(req.body.tallosPorTabaco || 40))
    };

    salidas.unshift(nuevaSalida);
    guardarJSON(ARCHIVOS.salidas, salidas);
    res.status(201).json({ success: true, data: nuevaSalida });
});

app.delete('/api/salidas/:id', (req, res) => {
    let salidas = leerJSON(ARCHIVOS.salidas);
    salidas = salidas.filter(s => String(s.id) !== String(req.params.id));
    guardarJSON(ARCHIVOS.salidas, salidas);
    res.json({ success: true, message: 'Salida eliminada' });
});


// ==========================================
// 3. ENDPOINTS DE CORTES (/api/cortes)
// ==========================================
app.get('/api/cortes', (req, res) => {
    const cortes = leerJSON(ARCHIVOS.cortes);
    res.json(cortes);
});

app.post('/api/cortes', (req, res) => {
    const cortes = leerJSON(ARCHIVOS.cortes);
    const nuevoCorte = { id: req.body.id || Date.now().toString(), ...req.body };
    cortes.unshift(nuevoCorte);
    guardarJSON(ARCHIVOS.cortes, cortes);
    res.status(201).json({ success: true, data: nuevoCorte });
});

app.delete('/api/cortes/:id', (req, res) => {
    let cortes = leerJSON(ARCHIVOS.cortes);
    cortes = cortes.filter(c => String(c.id) !== String(req.params.id));
    guardarJSON(ARCHIVOS.cortes, cortes);
    res.json({ success: true, message: 'Corte eliminado' });
});


// ==========================================
// 4. ENDPOINTS DE CORTADORES Y CONFIGURACIÓN
// ==========================================
app.get('/api/cortadores', (req, res) => {
    const cortadores = leerJSON(ARCHIVOS.cortadores);
    res.json(cortadores);
});

app.post('/api/cortadores', (req, res) => {
    guardarJSON(ARCHIVOS.cortadores, req.body);
    res.json({ success: true });
});

app.get('/api/configuracion', (req, res) => {
    const config = leerJSON(ARCHIVOS.configuracion);
    res.json(config);
});

app.post('/api/configuracion', (req, res) => {
    guardarJSON(ARCHIVOS.configuracion, req.body);
    res.json({ success: true });
});


// Ruta comodín para SPA (devuelve index.html para cualquier ruta no mapeada)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});