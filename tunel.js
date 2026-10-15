const { spawn } = require('child_process');

function iniciarTunel() {
    console.log('Iniciando túnel público...');
    
    // Ejecuta localtunnel con tu subdominio personalizado
    const tunnel = spawn('npx', ['localtunnel', '--port', '3000', '--subdomain', 'tomatessansebastian'], {
        shell: true,
        stdio: 'inherit'
    });

    tunnel.on('close', (code) => {
        console.log(`⚠️ El túnel se desconectó (código ${code}). Reintentando en 5 segundos...`);
        setTimeout(iniciarTunel, 5000); // Vuelve a intentar conectar pasados 5 segundos
    });

    tunnel.on('error', (err) => {
        console.error('Error en el túnel:', err);
        setTimeout(iniciarTunel, 5000);
    });
}

iniciarTunel();