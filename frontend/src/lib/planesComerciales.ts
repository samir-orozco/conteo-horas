// LO QUE SE LE PROMETE AL CLIENTE DE CADA PLAN: la landing y la pantalla de Suscripción.
//
// UNA SOLA LISTA PARA LAS DOS (4 de octubre de 2026). Antes cada pantalla tenía la suya, escrita a mano,
// y se separaron sin que nadie lo notara: la de Suscripción nunca supo de Turnos ni de Clima laboral, y la
// de la landing nunca dijo que el Profesional exporta los reportes. Es el §9.3 del CLAUDE.md.
//
// LO QUE MANDA ES `backend/src/utils/planes.ts`, que es lo que de verdad prende y apaga cada función.
// `planesComerciales.test.ts` compara esta lista con ese archivo: cada función con candado tiene que
// aparecer en los planes que la traen y en ningún otro. Si se agrega un módulo allá y nadie lo anuncia
// aquí, esa prueba se pone roja.
//
// Ojo: el super admin puede cambiar precios, límites y funciones de cada plan en producción
// (`configuracion_plataforma.planes`). Los precios se toman del servidor cuando están; lo que incluye
// cada plan, no, porque son frases de venta y no la lista de casillas.

export type PlanComercial = {
  id: 'ESENCIAL' | 'PROFESIONAL' | 'EMPRESARIAL';
  nombre: string;
  // Respaldo cuando el servidor no responde: la landing es pública y se pinta antes de tener precios.
  mensual: number;
  anual: number;
  limite: number;
  para: string;
  destacado: boolean;
  incluye: string[];
};

export const PLANES_COMERCIALES: PlanComercial[] = [
  {
    id: 'ESENCIAL', nombre: 'Esencial', mensual: 99900, anual: 999000, limite: 10, destacado: false,
    para: 'Para negocios pequeños',
    // Revisada el 4 de octubre de 2026 frase por frase contra el código, con decisiones del dueño:
    // - «Contratos y novedades de nómina»: los dos módulos de septiembre, que van en todos los planes
    //   (los contratos con su aviso de preaviso; permisos, incapacidades, vacaciones y licencias).
    // - «Nómina del período en Excel, también para Siigo» reemplaza a «Reportes básicos», que era falso:
    //   el Esencial ve los mismos reportes que los demás y baja la nómina en Excel y en el formato de
    //   Siigo. El dueño decidió dejarlo así en vez de ponerle candado.
    // - «1 dispositivo autorizado»: el tope solo cuenta los dispositivos vinculados cuando la empresa
    //   prende «Solo dispositivos autorizados»; sin eso, el enlace del kiosco abre en cualquiera.
    incluye: ['Hasta 10 colaboradores', 'Marcación con rostro o cédula', 'Liquidación de recargos y extras', 'Contratos y novedades de nómina', 'Nómina del período en Excel, también para Siigo', '1 horario · 1 dispositivo autorizado'],
  },
  {
    id: 'PROFESIONAL', nombre: 'Profesional', mensual: 169900, anual: 1699000, limite: 30, destacado: true,
    para: 'El más elegido',
    // - «Excel del reporte diario»: es lo único que gobierna la casilla `exportar` (Reportes.tsx), y
    //   ninguna lista lo decía. «Exportar reportes a Excel» prometía de más: la nómina se exporta en
    //   todos los planes.
    // - «Alerta de llegada tarde por Telegram», en singular: es la única que se manda por ahí.
    // - «dispositivos autorizados», por lo mismo que en el Esencial.
    incluye: ['Hasta 30 colaboradores', 'Todo lo de Esencial', 'Marcación por GPS / geocerca', 'Alerta de llegada tarde por Telegram', 'Excel del reporte diario', 'Evidencia en novedades', 'Varios horarios y dispositivos autorizados'],
  },
  {
    id: 'EMPRESARIAL', nombre: 'Empresarial', mensual: 299900, anual: 2999000, limite: 150, destacado: false,
    para: 'Para operaciones grandes',
    // «Turnos y programación» va PRIMERO de los suyos, y no al final (30 de septiembre de 2026): es lo
    // que de verdad distingue a este plan del Profesional, mientras que Siigo todavía dice
    // «próximamente» y el soporte no se ve hasta que hace falta. Clima laboral va justo después
    // (3 de octubre de 2026): también es solo de este plan, por decisión del dueño.
    //
    // «Conexión directa con Siigo» y no «Integración Siigo»: el Excel en el formato de Siigo ya lo baja
    // cualquier plan, y con «Integración Siigo (próximamente)» la página decía a la vez que Siigo existe
    // y que no. Lo que está por venir es la conexión. «Soporte prioritario» no tiene nada en el código
    // que lo distinga: es un compromiso de servicio del dueño.
    incluye: ['Hasta 150 colaboradores', 'Todo lo de Profesional', 'Turnos y programación por calendario', 'Clima laboral: cómo se siente tu equipo', 'Varias sedes, con resumen por sede', 'Conexión directa con Siigo (próximamente)', 'Soporte prioritario'],
  },
];
