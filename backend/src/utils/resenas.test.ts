import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Suscripcion } from '@prisma/client';
import {
  elegibleParaResena, mesesPagados, textosDeAutorizacion, limpiarResena, limpiarResenaManual,
  esResenaInvalida, esPublicable, transicionValida, marcasDeRevision, aTarjetaPublica, elegirAlAzar,
  EMPRESA_DEMO_ID, NOMBRE_ANONIMO, VERSION_POLITICA,
  type EstadoResena,
} from './resenas';
import { accionDePeticion } from './auditoriaDePeticion';

// Las decisiones del módulo de reseñas (7 de octubre de 2026). El requerimiento entero está en
// docs/RESENAS.md, y cada bloque de aquí dice qué regla de ese documento protege.

// Un instante dado en hora de Bogotá (UTC-5 todo el año, sin horario de verano). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h = 12, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));
const medianoche = (a: number, mes: number, d: number) => bog(a, mes, d, 0);

// Los caracteres invisibles se arman con su código y no se escriben en el archivo: pegados aquí no
// se verían, y la prueba no diría a simple vista qué está probando.
const ESPACIO_DE_ANCHO_CERO = String.fromCharCode(0x200b);
const MARCA_DE_ORDEN = String.fromCharCode(0xfeff);
const INVERSION_DE_TEXTO = String.fromCharCode(0x202e);
const CAMPANA = String.fromCharCode(0x07);

// ===== R1: a quién le sale la ventana =====

describe('elegibleParaResena (R1)', () => {
  // El ejemplo del documento: la prueba termina el 28 de octubre a las 9 a. m. y ese día paga los
  // días que faltan del mes (`periodoACobrar` arranca el período en el fin de la prueba). Después
  // paga noviembre completo, desde el día 1.
  const susc = (c: { estado?: string; finPrueba?: Date; pagadoHasta?: Date | null }) =>
    ({ id: 's1', estado: 'ACTIVA', finPrueba: bog(2026, 10, 28, 9), pagadoHasta: null, ...c }) as unknown as Suscripcion;
  const EMPRESA = { id: 'emp-tuercas', activa: true, exentaPago: false };
  const PRIMER_PAGO = { estado: 'APROBADO' as const, monto: 3226, periodoInicio: bog(2026, 10, 28, 9) };
  const PAGO_NOVIEMBRE = { estado: 'APROBADO' as const, monto: 50000, periodoInicio: medianoche(2026, 11, 1) };
  const PAGO_DICIEMBRE = { estado: 'APROBADO' as const, monto: 50000, periodoInicio: medianoche(2026, 12, 1) };
  const PAGO_NOVIEMBRE_HASTA = medianoche(2026, 12, 1);

  // Como llegan de la base: el más reciente primero. Si la regla tomara el primero de la lista y no
  // el más antiguo, el ejemplo del documento se correría un mes.
  const entrada = (c: Partial<Parameters<typeof elegibleParaResena>[0]> = {}) => ({
    empresa: EMPRESA,
    suscripcion: susc({ pagadoHasta: PAGO_NOVIEMBRE_HASTA }),
    pagos: [PAGO_NOVIEMBRE, PRIMER_PAGO],
    yaTieneResena: false,
    ...c,
  });
  const EL_28_DE_NOVIEMBRE = medianoche(2026, 11, 28);

  it('el ejemplo del documento: pagó el 28 de octubre y noviembre, y el 28 de noviembre ya le sale', () => {
    expect(elegibleParaResena(entrada(), EL_28_DE_NOVIEMBRE)).toBe(true);
  });

  it('un minuto antes de la medianoche del 28 de noviembre, todavía no', () => {
    expect(elegibleParaResena(entrada(), bog(2026, 11, 27, 23, 59))).toBe(false);
  });

  it('si no pagó noviembre, el 28 ya está suspendida y no le sale', () => {
    const sinNoviembre = entrada({ suscripcion: susc({ pagadoHasta: medianoche(2026, 11, 1) }), pagos: [PRIMER_PAGO] });
    expect(elegibleParaResena(sinNoviembre, EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('en mora no le sale, aunque ya haya cumplido el mes', () => {
    // 3 de diciembre: pagó noviembre y no diciembre, así que va en el tercer día de gracia.
    const ahora = bog(2026, 12, 3);
    const conDiciembre = entrada({ suscripcion: susc({ pagadoHasta: medianoche(2027, 1, 1) }), pagos: [PAGO_DICIEMBRE, PAGO_NOVIEMBRE, PRIMER_PAGO] });
    expect(elegibleParaResena(conDiciembre, ahora)).toBe(true);
    expect(elegibleParaResena(entrada(), ahora)).toBe(false);
  });

  it('un pago ADICIONAL en el mismo mes no la adelanta: dos filas de pago no son dos meses', () => {
    // Agregar colaboradores el 30 de octubre crea una segunda fila de pago. Con «dos pagos» quedaría
    // elegible a los dos días de pagar por primera vez.
    const adicional = { estado: 'APROBADO' as const, monto: 8000, periodoInicio: bog(2026, 10, 30, 15) };
    const pagos = [adicional, PRIMER_PAGO];
    const alDiaEnOctubre = susc({ pagadoHasta: medianoche(2026, 11, 1) });
    expect(elegibleParaResena(entrada({ suscripcion: alDiaEnOctubre, pagos }), bog(2026, 10, 31))).toBe(false);
    expect(elegibleParaResena(entrada({ pagos: [PAGO_NOVIEMBRE, adicional, PRIMER_PAGO] }), bog(2026, 11, 27, 23, 59))).toBe(false);
    expect(elegibleParaResena(entrada({ pagos: [PAGO_NOVIEMBRE, adicional, PRIMER_PAGO] }), EL_28_DE_NOVIEMBRE)).toBe(true);
  });

  it('un pago de 0 no es el primer pago real', () => {
    const deCero = { estado: 'APROBADO' as const, monto: 0, periodoInicio: bog(2026, 9, 20) };
    const alDiaEnOctubre = susc({ pagadoHasta: medianoche(2026, 11, 1) });
    // Contando el de 0, el mes se habría cumplido el 20 de octubre.
    expect(elegibleParaResena(entrada({ suscripcion: alDiaEnOctubre, pagos: [PRIMER_PAGO, deCero] }), bog(2026, 10, 30))).toBe(false);
  });

  it('un pago rechazado o pendiente tampoco', () => {
    const alDiaEnOctubre = susc({ pagadoHasta: medianoche(2026, 11, 1) });
    for (const estado of ['RECHAZADO', 'PENDIENTE'] as const) {
      const otro = { estado, monto: 50000, periodoInicio: bog(2026, 9, 20) };
      expect(elegibleParaResena(entrada({ suscripcion: alDiaEnOctubre, pagos: [PRIMER_PAGO, otro] }), bog(2026, 10, 30))).toBe(false);
    }
  });

  it('sin ningún pago real no le sale, aunque la suscripción figure al día', () => {
    // Una vigencia puesta a mano por el super admin, sin pago registrado.
    expect(elegibleParaResena(entrada({ pagos: [] }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('una empresa de cortesía nunca', () => {
    expect(elegibleParaResena(entrada({ empresa: { ...EMPRESA, exentaPago: true } }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('una empresa inactiva nunca', () => {
    expect(elegibleParaResena(entrada({ empresa: { ...EMPRESA, activa: false } }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('en prueba no le sale: usa el estado efectivo y no el guardado', () => {
    // El estado guardado dice ACTIVA, pero no hay vigencia pagada y la prueba sigue corriendo.
    const enPrueba = susc({ estado: 'ACTIVA', pagadoHasta: null, finPrueba: bog(2026, 12, 15) });
    expect(elegibleParaResena(entrada({ suscripcion: enPrueba }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('una suscripción cancelada nunca, aunque tenga el mes pagado', () => {
    const cancelada = susc({ estado: 'CANCELADA', pagadoHasta: PAGO_NOVIEMBRE_HASTA });
    expect(elegibleParaResena(entrada({ suscripcion: cancelada }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('sin suscripción nunca', () => {
    expect(elegibleParaResena(entrada({ suscripcion: null }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('la empresa Demo de producción nunca: no le puede salir en plena demostración', () => {
    expect(EMPRESA_DEMO_ID).toBe('cmrfu0b5m0008avi678kzeldr');
    expect(elegibleParaResena(entrada({ empresa: { ...EMPRESA, id: EMPRESA_DEMO_ID } }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });

  it('si ya respondió, enviando u omitiendo, no le vuelve a salir', () => {
    expect(elegibleParaResena(entrada({ yaTieneResena: true }), EL_28_DE_NOVIEMBRE)).toBe(false);
  });
});

// ===== R14: meses pagados, no filas de pago =====

describe('mesesPagados (R14)', () => {
  const pago = (periodoInicio: Date, monto = 50000, estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' = 'APROBADO') => ({ estado, monto, periodoInicio });

  it('dos filas en octubre y dos en noviembre son dos meses', () => {
    const pagos = [pago(bog(2026, 10, 28, 9), 3226), pago(bog(2026, 10, 30, 15), 8000), pago(medianoche(2026, 11, 1)), pago(bog(2026, 11, 10), 8000)];
    expect(mesesPagados(pagos)).toBe(2);
  });

  it('no cuenta los pagos de 0 ni los que no se aprobaron', () => {
    const pagos = [pago(bog(2026, 10, 28, 9), 3226), pago(bog(2026, 9, 20), 0), pago(medianoche(2026, 12, 1), 50000, 'RECHAZADO'), pago(medianoche(2027, 1, 1), 50000, 'PENDIENTE')];
    expect(mesesPagados(pagos)).toBe(1);
  });

  it('sin pagos son cero meses', () => {
    expect(mesesPagados([])).toBe(0);
  });

  it('cuenta el mes de Bogotá: un pago de las 11:30 p. m. del 31 de octubre es de octubre', () => {
    // En UTC ese pago ya es del 1 de noviembre y se juntaría con el de noviembre.
    expect(mesesPagados([pago(bog(2026, 10, 31, 23, 30), 8000), pago(medianoche(2026, 11, 1))])).toBe(2);
  });

  it('la medianoche de Bogotá del 1 de noviembre es de noviembre, también al occidente de Colombia', () => {
    // Las 05:00 UTC del 1 de noviembre son las 10 p. m. del 31 de octubre en Los Ángeles, que es la
    // zona en la que corre esta suite. Con el reloj de la máquina se juntaría con octubre.
    expect(mesesPagados([pago(bog(2026, 10, 28, 9), 3226), pago(medianoche(2026, 11, 1))])).toBe(2);
  });
});

// ===== R13 y la decisión 9.2: lo que dice cada opción de la ventana =====

describe('textosDeAutorizacion (R13, decisión 9.2)', () => {
  it('la opción con nombre dice el nombre Y la empresa, y la anónima dice cómo saldría', () => {
    expect(textosDeAutorizacion('Juan Pérez', 'Tuercas SAS')).toEqual({
      CON_NOMBRE: 'Sí, como Juan Pérez, de Tuercas SAS',
      ANONIMA: 'Prefiero anónimo (saldría como «Cliente de HoraPro»)',
    });
  });

  it('el nombre de la anónima es el mismo que pinta la tarjeta', () => {
    expect(textosDeAutorizacion('Juan Pérez', 'Tuercas SAS').ANONIMA).toContain(`«${NOMBRE_ANONIMO}»`);
  });
});

describe('VERSION_POLITICA (R13)', () => {
  it('es la versión vigente de la política que publica el sitio', () => {
    // La copia del backend se puede quedar atrás, y el fallo sería mudo: la constancia de cada
    // reseña diría una versión que ya no rige. Esta prueba lee la fuente y se pone roja si se separan.
    const fuente = readFileSync(join(__dirname, '../../../frontend/blog/legal/privacidad.mjs'), 'utf8');
    const version = /^\s*version:\s*'([^']+)'/m.exec(fuente);
    expect(version?.[1]).toBeDefined();
    expect(VERSION_POLITICA).toBe(version?.[1]);
  });
});

// ===== R10 a R12: lo que manda la ventana =====

describe('limpiarResena (R10 a R12)', () => {
  const enviar = (c: Record<string, unknown> = {}) => limpiarResena({ accion: 'ENVIAR', estrellas: 4, texto: '', ...c });

  it('omitir no necesita nada más, y descarta lo que venga con él', () => {
    expect(limpiarResena({ accion: 'OMITIR', estrellas: 9, texto: 'algo' })).toEqual({ accion: 'OMITIR' });
  });

  it('sin cuerpo no revienta: responde lo que falta', () => {
    // Fastify deja el cuerpo en undefined si la petición no trae ninguno.
    expect(esResenaInvalida(limpiarResena(undefined))).toBe(true);
    expect(esResenaInvalida(limpiarResena(null))).toBe(true);
  });

  it('una acción que no existe, o ninguna, no pasa', () => {
    expect(esResenaInvalida(limpiarResena({}))).toBe(true);
    expect(esResenaInvalida(limpiarResena({ accion: 'BORRAR' }))).toBe(true);
    expect(esResenaInvalida(limpiarResena({ accion: 'enviar', estrellas: 5 }))).toBe(true);
  });

  it('el motivo dice qué falta, para que la ruta responda 400 con él', () => {
    const r = limpiarResena({ accion: 'ENVIAR' });
    expect(esResenaInvalida(r) && r.motivo).toMatch(/estrellas/i);
  });

  it('envía solo estrellas: el texto queda vacío y no hay nada que autorizar', () => {
    expect(enviar({ comoAparece: 'CON_NOMBRE' })).toEqual({ accion: 'ENVIAR', estrellas: 4, texto: '', comoAparece: null });
    expect(enviar({ texto: undefined })).toEqual({ accion: 'ENVIAR', estrellas: 4, texto: '', comoAparece: null });
    expect(enviar({ texto: null })).toEqual({ accion: 'ENVIAR', estrellas: 4, texto: '', comoAparece: null });
  });

  it('las estrellas son obligatorias y van de 1 a 5, enteras', () => {
    for (const estrellas of [undefined, null, 0, 6, 3.5, '5', Number.NaN]) {
      expect(esResenaInvalida(enviar({ estrellas }))).toBe(true);
    }
    for (const estrellas of [1, 5]) {
      expect(enviar({ estrellas })).toMatchObject({ estrellas });
    }
  });

  it('con texto, elegir cómo aparecer es obligatorio: no hay opción marcada por defecto', () => {
    const sinElegir = enviar({ texto: 'Ya no peleamos con el Excel a fin de mes.' });
    expect(esResenaInvalida(sinElegir) && sinElegir.motivo).toMatch(/aparecer/i);
    expect(esResenaInvalida(enviar({ texto: 'Ya no peleamos con el Excel.', comoAparece: 'PUBLICO' }))).toBe(true);
    expect(enviar({ texto: 'Ya no peleamos con el Excel.', comoAparece: 'ANONIMA' }))
      .toEqual({ accion: 'ENVIAR', estrellas: 4, texto: 'Ya no peleamos con el Excel.', comoAparece: 'ANONIMA' });
  });

  it('un texto que no es texto no pasa', () => {
    expect(esResenaInvalida(enviar({ texto: 5, comoAparece: 'ANONIMA' }))).toBe(true);
    expect(esResenaInvalida(enviar({ texto: ['hola'], comoAparece: 'ANONIMA' }))).toBe(true);
  });

  it('quita los espacios sobrantes', () => {
    expect(enviar({ texto: '   Ya  no   peleamos\tcon el Excel.  ', comoAparece: 'ANONIMA' })).toMatchObject({ texto: 'Ya no peleamos con el Excel.' });
  });

  it('conserva los saltos de línea, que la tarjeta pinta (R43), sin dejar más de una línea en blanco', () => {
    const texto = 'Lo mejor:  \r\n  los reportes.\n\n\n\n\nLo peor: nada.';
    expect(enviar({ texto, comoAparece: 'ANONIMA' })).toMatchObject({ texto: 'Lo mejor:\nlos reportes.\n\nLo peor: nada.' });
  });

  it('quita los caracteres invisibles y los de control', () => {
    const texto = `${MARCA_DE_ORDEN}Ya no peleamos con el Ex${ESPACIO_DE_ANCHO_CERO}cel${CAMPANA}.${INVERSION_DE_TEXTO}`;
    expect(enviar({ texto, comoAparece: 'ANONIMA' })).toMatchObject({ texto: 'Ya no peleamos con el Excel.' });
  });

  it('un texto hecho solo de espacios e invisibles es un texto vacío', () => {
    const texto = `  ${ESPACIO_DE_ANCHO_CERO}\n\n ${MARCA_DE_ORDEN} `;
    expect(enviar({ texto, comoAparece: 'CON_NOMBRE' })).toEqual({ accion: 'ENVIAR', estrellas: 4, texto: '', comoAparece: null });
  });

  it('hasta 500 caracteres, contados después de limpiar', () => {
    expect(enviar({ texto: `   ${'a'.repeat(500)}   `, comoAparece: 'ANONIMA' })).toMatchObject({ texto: 'a'.repeat(500) });
    const largo = enviar({ texto: 'a'.repeat(501), comoAparece: 'ANONIMA' });
    expect(esResenaInvalida(largo) && largo.motivo).toMatch(/500/);
  });

  it('cuenta caracteres y no unidades de UTF-16: un emoji es uno', () => {
    // La columna de MySQL también cuenta caracteres. Con `length`, 300 emojis serían 600.
    expect(esResenaInvalida(enviar({ texto: '👍'.repeat(500), comoAparece: 'ANONIMA' }))).toBe(false);
    expect(esResenaInvalida(enviar({ texto: '👍'.repeat(501), comoAparece: 'ANONIMA' }))).toBe(true);
  });

  it('el texto del tercer testimonio entra literal, con sus faltas', () => {
    // R33: lo que escribe la gente no se corrige.
    const texto = 'la verdad no soy de tecnologia y pense q iba ser complicado pero no. mis muchachos marcan con la cara y yo veo todo desde el telefono. me ahorro un monton de tiempo y ya no peleo con el excel jaja. muy recomendado';
    expect(enviar({ texto, comoAparece: 'CON_NOMBRE' })).toMatchObject({ texto });
  });
});

// ===== R26 a R31: las reseñas que carga el dueño =====

describe('limpiarResenaManual (R26 a R31)', () => {
  const MATEO = {
    estrellas: 5,
    texto: 'Liquidar la nómina nos tomaba dos días y siempre había reclamos por los recargos. Con HoraPro es cuestión de minutos y los números cuadran. Dejamos de improvisar con hojas de cálculo.',
    nombrePublico: 'Mateo Vera',
    cargoPublico: 'CEO Grupo MSM · Founder Fem Probiotics',
    empresaId: null,
    canal: 'WhatsApp',
    fechaOpinion: '2026-07-19',
    referencia: 'chat de WhatsApp del 19/07 con Mateo',
    autorizacion: 'dijo que sí por WhatsApp a publicar su nombre',
  };
  const manual = (c: Record<string, unknown> = {}) => limpiarResenaManual({ ...MATEO, ...c });

  it('un testimonio completo queda listo para guardar, con la fecha a medianoche de Bogotá (R31)', () => {
    expect(manual()).toEqual({
      ...MATEO,
      comoAparece: 'CON_NOMBRE',
      fechaOpinion: new Date('2026-07-19T05:00:00.000Z'),
    });
  });

  it('sin cuerpo no revienta', () => {
    expect(esResenaInvalida(limpiarResenaManual(undefined))).toBe(true);
  });

  it('sin estrellas se guarda sin estrellas: no se inventa un 5 (R28)', () => {
    expect(manual({ estrellas: null })).toMatchObject({ estrellas: null });
    expect(manual({ estrellas: undefined })).toMatchObject({ estrellas: null });
  });

  it('si trae estrellas, van de 1 a 5, enteras', () => {
    for (const estrellas of [0, 6, 4.5, '5']) {
      expect(esResenaInvalida(manual({ estrellas }))).toBe(true);
    }
  });

  it('sin nombre es anónima, y lo vacío queda vacío y no en blanco', () => {
    expect(manual({ nombrePublico: '   ', cargoPublico: '', canal: '', referencia: ' ', autorizacion: null })).toMatchObject({
      comoAparece: 'ANONIMA', nombrePublico: null, cargoPublico: null, canal: null, referencia: null, autorizacion: null,
    });
  });

  it('sin texto no hay reseña', () => {
    expect(esResenaInvalida(manual({ texto: '' }))).toBe(true);
    expect(esResenaInvalida(manual({ texto: `  ${ESPACIO_DE_ANCHO_CERO} ` }))).toBe(true);
    expect(esResenaInvalida(manual({ texto: undefined }))).toBe(true);
  });

  it('el texto se limpia igual que el de un cliente', () => {
    expect(manual({ texto: `  Muy  buena${ESPACIO_DE_ANCHO_CERO}.\r\nLa recomiendo. ` })).toMatchObject({ texto: 'Muy buena.\nLa recomiendo.' });
  });

  it('los campos de una línea no guardan saltos ni espacios dobles', () => {
    expect(manual({ nombrePublico: ' Mateo\n  Vera ', cargoPublico: 'CEO\tGrupo MSM' })).toMatchObject({ nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM' });
  });

  it('cada campo respeta el tope de su columna', () => {
    const topes: Array<[string, number]> = [['texto', 500], ['nombrePublico', 120], ['cargoPublico', 160], ['canal', 60], ['referencia', 500], ['autorizacion', 500]];
    for (const [campo, tope] of topes) {
      expect(esResenaInvalida(manual({ [campo]: 'a'.repeat(tope) }))).toBe(false);
      expect(esResenaInvalida(manual({ [campo]: 'a'.repeat(tope + 1) }))).toBe(true);
    }
  });

  it('un campo de texto que no es texto no pasa', () => {
    for (const campo of ['texto', 'nombrePublico', 'cargoPublico', 'canal', 'referencia', 'autorizacion']) {
      expect(esResenaInvalida(manual({ [campo]: 42 }))).toBe(true);
    }
  });

  it('la fecha de la opinión es obligatoria y tiene que existir', () => {
    for (const fechaOpinion of [undefined, '', '19/07/2026', '2026-02-30', '2026-13-01', '2026-07-19T10:00', 20260719]) {
      expect(esResenaInvalida(manual({ fechaOpinion }))).toBe(true);
    }
    expect(manual({ fechaOpinion: '2028-02-29' })).toMatchObject({ fechaOpinion: new Date('2028-02-29T05:00:00.000Z') });
  });

  it('puede quedar vinculada a una empresa cliente (R30), y si no, va sin empresa', () => {
    expect(manual({ empresaId: 'cmgrupomsm0001' })).toMatchObject({ empresaId: 'cmgrupomsm0001' });
    expect(manual({ empresaId: '' })).toMatchObject({ empresaId: null });
    expect(manual({ empresaId: undefined })).toMatchObject({ empresaId: null });
    expect(esResenaInvalida(manual({ empresaId: 7 }))).toBe(true);
  });
});

// ===== R20, R21 y R27: cuándo se puede publicar =====

describe('esPublicable (R20, R21, R27)', () => {
  const DE_CLIENTE = {
    origen: 'CLIENTE' as const, estado: 'POR_REVISAR' as EstadoResena, texto: 'Ya no peleamos con el Excel a fin de mes.',
    comoAparece: 'CON_NOMBRE' as 'CON_NOMBRE' | 'ANONIMA' | null, referencia: null as string | null, autorizacion: null as string | null,
  };
  const SI = { publicable: true, motivo: null };

  it('una de cliente con texto y autorización se puede publicar', () => {
    expect(esPublicable(DE_CLIENTE)).toEqual(SI);
  });

  it('necesita al menos 20 caracteres de texto, sin contar los espacios de los lados', () => {
    expect(esPublicable({ ...DE_CLIENTE, texto: 'a'.repeat(20) })).toEqual(SI);
    const corta = esPublicable({ ...DE_CLIENTE, texto: `   ${'a'.repeat(19)}   ` });
    expect(corta.publicable).toBe(false);
    expect(corta.motivo).toMatch(/20/);
    expect(esPublicable({ ...DE_CLIENTE, texto: '' }).publicable).toBe(false);
  });

  it('sin una opción elegida no hay autorización', () => {
    expect(esPublicable({ ...DE_CLIENTE, comoAparece: null }).publicable).toBe(false);
  });

  it('archivada u omitida, nunca', () => {
    for (const estado of ['ARCHIVADA', 'OMITIDA'] as const) {
      const r = esPublicable({ ...DE_CLIENTE, estado });
      expect(r.publicable).toBe(false);
      expect(r.motivo).toBeTruthy();
    }
  });

  it('una oculta o ya publicada sigue siendo publicable', () => {
    expect(esPublicable({ ...DE_CLIENTE, estado: 'OCULTA' })).toEqual(SI);
    expect(esPublicable({ ...DE_CLIENTE, estado: 'PUBLICADA' })).toEqual(SI);
  });

  it('una manual con nombre exige dónde quedó y cómo autorizó (R27)', () => {
    const manual = { ...DE_CLIENTE, origen: 'MANUAL' as const };
    expect(esPublicable({ ...manual, referencia: 'chat de WhatsApp del 19/07', autorizacion: 'dijo que sí por WhatsApp' })).toEqual(SI);
    for (const faltante of [{ referencia: null }, { autorizacion: null }, { referencia: '   ' }, { autorizacion: '' }]) {
      const r = esPublicable({ ...manual, referencia: 'chat de WhatsApp del 19/07', autorizacion: 'dijo que sí por WhatsApp', ...faltante });
      expect(r.publicable).toBe(false);
      expect(r.motivo).toBeTruthy();
    }
  });

  it('una manual anónima no necesita la autorización del nombre', () => {
    expect(esPublicable({ ...DE_CLIENTE, origen: 'MANUAL', comoAparece: 'ANONIMA' })).toEqual(SI);
  });

  it('a una de cliente no se le piden los campos de las manuales', () => {
    expect(esPublicable({ ...DE_CLIENTE, referencia: null, autorizacion: null })).toEqual(SI);
  });
});

// ===== 4.2: estados y acciones =====

describe('transicionValida (4.2)', () => {
  const ESTADOS: EstadoResena[] = ['OMITIDA', 'POR_REVISAR', 'PUBLICADA', 'OCULTA', 'ARCHIVADA'];
  const DEL_ADMIN = new Set([
    'POR_REVISAR>PUBLICADA', 'POR_REVISAR>ARCHIVADA',
    'PUBLICADA>OCULTA', 'PUBLICADA>ARCHIVADA',
    'OCULTA>PUBLICADA', 'OCULTA>ARCHIVADA',
    'ARCHIVADA>POR_REVISAR',
  ]);

  it('el super admin solo hace los movimientos del diagrama, y una omitida no la mueve', () => {
    for (const desde of ESTADOS) {
      for (const hacia of ESTADOS) {
        expect([desde, hacia, transicionValida('ADMIN', desde, hacia)]).toEqual([desde, hacia, DEL_ADMIN.has(`${desde}>${hacia}`)]);
      }
    }
  });

  it('el cliente solo puede enviar sobre una que había omitido en otra pestaña', () => {
    for (const desde of ESTADOS) {
      for (const hacia of ESTADOS) {
        expect([desde, hacia, transicionValida('CLIENTE', desde, hacia)]).toEqual([desde, hacia, desde === 'OMITIDA' && hacia === 'POR_REVISAR']);
      }
    }
  });

  it('lo que no es un estado no es un movimiento: el destino llega del cuerpo de la petición', () => {
    for (const hacia of ['BORRADA', 'publicada', '', undefined, null, 3]) {
      expect(transicionValida('ADMIN', 'POR_REVISAR', hacia)).toBe(false);
    }
  });
});

// ===== R18: lo que el dueño tiene que leer antes de publicar =====

describe('marcasDeRevision (R18)', () => {
  it('un comentario normal no lleva marcas', () => {
    expect(marcasDeRevision('Ya no peleamos con el Excel a fin de mes. Somos 15 personas en 2 sedes desde 2025.')).toEqual([]);
    expect(marcasDeRevision('')).toEqual([]);
  });

  it('un punto sin espacio después no es un enlace', () => {
    // «me» es un dominio de verdad (wa.me), pero aquí empieza la frase siguiente.
    expect(marcasDeRevision('Ya no peleamos con el Excel a fin de mes.Me encanta.')).toEqual([]);
  });

  // El final del dominio en mayúsculas ENTERO sí es un enlace: así se escribe el de un aviso o una
  // valla. Lo que se deja fuera es la mezcla, que es el comienzo de una frase («mes.Me»).
  it('un dominio escrito en mayúsculas también es un enlace', () => {
    expect(marcasDeRevision('Visiten FERRETERIALOPEZ.COM')).toEqual(['ENLACE']);
    expect(marcasDeRevision('Visiten Ferreterialopez.COM.CO')).toEqual(['ENLACE']);
  });

  it('una cifra de plata no es un teléfono', () => {
    expect(marcasDeRevision('Nos ahorró $1.500.000 al mes y 5 horas a la semana.')).toEqual([]);
  });

  it('marca los enlaces, con o sin http', () => {
    expect(marcasDeRevision('Visiten https://tuercas.co/ofertas')).toEqual(['ENLACE']);
    expect(marcasDeRevision('Más en www.tuercasypernos.com')).toEqual(['ENLACE']);
    expect(marcasDeRevision('nuestra tienda: tuercasypernos.com.co')).toEqual(['ENLACE']);
  });

  it('marca los teléfonos, con los formatos de Colombia', () => {
    for (const texto of ['Llámenme al 300 123 4567', 'al +57 310-555-1234', 'whatsapp 3001234567', 'fijo (604) 444 5566', 'al 300.123.4567']) {
      expect([texto, marcasDeRevision(texto)]).toEqual([texto, ['TELEFONO']]);
    }
  });

  it('marca los correos, sin contarlos también como enlace ni como @usuario', () => {
    expect(marcasDeRevision('escríbanme a ana.calle@tuercas.com')).toEqual(['CORREO']);
  });

  it('marca los @usuario', () => {
    expect(marcasDeRevision('Síguenos en @tuercasypernos')).toEqual(['ARROBA']);
    expect(marcasDeRevision('@lavadoralasbrisas lo recomienda')).toEqual(['ARROBA']);
  });

  it('varias a la vez salen en un orden fijo', () => {
    expect(marcasDeRevision('@tuercas, ana@tuercas.com, 3001234567 y wa.me/573001234567'))
      .toEqual(['ENLACE', 'TELEFONO', 'CORREO', 'ARROBA']);
  });
});

// ===== Los tres testimonios que entran con sql/resenas.sql =====

// Entran con id fijo, y ese id viaja tal cual en el JSON de la landing (`aTarjetaPublica`) y en la
// ruta que guarda el registro del sistema. Por eso: que no lleve el nombre de la persona (R42, R23), y
// que la auditoría lo reconozca como identificador, o «Quitar el nombre» quedaría registrado como
// «Creó una reseña» (R24). `rutaNormalizada` solo toma por identificador un segmento con dígitos.
describe('los ids de los testimonios de la landing (R42, R24)', () => {
  const raiz = join(__dirname, '../../..');
  const sql = readFileSync(join(raiz, 'sql/resenas.sql'), 'utf8');
  const filas = [...sql.matchAll(/\(\s*'([^']+)',\s*'MANUAL',[\s\S]*?'CON_NOMBRE',\s*'([^']+)'/g)]
    .map(([, id, nombre]) => ({ id, nombre }));
  const sinTildes = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

  it('el SQL inserta los tres', () => {
    expect(filas.map(f => f.nombre)).toEqual(['Mateo Vera', 'Carolina Calle', 'Santiago Botero']);
  });

  it('ningún id lleva el nombre de su persona', () => {
    for (const { id, nombre } of filas) {
      for (const parte of sinTildes(nombre).split(/\s+/)) expect([id, sinTildes(id).includes(parte)]).toEqual([id, false]);
    }
  });

  it('la auditoría los reconoce como identificador y dice lo que pasó', () => {
    for (const { id } of filas) {
      expect(accionDePeticion('POST', `/api/admin/resenas/${id}/quitar-nombre`)).toBe('Quitó el nombre de una reseña');
      expect(accionDePeticion('PUT', `/api/admin/resenas/${id}/estado`, { estado: 'PUBLICADA' })).toBe('Publicó una reseña');
    }
  });

  // El seed de pruebas locales crea las mismas filas: si los ids se separaran, limpiar la base local
  // dejaría los del SQL, y correr el SQL después del seed los duplicaría.
  it('el seed de pruebas usa los mismos ids', () => {
    const seed = readFileSync(join(raiz, 'backend/prisma/seed-resenas-prueba.ts'), 'utf8');
    const lista = /IDS_TESTIMONIOS = \[([^\]]*)\]/.exec(seed)?.[1] ?? '';
    expect([...lista.matchAll(/'([^']+)'/g)].map(m => m[1])).toEqual(filas.map(f => f.id));
  });
});

// ===== R42: lo único que viaja a la landing =====

describe('aTarjetaPublica (R42)', () => {
  // Una fila como sale de la base, con todo lo que NO puede viajar.
  const FILA = {
    id: 'r1', origen: 'CLIENTE', estado: 'PUBLICADA', empresaId: 'emp-lavanderia', usuarioId: 'u-ana',
    estrellas: 4 as number | null, texto: 'El kiosco a veces se demora, pero los reportes son muy claros.',
    comoAparece: 'CON_NOMBRE' as 'CON_NOMBRE' | 'ANONIMA' | null,
    nombrePublico: 'Ana Ríos' as string | null, cargoPublico: 'Lavandería Las Brisas' as string | null,
    textoAutorizacion: 'Sí, como Ana Ríos, de Lavandería Las Brisas', versionPolitica: '1.2',
    referencia: null, autorizacion: null, planAlEnviar: 'ESENCIAL', mesesPagadosAlEnviar: 2,
  };

  it('con nombre: la firma es el nombre y la empresa congelados, y nada más', () => {
    const tarjeta = aTarjetaPublica(FILA);
    expect(tarjeta).toEqual({ id: 'r1', estrellas: 4, texto: FILA.texto, nombre: 'Ana Ríos', detalle: 'Lavandería Las Brisas' });
    expect(Object.keys(tarjeta).sort()).toEqual(['detalle', 'estrellas', 'id', 'nombre', 'texto']);
  });

  it('anónima: ni el nombre, ni la empresa, ni las iniciales', () => {
    const tarjeta = aTarjetaPublica({ ...FILA, comoAparece: 'ANONIMA' });
    expect(tarjeta).toEqual({ id: 'r1', estrellas: 4, texto: FILA.texto, nombre: NOMBRE_ANONIMO, detalle: null });
    expect(NOMBRE_ANONIMO).toBe('Cliente de HoraPro');
    const json = JSON.stringify(tarjeta);
    for (const dato of ['Ana', 'Ríos', 'Lavandería', 'Brisas', 'u-ana', 'emp-lavanderia']) {
      expect(json).not.toContain(dato);
    }
  });

  it('sin nombre guardado sale anónima, aunque diga CON_NOMBRE', () => {
    expect(aTarjetaPublica({ ...FILA, nombrePublico: null })).toMatchObject({ nombre: NOMBRE_ANONIMO, detalle: null });
    expect(aTarjetaPublica({ ...FILA, comoAparece: null })).toMatchObject({ nombre: NOMBRE_ANONIMO, detalle: null });
  });

  it('con nombre y sin cargo, el detalle va vacío', () => {
    expect(aTarjetaPublica({ ...FILA, cargoPublico: null })).toMatchObject({ nombre: 'Ana Ríos', detalle: null });
  });

  it('sin estrellas, viaja sin estrellas (R28)', () => {
    expect(aTarjetaPublica({ ...FILA, estrellas: null })).toMatchObject({ estrellas: null });
  });
});

// ===== R35: 15 al azar =====

describe('elegirAlAzar (R35)', () => {
  const LISTA = ['a', 'b', 'c', 'd', 'e'];
  // Un generador que devuelve los valores dados, en orden, y después ceros.
  const secuencia = (...valores: number[]) => () => valores.shift() ?? 0;

  it('con un generador fijo, la elección es predecible', () => {
    expect(elegirAlAzar(LISTA, 3, () => 0)).toEqual(['a', 'b', 'c']);
    // Con 0,99: el primero se cambia con el último, y así sucesivamente.
    expect(elegirAlAzar(LISTA, 3, () => 0.99)).toEqual(['e', 'a', 'b']);
  });

  it('cualquiera puede salir primero: el sorteo cubre la lista entera', () => {
    for (let i = 0; i < LISTA.length; i++) {
      expect(elegirAlAzar(LISTA, 1, secuencia((i + 0.5) / LISTA.length))).toEqual([LISTA[i]]);
    }
  });

  it('no toca la lista que recibe', () => {
    const lista = [...LISTA];
    elegirAlAzar(lista, 3, () => 0.99);
    expect(lista).toEqual(LISTA);
  });

  it('si hay menos que las pedidas, van todas, sin repetir', () => {
    const todas = elegirAlAzar(LISTA, 15, () => 0.42);
    expect(todas).toHaveLength(5);
    expect([...todas].sort()).toEqual(LISTA);
  });

  it('cero, o menos, es ninguna; y de una lista vacía no sale nada', () => {
    expect(elegirAlAzar(LISTA, 0)).toEqual([]);
    expect(elegirAlAzar(LISTA, -2)).toEqual([]);
    expect(elegirAlAzar([], 15)).toEqual([]);
  });

  it('con el azar de verdad, nunca repite y siempre trae las pedidas', () => {
    const cuarenta = Array.from({ length: 40 }, (_, i) => i);
    for (let vuelta = 0; vuelta < 200; vuelta++) {
      const elegidas = elegirAlAzar(cuarenta, 15);
      expect(new Set(elegidas).size).toBe(15);
    }
  });
});
