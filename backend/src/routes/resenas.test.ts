import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

// Las rutas de las reseñas (docs/RESENAS.md, §10.3 y §10.5): la ventana de la empresa, la landing y la
// pantalla del super admin. Las DECISIONES están en utils/resenas.ts con sus pruebas; aquí se prueba
// lo que la ruta hace con ellas: de dónde saca cada dato, qué escribe, qué responde y a quién deja pasar.
//
// Se montan sin levantar el servidor (las rutas importan `prisma` de '../prisma', CLAUDE.md §8.5), con
// los guardas decorados a mano y una base de mentira en memoria. Lo que la base de verdad hace con la
// tabla (la llave única, la cascada) se verificó contra MySQL y MariaDB: ver sql/resenas.sql.

// Un instante dado en hora de Bogotá (UTC-5 todo el año). CLAUDE.md §8.1.
const bog = (a: number, mes: number, d: number, h = 0, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min, 0));

type Fila = Record<string, unknown>;

const { prisma, bd } = vi.hoisted(() => {
  const bd = {
    usuarios: [] as Fila[],
    empresas: [] as Fila[],
    suscripciones: [] as Fila[],
    resenas: [] as Fila[],
    colaboradoresActivos: 0,
  };
  let secuencia = 0;
  const conCodigo = (code: string) => Object.assign(new Error(code), { code });
  const coincide = (fila: Fila, donde: Fila = {}) => Object.entries(donde).every(([k, v]) => fila[k] === v);
  const ids = (donde: Fila) => ((donde.id as { in: string[] }).in);
  const proyectar = (fila: Fila, select?: Record<string, boolean>) =>
    select ? Object.fromEntries(Object.keys(select).map(k => [k, fila[k]])) : { ...fila };
  // Una fila como la devuelve la base: todas las columnas, con sus valores por omisión.
  const filaResena = (datos: Fila): Fila => ({
    id: `r${++secuencia}`, estado: 'POR_REVISAR', empresaId: null, usuarioId: null, estrellas: null, texto: '',
    comoAparece: null, nombrePublico: null, cargoPublico: null, textoAutorizacion: null, versionPolitica: null,
    canal: null, referencia: null, autorizacion: null, fechaOpinion: null, registradaPor: null, planAlEnviar: null,
    mesesPagadosAlEnviar: null, nombreRetiradoEn: null, publicadaEn: null,
    creadoEn: new Date(Date.now() + secuencia), actualizadoEn: new Date(),
    ...datos,
  });
  const empresaOcupada = (empresaId: unknown, salvo?: unknown) =>
    empresaId != null && bd.resenas.some(r => r.empresaId === empresaId && r.id !== salvo);
  const prisma = {
    usuario: {
      findUnique: vi.fn(async ({ where }: { where: Fila }) => bd.usuarios.find(u => u.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where: Fila }) => bd.usuarios.filter(u => ids(where).includes(u.id as string))),
    },
    empresa: {
      findUnique: vi.fn(async ({ where }: { where: Fila }) => bd.empresas.find(e => e.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where: Fila }) => bd.empresas
        .filter(e => ids(where).includes(e.id as string))
        .map(e => ({ ...e, suscripcion: bd.suscripciones.find(s => s.empresaId === e.id) ?? null }))),
    },
    suscripcion: {
      findUnique: vi.fn(async ({ where }: { where: Fila }) => bd.suscripciones.find(s => s.empresaId === where.empresaId) ?? null),
    },
    colaborador: { count: vi.fn(async () => bd.colaboradoresActivos) },
    resena: {
      count: vi.fn(async ({ where }: { where: Fila }) => bd.resenas.filter(r => coincide(r, where)).length),
      findUnique: vi.fn(async ({ where }: { where: Fila }) => bd.resenas.find(r => r.id === where.id) ?? null),
      findMany: vi.fn(async (args: { where?: Fila; select?: Record<string, boolean> } = {}) => bd.resenas
        .filter(r => coincide(r, args.where))
        .sort((a, b) => (b.creadoEn as Date).getTime() - (a.creadoEn as Date).getTime())
        .map(r => proyectar(r, args.select))),
      create: vi.fn(async ({ data, select }: { data: Fila; select?: Record<string, boolean> }) => {
        if (empresaOcupada(data.empresaId)) throw conCodigo('P2002');
        if (data.empresaId != null && !bd.empresas.some(e => e.id === data.empresaId)) throw conCodigo('P2003');
        const fila = filaResena(data);
        bd.resenas.push(fila);
        return proyectar(fila, select);
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Fila; data: Fila }) => {
        const filas = bd.resenas.filter(r => coincide(r, where));
        for (const f of filas) Object.assign(f, data);
        return { count: filas.length };
      }),
      update: vi.fn(async ({ where, data }: { where: Fila; data: Fila }) => {
        const fila = bd.resenas.find(r => r.id === where.id);
        if (!fila) throw conCodigo('P2025');
        if (empresaOcupada(data.empresaId, fila.id)) throw conCodigo('P2002');
        if (data.empresaId != null && !bd.empresas.some(e => e.id === data.empresaId)) throw conCodigo('P2003');
        Object.assign(fila, data);
        return fila;
      }),
    },
  };
  return { prisma, bd };
});
vi.mock('../prisma', () => ({ prisma }));

import resenaRoutes, { resenasAdminRoutes, olvidarResenasPublicas } from './resenas';

// ===== La base de cada prueba =====

const AHORA = bog(2026, 10, 8, 10);
const DEMO = 'cmrfu0b5m0008avi678kzeldr';

const pago = (inicio: Date, monto = 169_900, estado = 'APROBADO') => ({ estado, monto, periodoInicio: inicio });

// Una empresa en su segundo mes pagado y al día: elegible hoy.
function empresaElegible(id = 'emp1', nombre = 'Tuercas SAS') {
  bd.empresas.push({ id, nombre, activa: true, exentaPago: false, auxilioRevisadoEn: bog(2026, 9, 17), afiliadoId: null });
  bd.suscripciones.push({
    id: `s-${id}`, empresaId: id, estado: 'ACTIVA', finPrueba: bog(2026, 8, 28), pagadoHasta: bog(2026, 11, 1),
    plan: 'PROFESIONAL', cicloPago: 'MENSUAL',
    pagos: [pago(bog(2026, 8, 28), 31_200), pago(bog(2026, 10, 1))],
  });
}

// Una reseña ya guardada, con todas sus columnas. Publicable salvo que se diga otra cosa.
const resenaDe = (datos: Fila) => {
  const r = {
    id: `x${bd.resenas.length + 1}`, origen: 'MANUAL', estado: 'POR_REVISAR', empresaId: null, usuarioId: null,
    estrellas: 5, texto: 'Un comentario de prueba suficientemente largo para publicarse.', comoAparece: 'ANONIMA',
    nombrePublico: null, cargoPublico: null, textoAutorizacion: null, versionPolitica: null, canal: null,
    referencia: null, autorizacion: null, fechaOpinion: null, registradaPor: null, planAlEnviar: null,
    mesesPagadosAlEnviar: null, nombreRetiradoEn: null, publicadaEn: null,
    creadoEn: new Date(AHORA.getTime() - bd.resenas.length * 1000), actualizadoEn: AHORA,
    ...datos,
  };
  bd.resenas.push(r);
  return r;
};

let sesion: { empresaId: string; usuarioId: string };
let superAdmin: { id: string };

async function montar() {
  const app = Fastify();
  app.decorate('requireEmpresa', async (request: { empresaId?: string; usuarioId?: string; user?: unknown }) => {
    request.empresaId = sesion.empresaId;
    request.usuarioId = sesion.usuarioId;
    // La sesión dice ADMIN siempre, a propósito: la ruta tiene que leer el rol de la base (R2).
    request.user = { id: sesion.usuarioId, rol: 'ADMIN', empresaId: sesion.empresaId };
  });
  app.decorate('requireSuperAdmin', async (request: { user?: unknown }) => {
    request.user = { ...superAdmin, rol: 'SUPER_ADMIN', email: 'correo-del-token@horapro.co' };
  });
  await app.register(resenaRoutes, { prefix: '/api/resenas' });
  await app.register(resenasAdminRoutes, { prefix: '/api/admin/resenas' });
  await app.ready();
  return app;
}

type App = Awaited<ReturnType<typeof montar>>;
const enviar = (app: App, payload: object) => app.inject({ method: 'POST', url: '/api/resenas', payload });
const pendiente = async (app: App) => (await app.inject({ method: 'GET', url: '/api/resenas/pendiente' })).json();
const publicas = (app: App) => app.inject({ method: 'GET', url: '/api/resenas/publicas' });
const cambiarEstado = (app: App, id: string, estado: unknown) =>
  app.inject({ method: 'PUT', url: `/api/admin/resenas/${id}/estado`, payload: { estado } });

const ENVIO = { accion: 'ENVIAR', estrellas: 4, texto: 'Ya no peleamos con el Excel a fin de mes.', comoAparece: 'CON_NOMBRE' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AHORA);
  olvidarResenasPublicas();
  Object.assign(bd, { usuarios: [], empresas: [], suscripciones: [], resenas: [], colaboradoresActivos: 3 });
  empresaElegible();
  bd.usuarios.push(
    { id: 'adm1', rol: 'ADMIN', activo: true, nombre: 'Juan Pérez', email: 'juan@tuercas.co', emailVerificado: true, empresaId: 'emp1' },
    { id: 'sup1', rol: 'SUPERVISOR', activo: true, nombre: 'Ana Ruiz', email: 'ana@tuercas.co', emailVerificado: true, empresaId: 'emp1' },
    { id: 'sa1', rol: 'SUPER_ADMIN', activo: true, nombre: 'Dueño', email: 'dueno@horapro.co', emailVerificado: true, empresaId: null },
  );
  sesion = { empresaId: 'emp1', usuarioId: 'adm1' };
  superAdmin = { id: 'sa1' };
});

afterEach(() => {
  vi.useRealTimers();
});

// ===== La ventana de la empresa =====

describe('GET /api/resenas/pendiente', () => {
  it('al administrador de una empresa elegible le dice que sí, con los textos EXACTOS de las dos opciones', async () => {
    const app = await montar();
    expect(await pendiente(app)).toEqual({
      pendiente: true,
      opciones: {
        CON_NOMBRE: 'Sí, como Juan Pérez, de Tuercas SAS',
        ANONIMA: 'Prefiero anónimo (saldría como «Cliente de HoraPro»)',
      },
    });
    await app.close();
  });

  it('el rol se lee de la base y no de la sesión: a un supervisor, o a un administrador desactivado, no le sale (R2)', async () => {
    const app = await montar();
    sesion.usuarioId = 'sup1';
    expect(await pendiente(app)).toEqual({ pendiente: false, opciones: null });
    sesion.usuarioId = 'adm1';
    bd.usuarios[0].activo = false;
    expect((await pendiente(app)).pendiente).toBe(false);
    // Un administrador de OTRA empresa con una sesión de esta tampoco.
    bd.usuarios[0].activo = true;
    bd.usuarios[0].empresaId = 'otra';
    expect((await pendiente(app)).pendiente).toBe(false);
    await app.close();
  });

  it('a una empresa no elegible no le sale: primer mes, la Demo, o ya respondió (R1, D1, D2)', async () => {
    const app = await montar();
    // Su primer pago real fue hace menos de un mes calendario.
    (bd.suscripciones[0].pagos as unknown[]).splice(0, 1, pago(bog(2026, 9, 20)));
    expect((await pendiente(app)).pendiente).toBe(false);
    await app.close();

    Object.assign(bd, { empresas: [], suscripciones: [] });
    empresaElegible(DEMO, 'Demo');
    bd.usuarios[0].empresaId = DEMO;
    sesion.empresaId = DEMO;
    const app2 = await montar();
    expect((await pendiente(app2)).pendiente).toBe(false);
    await app2.close();
  });

  it('a una empresa que ya omitió no se le vuelve a preguntar', async () => {
    resenaDe({ origen: 'CLIENTE', estado: 'OMITIDA', empresaId: 'emp1', estrellas: null, texto: '', comoAparece: null });
    const app = await montar();
    expect((await pendiente(app)).pendiente).toBe(false);
    await app.close();
  });

  it('si va a salir la revisión del auxilio, la reseña espera (R4); sin gente activa esa revisión no existe', async () => {
    bd.empresas[0].auxilioRevisadoEn = null;
    const app = await montar();
    expect((await pendiente(app)).pendiente).toBe(false);
    bd.colaboradoresActivos = 0;
    expect((await pendiente(app)).pendiente).toBe(true);
    await app.close();
  });

  it('si va a salir «verifica tu correo», la reseña espera (R4)', async () => {
    bd.usuarios[0].emailVerificado = false;
    const app = await montar();
    expect((await pendiente(app)).pendiente).toBe(false);
    await app.close();
  });

  it('nombres larguísimos se recortan al tope de su columna, y la opción dice lo mismo que se guardaría', async () => {
    bd.usuarios[0].nombre = 'N'.repeat(191);
    bd.empresas[0].nombre = 'E'.repeat(191);
    const app = await montar();
    const { opciones } = await pendiente(app);
    expect(opciones.CON_NOMBRE).toBe(`Sí, como ${'N'.repeat(120)}, de ${'E'.repeat(160)}`);
    expect(await (await enviar(app, ENVIO)).json()).toEqual({ ok: true });
    const [fila] = bd.resenas;
    expect(fila.nombrePublico).toBe('N'.repeat(120));
    expect(fila.cargoPublico).toBe('E'.repeat(160));
    expect(fila.textoAutorizacion).toBe(opciones.CON_NOMBRE);
    expect((fila.textoAutorizacion as string).length).toBeLessThanOrEqual(300);
    await app.close();
  });
});

describe('POST /api/resenas', () => {
  it('un supervisor recibe 403 y no se escribe nada, aunque la sesión diga ADMIN (R2)', async () => {
    sesion.usuarioId = 'sup1';
    const app = await montar();
    const r = await enviar(app, ENVIO);
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBeTruthy();
    expect(bd.resenas).toHaveLength(0);
    await app.close();
  });

  it('guarda la reseña con la firma copiada de la base, la constancia y cómo estaba la empresa (R12, R13)', async () => {
    const app = await montar();
    // Lo que no le toca decidir al navegador se ignora: la empresa, la firma y el estado.
    const r = await enviar(app, { ...ENVIO, empresaId: 'otra', nombrePublico: 'Impostor', estado: 'PUBLICADA' });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toEqual({ ok: true });
    expect(bd.resenas).toHaveLength(1);
    expect(bd.resenas[0]).toMatchObject({
      origen: 'CLIENTE', estado: 'POR_REVISAR', empresaId: 'emp1', usuarioId: 'adm1',
      estrellas: 4, texto: 'Ya no peleamos con el Excel a fin de mes.', comoAparece: 'CON_NOMBRE',
      nombrePublico: 'Juan Pérez', cargoPublico: 'Tuercas SAS',
      textoAutorizacion: 'Sí, como Juan Pérez, de Tuercas SAS', versionPolitica: '1.2',
      planAlEnviar: 'PROFESIONAL', mesesPagadosAlEnviar: 2,
    });
    await app.close();
  });

  it('la anónima guarda como constancia el texto de la opción anónima', async () => {
    const app = await montar();
    expect((await enviar(app, { ...ENVIO, comoAparece: 'ANONIMA' })).statusCode).toBe(201);
    expect(bd.resenas[0]).toMatchObject({
      comoAparece: 'ANONIMA', textoAutorizacion: 'Prefiero anónimo (saldría como «Cliente de HoraPro»)', versionPolitica: '1.2',
    });
    await app.close();
  });

  it('sin texto no hay nada que autorizar: ni opción, ni constancia, ni versión, aunque lleguen', async () => {
    const app = await montar();
    expect((await enviar(app, { accion: 'ENVIAR', estrellas: 2, texto: '   ', comoAparece: 'CON_NOMBRE' })).statusCode).toBe(201);
    expect(bd.resenas[0]).toMatchObject({ estrellas: 2, texto: '', comoAparece: null, textoAutorizacion: null, versionPolitica: null });
    await app.close();
  });

  it('el segundo envío responde 409 YA_RESPONDIO, no un error, y deja una sola fila (R9)', async () => {
    const app = await montar();
    expect((await enviar(app, ENVIO)).statusCode).toBe(201);
    const r = await enviar(app, { ...ENVIO, estrellas: 1 });
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('YA_RESPONDIO');
    expect(bd.resenas).toHaveLength(1);
    expect(bd.resenas[0].estrellas).toBe(4);
    await app.close();
  });

  it('omitir deja una fila OMITIDA sin estrellas, y desde ahí ya no se pregunta (decisión 9.1)', async () => {
    const app = await montar();
    const r = await enviar(app, { accion: 'OMITIR', estrellas: 5, texto: 'esto no se guarda' });
    expect(r.statusCode).toBe(201);
    expect(bd.resenas).toHaveLength(1);
    expect(bd.resenas[0]).toMatchObject({ origen: 'CLIENTE', estado: 'OMITIDA', estrellas: null, texto: '', empresaId: 'emp1' });
    expect((await pendiente(app)).pendiente).toBe(false);
    await app.close();
  });

  // La fecha de la fila es la de la autorización (R13), no la del día en que se omitió: la constancia
  // dice cuándo se dio el permiso, y la lista del super admin la muestra como fecha de la opinión.
  it('un ENVIAR sobre una omitida en otra pestaña se acepta, con la fecha del envío: es la única transición del cliente', async () => {
    const app = await montar();
    await enviar(app, { accion: 'OMITIR' });
    const alEnviar = bog(2026, 10, 20, 9);
    vi.setSystemTime(alEnviar);
    const r = await enviar(app, ENVIO);
    expect(r.statusCode).toBe(201);
    expect(bd.resenas).toHaveLength(1);
    expect(bd.resenas[0]).toMatchObject({
      estado: 'POR_REVISAR', estrellas: 4, nombrePublico: 'Juan Pérez', textoAutorizacion: 'Sí, como Juan Pérez, de Tuercas SAS',
    });
    expect(bd.resenas[0].creadoEn).toEqual(alEnviar);
    await app.close();
  });

  it('un OMITIR sobre una ya enviada responde 409 y no la tumba a omitida', async () => {
    const app = await montar();
    await enviar(app, ENVIO);
    const r = await enviar(app, { accion: 'OMITIR' });
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('YA_RESPONDIO');
    expect(bd.resenas[0]).toMatchObject({ estado: 'POR_REVISAR', estrellas: 4 });
    await app.close();
  });

  it('si otra pestaña omite justo en medio del envío, el envío gana igual', async () => {
    const app = await montar();
    // La otra pestaña crea la omitida entre el intento de actualizar y el de crear de esta.
    prisma.resena.create.mockImplementationOnce(async () => {
      resenaDe({ origen: 'CLIENTE', estado: 'OMITIDA', empresaId: 'emp1', estrellas: null, texto: '', comoAparece: null });
      throw Object.assign(new Error('P2002'), { code: 'P2002' });
    });
    const r = await enviar(app, ENVIO);
    expect(r.statusCode).toBe(201);
    expect(bd.resenas).toHaveLength(1);
    expect(bd.resenas[0]).toMatchObject({ estado: 'POR_REVISAR', estrellas: 4 });
    await app.close();
  });

  it('una reseña cargada a mano para la empresa también cuenta como su única: 409 (R30)', async () => {
    resenaDe({ origen: 'MANUAL', empresaId: 'emp1' });
    const app = await montar();
    expect((await enviar(app, ENVIO)).statusCode).toBe(409);
    expect(bd.resenas).toHaveLength(1);
    expect(bd.resenas[0].origen).toBe('MANUAL');
    await app.close();
  });

  it('un cuerpo inválido responde 400 con el motivo, y no escribe', async () => {
    const app = await montar();
    for (const cuerpo of [{}, { accion: 'ENVIAR' }, { accion: 'ENVIAR', estrellas: 6 }, { ...ENVIO, comoAparece: undefined }]) {
      const r = await enviar(app, cuerpo);
      expect(r.statusCode, JSON.stringify(cuerpo)).toBe(400);
      expect(typeof r.json().error).toBe('string');
    }
    expect(bd.resenas).toHaveLength(0);
    await app.close();
  });

  it('una empresa que no es elegible no puede enviar llamando a la ruta a mano', async () => {
    bd.suscripciones[0].pagadoHasta = bog(2026, 10, 1); // en mora: ya no está al día
    const app = await montar();
    const r = await enviar(app, ENVIO);
    expect(r.statusCode).toBe(403);
    expect(bd.resenas).toHaveLength(0);
    await app.close();
  });
});

// ===== La landing =====

describe('GET /api/resenas/publicas', () => {
  const publicada = (datos: Fila = {}) => resenaDe({ estado: 'PUBLICADA', ...datos });

  it('devuelve SOLO las llaves de la tarjeta, nada más de la fila (R42)', async () => {
    publicada({ comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM', canal: 'WhatsApp', referencia: 'chat', autorizacion: 'dijo que sí' });
    const app = await montar();
    const r = await publicas(app);
    expect(r.statusCode).toBe(200);
    const cuerpo = r.json();
    expect(Object.keys(cuerpo)).toEqual(['resenas']);
    expect(cuerpo.resenas).toHaveLength(1);
    expect(Object.keys(cuerpo.resenas[0]).sort()).toEqual(['detalle', 'estrellas', 'id', 'nombre', 'texto']);
    expect(cuerpo.resenas[0]).toMatchObject({ nombre: 'Mateo Vera', detalle: 'CEO Grupo MSM', estrellas: 5 });
    await app.close();
  });

  it('de una anónima nunca viaja el nombre, ni la empresa', async () => {
    publicada({ origen: 'CLIENTE', empresaId: 'emp1', comoAparece: 'ANONIMA', nombrePublico: 'Juan Pérez', cargoPublico: 'Tuercas SAS' });
    const app = await montar();
    const r = await publicas(app);
    expect(r.json().resenas[0]).toMatchObject({ nombre: 'Cliente de HoraPro', detalle: null });
    expect(r.body).not.toContain('Juan');
    expect(r.body).not.toContain('Tuercas');
    expect(r.body).not.toContain('emp1');
    await app.close();
  });

  it('solo salen las publicadas', async () => {
    publicada({ id: 'si' });
    for (const estado of ['POR_REVISAR', 'OCULTA', 'ARCHIVADA', 'OMITIDA']) resenaDe({ id: estado, estado });
    const app = await montar();
    expect((await publicas(app)).json().resenas.map((t: { id: string }) => t.id)).toEqual(['si']);
    await app.close();
  });

  it('con más de 15 publicadas manda 15 distintas; sin ninguna, una lista vacía (R35, R39)', async () => {
    const app = await montar();
    expect((await publicas(app)).json()).toEqual({ resenas: [] });
    olvidarResenasPublicas();
    for (let i = 0; i < 20; i++) publicada({ id: `p${i}` });
    const ids = (await publicas(app)).json().resenas.map((t: { id: string }) => t.id);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    await app.close();
  });

  it('una caché corta evita ir a la base en cada visita, y publicar desde el super admin la vacía', async () => {
    publicada({ id: 'vieja' });
    resenaDe({ id: 'nueva', comoAparece: 'ANONIMA' });
    const app = await montar();
    await publicas(app);
    await publicas(app);
    const consultasPublicas = () => prisma.resena.findMany.mock.calls.filter(([a]) => (a as { where?: Fila })?.where?.estado === 'PUBLICADA').length;
    expect(consultasPublicas()).toBe(1);
    expect((await cambiarEstado(app, 'nueva', 'PUBLICADA')).statusCode).toBe(200);
    const ids = (await publicas(app)).json().resenas.map((t: { id: string }) => t.id).sort();
    expect(ids).toEqual(['nueva', 'vieja']);
    expect(consultasPublicas()).toBe(2);
    await app.close();
  });

  it('una consulta que sale antes de ocultar una reseña y vuelve después no deja guardada la lista vieja', async () => {
    publicada({ id: 'se-oculta' });
    const app = await montar();
    // Mientras la consulta está en camino, el super admin vacía la caché (por ejemplo, al ocultar).
    const original = prisma.resena.findMany.getMockImplementation()!;
    prisma.resena.findMany.mockImplementationOnce(async (args) => {
      const filas = await original(args);
      olvidarResenasPublicas();
      bd.resenas[0].estado = 'OCULTA';
      return filas;
    });
    await publicas(app);
    expect((await publicas(app)).json().resenas).toEqual([]);
    await app.close();
  });

  it('la caché vence sola al minuto', async () => {
    publicada({ id: 'una' });
    const app = await montar();
    await publicas(app);
    resenaDe({ id: 'otra', estado: 'PUBLICADA' });
    vi.setSystemTime(new Date(AHORA.getTime() + 30_000));
    expect((await publicas(app)).json().resenas).toHaveLength(1);
    vi.setSystemTime(new Date(AHORA.getTime() + 61_000));
    expect((await publicas(app)).json().resenas).toHaveLength(2);
    await app.close();
  });
});

// ===== El super admin =====

describe('GET /api/admin/resenas', () => {
  it('agrega a cada fila lo que la pantalla necesita: empresa, estado efectivo, autor, meses pagados, marcas y si se puede publicar (R14, R17, R18)', async () => {
    bd.empresas[0].afiliadoId = 'afi1';
    // Un pago por sumar colaboradores en el mismo mes: tres filas, dos meses pagados.
    (bd.suscripciones[0].pagos as unknown[]).push(pago(bog(2026, 10, 15), 20_000));
    resenaDe({
      id: 'cli', origen: 'CLIENTE', empresaId: 'emp1', usuarioId: 'adm1', estrellas: 2, comoAparece: 'ANONIMA',
      texto: 'El kiosco se demora en reconocer. Llámenme al 300 123 4567 por favor.',
    });
    resenaDe({ id: 'man', origen: 'MANUAL', comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera', texto: 'Liquidar la nómina nos tomaba dos días.' });
    const app = await montar();
    const { resenas } = (await app.inject({ method: 'GET', url: '/api/admin/resenas' })).json();
    const cli = resenas.find((r: Fila) => r.id === 'cli');
    expect(cli).toMatchObject({
      origen: 'CLIENTE', empresaNombre: 'Tuercas SAS', empresaActiva: true, estadoSuscripcion: 'ACTIVA', esReferida: true,
      autorNombre: 'Juan Pérez', autorEmail: 'juan@tuercas.co', mesesPagados: 2, marcas: ['TELEFONO'],
      publicable: true, motivoNoPublicable: null,
    });
    const man = resenas.find((r: Fila) => r.id === 'man');
    expect(man).toMatchObject({
      empresaNombre: null, empresaActiva: null, estadoSuscripcion: null, esReferida: false,
      autorNombre: null, autorEmail: null, mesesPagados: null, marcas: [], publicable: false,
    });
    expect(man.motivoNoPublicable).toMatch(/Dónde quedó/);
    await app.close();
  });

  it('el estado de la suscripción es el efectivo, no el guardado, que se actualiza perezoso', async () => {
    // Guardada como ACTIVA, pero su período venció hace dos días: está en mora.
    bd.suscripciones[0].pagadoHasta = bog(2026, 10, 6);
    resenaDe({ origen: 'CLIENTE', empresaId: 'emp1' });
    const app = await montar();
    const { resenas } = (await app.inject({ method: 'GET', url: '/api/admin/resenas' })).json();
    expect(bd.suscripciones[0].estado).toBe('ACTIVA');
    expect(resenas[0].estadoSuscripcion).toBe('EN_MORA');
    await app.close();
  });

  it('una empresa de cortesía sale como ILIMITADA y no como suspendida, igual que en la lista de empresas', async () => {
    bd.empresas[0].exentaPago = true;
    bd.suscripciones[0].pagadoHasta = null;
    bd.suscripciones[0].finPrueba = bog(2026, 1, 1);
    resenaDe({ origen: 'MANUAL', empresaId: 'emp1' });
    const app = await montar();
    const { resenas } = (await app.inject({ method: 'GET', url: '/api/admin/resenas' })).json();
    expect(resenas[0].estadoSuscripcion).toBe('ILIMITADA');
    await app.close();
  });

  it('el resumen cuenta solo las de clientes, incluidas las archivadas, sin las omitidas ni las manuales (R15)', async () => {
    const cliente = (estrellas: number | null, estado = 'POR_REVISAR') => resenaDe({ origen: 'CLIENTE', estrellas, estado });
    cliente(5); cliente(5, 'PUBLICADA'); cliente(4, 'OCULTA'); cliente(1, 'ARCHIVADA');
    cliente(null, 'OMITIDA'); cliente(null, 'OMITIDA');
    resenaDe({ origen: 'MANUAL', estrellas: 5 }); resenaDe({ origen: 'MANUAL', estrellas: 5 });
    const app = await montar();
    const { resumen } = (await app.inject({ method: 'GET', url: '/api/admin/resenas' })).json();
    expect(resumen).toEqual({ promedio: 3.8, total: 4, distribucion: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 }, omitidas: 2 });
    await app.close();
  });

  it('sin reseñas de clientes el promedio es null, no cero', async () => {
    resenaDe({ origen: 'MANUAL', estrellas: 5 });
    const app = await montar();
    const { resumen } = (await app.inject({ method: 'GET', url: '/api/admin/resenas' })).json();
    expect(resumen).toEqual({ promedio: null, total: 0, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, omitidas: 0 });
    await app.close();
  });
});

describe('POST /api/admin/resenas (manual)', () => {
  const MANUAL = {
    estrellas: null, texto: 'Liquidar la nómina nos tomaba dos días.', nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM',
    canal: 'WhatsApp', fechaOpinion: '2026-07-19', referencia: 'chat del 19/07', autorizacion: 'dijo que sí por WhatsApp',
  };
  const crear = (app: App, payload: object) => app.inject({ method: 'POST', url: '/api/admin/resenas', payload });

  it('la crea por revisar, con «cargada por» leído de la base y no del token (R29), y la fecha a medianoche de Bogotá (R31)', async () => {
    const app = await montar();
    const r = await crear(app, MANUAL);
    expect(r.statusCode).toBe(201);
    expect(r.json()).toEqual({ ok: true, id: bd.resenas[0].id });
    expect(bd.resenas[0]).toMatchObject({
      origen: 'MANUAL', estado: 'POR_REVISAR', estrellas: null, comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera',
      registradaPor: 'dueno@horapro.co', fechaOpinion: new Date('2026-07-19T05:00:00.000Z'),
    });
    await app.close();
  });

  it('un token de super admin cuya cuenta ya no lo es no carga nada', async () => {
    const app = await montar();
    for (const cambio of [{ activo: false }, { rol: 'ADMIN', activo: true }]) {
      Object.assign(bd.usuarios[2], cambio);
      expect((await crear(app, MANUAL)).statusCode, JSON.stringify(cambio)).toBe(403);
    }
    superAdmin = { id: 'no-existe' };
    expect((await crear(app, MANUAL)).statusCode).toBe(403);
    expect(bd.resenas).toHaveLength(0);
    await app.close();
  });

  it('un cuerpo inválido es 400; una empresa que no existe, 400; una empresa que ya tiene reseña, 409 (D1)', async () => {
    const app = await montar();
    expect((await crear(app, { ...MANUAL, texto: '' })).statusCode).toBe(400);
    expect((await crear(app, { ...MANUAL, fechaOpinion: '2026-02-30' })).statusCode).toBe(400);
    expect((await crear(app, { ...MANUAL, empresaId: 'no-existe' })).statusCode).toBe(400);
    expect((await crear(app, { ...MANUAL, empresaId: 'emp1' })).statusCode).toBe(201);
    expect((await crear(app, { ...MANUAL, empresaId: 'emp1' })).statusCode).toBe(409);
    expect(bd.resenas).toHaveLength(1);
    await app.close();
  });
});

describe('PUT /api/admin/resenas/:id (editar una manual)', () => {
  const EDICION = {
    estrellas: 5, texto: 'Texto corregido después de copiarlo mal.', nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM',
    canal: 'WhatsApp', fechaOpinion: '2026-07-19', referencia: 'chat', autorizacion: 'dijo que sí',
  };
  const editar = (app: App, id: string, payload: object = EDICION) => app.inject({ method: 'PUT', url: `/api/admin/resenas/${id}`, payload });

  it('el texto de un cliente no se edita: 400 y la fila queda igual (R22)', async () => {
    const original = resenaDe({ id: 'cli', origen: 'CLIENTE', empresaId: 'emp1', texto: 'Lo que escribió el cliente, tal cual.' });
    const copia = { ...original };
    const app = await montar();
    const r = await editar(app, 'cli');
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatch(/cliente/);
    expect(bd.resenas[0]).toEqual(copia);
    await app.close();
  });

  it('una manual se edita, sin cambiar quién la cargó', async () => {
    resenaDe({ id: 'man', registradaPor: 'otro@horapro.co' });
    const app = await montar();
    expect((await editar(app, 'man')).statusCode).toBe(200);
    expect(bd.resenas[0]).toMatchObject({ texto: 'Texto corregido después de copiarlo mal.', estrellas: 5, registradaPor: 'otro@horapro.co' });
    await app.close();
  });

  it('corregir una publicada cambia la landing en el acto, sin esperar a que venza la caché', async () => {
    resenaDe({ id: 'man', estado: 'PUBLICADA', comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera', referencia: 'chat', autorizacion: 'sí' });
    const app = await montar();
    await publicas(app);
    expect((await editar(app, 'man')).statusCode).toBe(200);
    expect((await publicas(app)).json().resenas[0].texto).toBe('Texto corregido después de copiarlo mal.');
    await app.close();
  });

  it('vincularla a una empresa que ya tiene reseña es 409, y a una que no existe, 400 (D1, R30)', async () => {
    resenaDe({ id: 'suya', origen: 'CLIENTE', empresaId: 'emp1' });
    resenaDe({ id: 'man' });
    const app = await montar();
    expect((await editar(app, 'man', { ...EDICION, empresaId: 'emp1' })).statusCode).toBe(409);
    expect((await editar(app, 'man', { ...EDICION, empresaId: 'no-existe' })).statusCode).toBe(400);
    expect(bd.resenas.find(r => r.id === 'man')?.empresaId).toBeNull();
    await app.close();
  });

  it('una que no existe es 404', async () => {
    const app = await montar();
    expect((await editar(app, 'nada')).statusCode).toBe(404);
    await app.close();
  });

  it('a una a la que se le quitó el nombre no se le puede volver a poner (R23)', async () => {
    resenaDe({ id: 'man', nombreRetiradoEn: bog(2026, 10, 1) });
    const app = await montar();
    expect((await editar(app, 'man')).statusCode).toBe(400);
    expect((await editar(app, 'man', { ...EDICION, nombrePublico: '', cargoPublico: '' })).statusCode).toBe(200);
    expect(bd.resenas[0]).toMatchObject({ nombrePublico: null, cargoPublico: null, comoAparece: 'ANONIMA' });
    await app.close();
  });

  it('una publicada no se puede editar hasta dejarla sin publicar: 400 con el motivo', async () => {
    resenaDe({ id: 'man', estado: 'PUBLICADA', comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera', referencia: 'chat', autorizacion: 'sí' });
    const app = await montar();
    const r = await editar(app, 'man', { ...EDICION, referencia: '' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatch(/Dónde quedó/);
    expect(bd.resenas[0].referencia).toBe('chat');
    await app.close();
  });
});

describe('PUT /api/admin/resenas/:id/estado', () => {
  it('una transición que no existe es 400 y no cambia nada (4.2)', async () => {
    resenaDe({ id: 'r', estado: 'POR_REVISAR' });
    resenaDe({ id: 'o', origen: 'CLIENTE', estado: 'OMITIDA', estrellas: null, texto: '', comoAparece: null });
    const app = await montar();
    for (const [id, estado] of [['r', 'OCULTA'], ['r', 'OMITIDA'], ['r', 'BORRADA'], ['r', 3], ['o', 'POR_REVISAR'], ['o', 'PUBLICADA']]) {
      const r = await cambiarEstado(app, id as string, estado);
      expect(r.statusCode, `${id} → ${estado}`).toBe(400);
      expect(typeof r.json().error).toBe('string');
    }
    expect(bd.resenas.map(r => r.estado)).toEqual(['POR_REVISAR', 'OMITIDA']);
    await app.close();
  });

  it('publicar exige que sea publicable: 400 con el motivo (R20, R27)', async () => {
    resenaDe({ id: 'corta', texto: 'Muy buena.' });
    resenaDe({ id: 'sin-permiso', comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera' });
    const app = await montar();
    const corta = await cambiarEstado(app, 'corta', 'PUBLICADA');
    expect(corta.statusCode).toBe(400);
    expect(corta.json().error).toMatch(/20 caracteres/);
    const sinPermiso = await cambiarEstado(app, 'sin-permiso', 'PUBLICADA');
    expect(sinPermiso.statusCode).toBe(400);
    expect(sinPermiso.json().error).toMatch(/Dónde quedó/);
    expect(bd.resenas.every(r => r.estado === 'POR_REVISAR')).toBe(true);
    await app.close();
  });

  it('publicar deja la fecha de publicación; ocultar y archivar la mueven sin más', async () => {
    resenaDe({ id: 'r' });
    const app = await montar();
    expect((await cambiarEstado(app, 'r', 'PUBLICADA')).statusCode).toBe(200);
    expect(bd.resenas[0]).toMatchObject({ estado: 'PUBLICADA', publicadaEn: AHORA });
    expect((await cambiarEstado(app, 'r', 'OCULTA')).statusCode).toBe(200);
    expect((await cambiarEstado(app, 'r', 'ARCHIVADA')).statusCode).toBe(200);
    expect(bd.resenas[0].estado).toBe('ARCHIVADA');
    await app.close();
  });

  it('si otra pestaña la cambió entre la lectura y la escritura, responde 409 y no pisa lo que hizo', async () => {
    // La otra pestaña ya la archivó, pero esta la leyó cuando todavía estaba por revisar.
    const fila = resenaDe({ id: 'r', estado: 'ARCHIVADA' });
    prisma.resena.findUnique.mockResolvedValueOnce({ ...fila, estado: 'POR_REVISAR' });
    const app = await montar();
    expect((await cambiarEstado(app, 'r', 'PUBLICADA')).statusCode).toBe(409);
    expect(bd.resenas[0].estado).toBe('ARCHIVADA');
    await app.close();
  });

  it('una que no existe es 404', async () => {
    const app = await montar();
    expect((await cambiarEstado(app, 'nada', 'PUBLICADA')).statusCode).toBe(404);
    await app.close();
  });
});

describe('POST /api/admin/resenas/:id/quitar-nombre', () => {
  const quitar = (app: App, id: string) => app.inject({ method: 'POST', url: `/api/admin/resenas/${id}/quitar-nombre` });

  it('borra la firma, la deja como «Cliente de HoraPro» en la landing en el acto, y anota cuándo (R23)', async () => {
    resenaDe({ id: 'r', estado: 'PUBLICADA', comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM', referencia: 'chat', autorizacion: 'sí' });
    const app = await montar();
    expect((await publicas(app)).json().resenas[0].nombre).toBe('Mateo Vera');
    expect((await quitar(app, 'r')).statusCode).toBe(200);
    expect(bd.resenas[0]).toMatchObject({ comoAparece: 'ANONIMA', nombrePublico: null, cargoPublico: null, nombreRetiradoEn: AHORA });
    const r = await publicas(app);
    expect(r.json().resenas[0]).toMatchObject({ nombre: 'Cliente de HoraPro', detalle: null });
    expect(r.body).not.toContain('Mateo');
    await app.close();
  });

  it('dos veces no cambia la fecha de la primera', async () => {
    resenaDe({ id: 'r', comoAparece: 'CON_NOMBRE', nombrePublico: 'Mateo Vera' });
    const app = await montar();
    await quitar(app, 'r');
    vi.setSystemTime(new Date(AHORA.getTime() + 86_400_000));
    expect((await quitar(app, 'r')).statusCode).toBe(200);
    expect(bd.resenas[0].nombreRetiradoEn).toEqual(AHORA);
    await app.close();
  });

  it('a una enviada sin texto no le inventa una autorización: sigue sin opción', async () => {
    resenaDe({ id: 'r', origen: 'CLIENTE', texto: '', comoAparece: null, nombrePublico: 'Juan Pérez', cargoPublico: 'Tuercas SAS' });
    const app = await montar();
    expect((await quitar(app, 'r')).statusCode).toBe(200);
    expect(bd.resenas[0]).toMatchObject({ comoAparece: null, nombrePublico: null, cargoPublico: null });
    await app.close();
  });

  it('una que no existe es 404', async () => {
    const app = await montar();
    expect((await quitar(app, 'nada')).statusCode).toBe(404);
    await app.close();
  });
});
