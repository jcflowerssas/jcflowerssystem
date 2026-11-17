// Tema JC Flowers: verde oscuro y blanco. Se carga justo después del script de Tailwind en cada página.
// Para ajustar el verde de toda la app, cambia la paleta VERDE (el tono 800 es el verde del logo).
(function () {
    const VERDE = {
        "50": "#f4f8f6",
        "100": "#e7f0ec",
        "200": "#cfe3d9",
        "300": "#a4ccb8",
        "400": "#63b08a",
        "500": "#3f8d66",
        "600": "#2c6d4d",
        "700": "#1f5138",
        "800": "#163827",
        "900": "#10251b"
};
    const NEUTRO = {
        "50": "#f9faf9",
        "100": "#f4f6f5",
        "200": "#e9eceb",
        "300": "#d5dcd9",
        "400": "#9baba3",
        "500": "#61756b",
        "600": "#54645c",
        "700": "#3f4b45",
        "800": "#2a322e",
        "900": "#1a1f1c"
};
    const ROSA = {
        "50": "#fbf1f2",
        "100": "#f6dde0",
        "200": "#eebcc3",
        "300": "#e28f9b",
        "400": "#d0606f",
        "500": "#bc4155",
        "600": "#a3304a",
        "700": "#86263d",
        "800": "#6e2335",
        "900": "#5a2030"
};      // rojos de avisos y salidas, en un tono granate
    const DORADO = {
        "50": "#fbf7ec",
        "100": "#f5ecd2",
        "200": "#ebdaa9",
        "300": "#dcc17e",
        "400": "#c9a85b",
        "500": "#b08d46",
        "600": "#8f6f2a",
        "700": "#7a5f26",
        "800": "#624c22",
        "900": "#4f3d1f"
};    // pendientes y advertencias, el dorado de la hoja del logo

    window.tailwind = window.tailwind || {};
    tailwind.config = {
        theme: {
            extend: {
                fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'Arial', 'sans-serif'] },
                colors: {
                    brand: VERDE, blue: VERDE, indigo: VERDE, sky: VERDE, teal: VERDE, emerald: VERDE, green: VERDE, purple: VERDE, violet: VERDE,
                    slate: NEUTRO, gray: NEUTRO, rose: ROSA, amber: DORADO
                }
            }
        }
    };

    // Tipografía
    const fuente = document.createElement('link');
    fuente.rel = 'stylesheet';
    fuente.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(fuente);

    const css = `
        body { -webkit-font-smoothing: antialiased; }
        input, select, textarea, button { font-family: inherit; }
        input[type=checkbox], input[type=radio] { accent-color: ${VERDE[600]}; }
        input:focus, select:focus, textarea:focus { outline: 2px solid ${VERDE[600]}40; outline-offset: 1px; border-color: ${VERDE[600]}; }
        .shadow-sm { box-shadow: 0 1px 2px rgba(22,56,39,.06), 0 4px 14px rgba(22,56,39,.05); }
        ::selection { background: ${VERDE[200]}; }
        * { scrollbar-width: thin; scrollbar-color: ${NEUTRO[300]} transparent; }
    `;
    const estilo = document.createElement('style');
    estilo.textContent = css;
    document.head.appendChild(estilo);
})();
