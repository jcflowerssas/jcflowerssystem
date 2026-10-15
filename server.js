const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE PERSISTENCIA (RAILWAY VS LOCAL) ---
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME;
const dataDir = isProduction ? '/app/data' : __dirname;

if (isProduction && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (isProduction) {
  const archivosBase = ['database.sqlite', 'tobacos.db'];
  archivosBase.forEach(archivo => {
    const origenLocal = path.join(__dirname, archivo);
    const destinoPersistente = path.join(dataDir, archivo);
    if (fs.existsSync(origenLocal) && !fs.existsSync(destinoPersistente)) {
      fs.copyFileSync(origenLocal, destinoPersistente);
      console.log(`✅ Se migró con éxito ${archivo} al disco persistente.`);
    }
  });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const tobacosPath = path.join(dataDir, 'tobacos.db');

// --- CONEXIÓN BASE DE DATOS 1: Inventario y Salidas ---
const db = new sqlite3.Database(dbPath, (err) => {
  if (!err) {
    db.run(`CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      ubicacion TEXT,
      bloque TEXT,
      variedad TEXT,
      grado TEXT,
      tabacos INTEGER,
      tallosPorTabaco INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS salidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      ubicacion TEXT,
      bloque TEXT,
      variedad TEXT,
      grado TEXT,
      tabacos INTEGER,
      tallosPorTabaco INTEGER
    )`);
  }
});

// --- CONEXIÓN BASE DE DATOS 2: Tabacos, Cortes y Cortadores ---
const dbTobacos = new sqlite3.Database(tobacosPath, (err) => {
  if (!err) {
    dbTobacos.run(`CREATE TABLE IF NOT EXISTS incompletos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      bloque TEXT,
      ubicacion TEXT,
      variedad TEXT,
      grado TEXT,
      tallosActuales INTEGER,
      tallosMeta INTEGER,
      cortador TEXT
    )`);
    dbTobacos.run(`CREATE TABLE IF NOT EXISTS cortes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      cortador TEXT,
      bloque TEXT,
      variedad TEXT,
      horaInicio TEXT,
      horaFin TEXT,
      tallosDirectos INTEGER,
      tabacos INTEGER,
      tallosPorTabaco INTEGER
    )`);
    dbTobacos.run(`CREATE TABLE IF NOT EXISTS cortadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE
    )`);
  }
});

// --- RUTAS API - INVENTARIO PRINCIPAL ---
app.get('/api/inventario', (req, res) => {
  db.all("SELECT * FROM inventario", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/inventario', (req, res) => {
  const { fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco } = req.body;
  const query = `INSERT INTO inventario (fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Registrado correctamente' });
  });
});

app.delete('/api/inventario/:id', (req, res) => {
  db.run(`DELETE FROM inventario WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// --- RUTAS API - SALIDAS DE PRODUCTO ---
app.get('/api/salidas', (req, res) => {
  db.all("SELECT * FROM salidas", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/salidas', (req, res) => {
  const { fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco } = req.body;
  const query = `INSERT INTO salidas (fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Salida registrada correctamente' });
  });
});

app.delete('/api/salidas/:id', (req, res) => {
  db.run(`DELETE FROM salidas WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// --- RUTAS API - TABACOS INCOMPLETOS ---
app.get('/api/incompletos', (req, res) => {
  dbTobacos.all("SELECT * FROM incompletos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/incompletos', (req, res) => {
  const { fecha, bloque, ubicacion, variedad, grado, tallosActuales, tallosMeta, cortador } = req.body;
  const query = `INSERT INTO incompletos (fecha, bloque, ubicacion, variedad, grado, tallosActuales, tallosMeta, cortador) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  dbTobacos.run(query, [fecha, bloque, ubicacion, variedad, grado, tallosActuales, tallosMeta, cortador], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.delete('/api/incompletos/:id', (req, res) => {
  dbTobacos.run(`DELETE FROM incompletos WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// --- RUTAS API - CORTES Y CORTADORES ---
app.get('/api/cortes', (req, res) => {
  dbTobacos.all("SELECT * FROM cortes", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/cortes', (req, res) => {
  const { fecha, cortador, bloque, variedad, horaInicio, horaFin, tallosDirectos, tabacos, tallosPorTabaco } = req.body;
  const query = `INSERT INTO cortes (fecha, cortador, bloque, variedad, horaInicio, horaFin, tallosDirectos, tabacos, tallosPorTabaco) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  dbTobacos.run(query, [fecha, cortador, bloque, variedad, horaInicio, horaFin, tallosDirectos, tabacos, tallosPorTabaco], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.delete('/api/cortes/:id', (req, res) => {
  dbTobacos.run(`DELETE FROM cortes WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.get('/api/cortadores', (req, res) => {
  dbTobacos.all("SELECT * FROM cortadores", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/cortadores', (req, res) => {
  const { nombre } = req.body;
  dbTobacos.run(`INSERT OR IGNORE INTO cortadores (nombre) VALUES (?)`, [nombre], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.delete('/api/cortadores/:nombre', (req, res) => {
  dbTobacos.run(`DELETE FROM cortadores WHERE nombre = ?`, req.params.nombre, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.get('/api/config/listas', (req, res) => {
  res.json({
    bloques: ['Bloque 1', 'Bloque 2', 'Bloque 3'],
    variedades: ['Freedom (Rojo)', 'Mondial', 'Gotcha', 'Explorer'],
    ubicaciones: ['Cuarto Frío 1', 'Cuarto Frío 2'],
    grados: ['Grado 50', 'Grado 40', 'Nacional']
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});