const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y archivos estáticos
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE RUTAS Y PERSISTENCIA (FLY.IO vs LOCAL) ---
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME;
const dataDir = isProduction ? '/app/data' : __dirname;

// Si estamos en producción y la carpeta /app/data no existe, la crea
if (isProduction && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Opción A: Copia automática de tus datos locales al volumen persistente en el primer arranque
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

console.log(`📂 Usando base de datos principal en: ${dbPath}`);
console.log(`📂 Usando base de datos de tabacos en: ${tobacosPath}`);

// --- CONEXIÓN A BASE DE DATOS 1: Inventario (database.sqlite) ---
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con database.sqlite:', err.message);
  } else {
    console.log('Conectado a database.sqlite exitosamente.');
    // Crear tabla principal si no existe
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
  }
});

// --- CONEXIÓN A BASE DE DATOS 2: Tabacos Incompletos (tobacos.db) ---
const dbTobacos = new sqlite3.Database(tobacosPath, (err) => {
  if (err) {
    console.error('Error al conectar con tobacos.db:', err.message);
  } else {
    console.log('Conectado a tobacos.db exitosamente.');
    dbTobacos.run(`CREATE TABLE IF NOT EXISTS incompletos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT,
      cantidad INTEGER
    )`);
  }
});

// ==========================================
// RUTAS DE LA API (INVENTARIO Y GESTIÓN)
// ==========================================

// Obtener todo el inventario
app.get('/api/inventario', (req, res) => {
  db.all("SELECT * FROM inventario", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Agregar un nuevo registro al inventario
app.post('/api/inventario', (req, res) => {
  const { fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco } = req.body;
  const query = `INSERT INTO inventario (fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [fecha, ubicacion, bloque, variedad, grado, tabacos, tallosPorTabaco], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Registrado correctamente' });
  });
});

// Eliminar un registro del inventario
app.delete('/api/inventario/:id', (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM inventario WHERE id = ?`, id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});