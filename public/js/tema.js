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

        /* Barra superior */
        .jc-nav { background: ${VERDE[800]}; color: #fff; position: sticky; top: 0; z-index: 40; box-shadow: 0 2px 14px rgba(10,30,20,.28); }
        .jc-nav-in { max-width: 80rem; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
        .jc-marca { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
        .jc-marca img { height: 44px; width: auto; display: block; }
        .jc-marca-txt { display: none; font: 700 22px Georgia, 'Times New Roman', serif; letter-spacing: .5px; }
        .jc-sep { width: 1px; height: 28px; background: rgba(255,255,255,.28); }
        .jc-sub { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.72); font-weight: 600; }
        .jc-links { display: flex; gap: 2px; overflow-x: auto; max-width: 100%; }
        .jc-links a { padding: 9px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.78); text-decoration: none; white-space: nowrap; transition: background .15s, color .15s; }
        .jc-links a:hover { background: rgba(255,255,255,.1); color: #fff; }
        .jc-links a.activo { background: rgba(255,255,255,.14); color: #fff; box-shadow: inset 0 -2px 0 #fff; }
        @media (max-width: 700px) { .jc-sub, .jc-sep { display: none; } .jc-marca img { height: 36px; } }
    `;
    const estilo = document.createElement('style');
    estilo.textContent = css;
    document.head.appendChild(estilo);
})();
