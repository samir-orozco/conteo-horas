import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { notificar, type TipoNotif } from '../utils/notificaciones';
import { estadoDelContrato, type ContratoParaCalculo, type ProrrogaParaCalculo } from '../utils/contratos';

// Documento del contrato: PDF o imagen en base64, con tope de tamaño. Mismo
// patrón y mismo límite que la evidencia de las novedades.
const MAX_DOC = 4_200_000;
function documentoValido(v: unknown): v is string {
  return typeof v === 'string'
    && /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(v)
    && v.length < MAX_DOC;
}

const TIPOS = new Set(['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZAJE']);

// Lista blanca de lo que la empresa puede escribir. Evita que llegue basura a
// Prisma o que alguien intente escribir `convertidoAIndefinidoEn` desde el
// navegador, que solo se toca con su propia ruta.
function limpiar(data: any, esNuevo: boolean) {
  const out: any = {};
  if (esNuevo) out.colaboradorId = data.colaboradorId;
  if (data.tipo !== undefined && TIPOS.has(data.tipo)) out.tipo = data.tipo;
  if (data.fechaInicio !== undefined) out.fechaInicio = new Date(data.fechaInicio);
  if (data.fechaFin !== undefined) out.fechaFin = data.fechaFin ? new Date(data.fechaFin) : null;
  if (data.fechaInicioPractica !== undefined) {
    out.fechaInicioPractica = data.fechaInicioPractica ? new Date(data.fechaInicioPractica) : null;
  }
  if (data.estado === 'VIGENTE' || data.estado === 'TERMINADO') out.estado = data.estado;
  if (data.observacion !== undefined) out.observacion = data.observacion || null;
  if (data.documento === null) { out.documento = null; out.documentoTipo = null; out.documentoNombre = null; }
  else if (documentoValido(data.documento)) {
    out.documento = data.documento;
    out.documentoTipo = data.documento.slice(5, data.documento.indexOf(';'));
    out.documentoNombre = typeof data.documentoNombre === 'string' ? data.documentoNombre.slice(0, 120) : null;
  }
  return out;
}

// El listado NO trae el documento (base64 pesado): solo si existe y cómo se
// llama. El archivo se pide aparte, cuando alguien lo abre.
const SIN_DOCUMENTO = {
  id: true, colaboradorId: true, tipo: true, fechaInicio: true, fechaFin: true,
  fechaInicioPractica: true, estado: true, convertidoAIndefinidoEn: true,
  observacion: true, documentoTipo: true, documentoNombre: true, creadoEn: true,
  prorrogas: {
    select: { id: true, desde: true, hasta: true, documentoTipo: true, documentoNombre: true },
    orderBy: { desde: 'asc' as const },
  },
};

// Adjunta a cada contrato lo que calcula el motor: cuándo vence de verdad,
// cuándo se acaba el plazo para avisar, si la próxima prórroga ya debe ser de un
// año, y cuándo se convierte en indefinido.
function conEstado<T extends { tipo: string; fechaInicio: Date; fechaFin: Date | null; fechaInicioPractica: Date | null; prorrogas: { desde: Date; hasta: Date }[] }>(
  c: T, hoy: Date,
) {
  const base: ContratoParaCalculo = {
    tipo: c.tipo as ContratoParaCalculo['tipo'],
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin,
    fechaInicioPractica: c.fechaInicioPractica,
  };
  const prorrogas: ProrrogaParaCalculo[] = c.prorrogas.map(p => ({ desde: p.desde, hasta: p.hasta }));
  return { ...c, calculo: estadoDelContrato(base, prorrogas, hoy) };
}

const deLaEmpresa = (empresaId?: string) => ({ colaborador: { empresaId } });

export default async function contratoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  // Contratos de un colaborador, del más reciente al más viejo.
  app.get('/colaborador/:colaboradorId', auth, async (request) => {
    const { colaboradorId } = request.params as { colaboradorId: string };
    const lista = await prisma.contrato.findMany({
      where: { colaboradorId, ...deLaEmpresa(request.empresaId) },
      select: SIN_DOCUMENTO,
      orderBy: { fechaInicio: 'desc' },
    });
    const hoy = new Date();
    return lista.map(c => conEstado(c as any, hoy));
  });

  // Contratos de la empresa que tienen algo que avisar. Alimenta la campana y el
  // aviso por Telegram, y sirve de tablero para Recursos Humanos.
  app.get('/alertas', auth, async (request) => {
    const lista = await prisma.contrato.findMany({
      where: { estado: 'VIGENTE', ...deLaEmpresa(request.empresaId) },
      select: {
        ...SIN_DOCUMENTO,
        colaborador: { select: { id: true, nombre: true, apellido: true, cargo: true } },
      },
    });
    const hoy = new Date();
    return lista
      .map(c => conEstado(c as any, hoy))
      .filter(c => c.calculo.alertas.length > 0)
      .sort((a, b) => (a.calculo.diasParaVencer ?? 9e9) - (b.calculo.diasParaVencer ?? 9e9));
  });

  // El documento firmado, aparte del listado por su peso.
  app.get('/:id/documento', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = await prisma.contrato.findFirst({
      where: { id, ...deLaEmpresa(request.empresaId) },
      select: { documento: true, documentoTipo: true, documentoNombre: true },
    });
    if (!c) return reply.status(404).send({ error: 'Contrato no encontrado' });
    return c;
  });

  app.get('/prorrogas/:id/documento', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = await prisma.prorrogaContrato.findFirst({
      where: { id, contrato: { colaborador: { empresaId: request.empresaId } } },
      select: { documento: true, documentoTipo: true, documentoNombre: true },
    });
    if (!p) return reply.status(404).send({ error: 'Prórroga no encontrada' });
    return p;
  });

  app.post('/', auth, async (request, reply) => {
    const body = request.body as any;
    const col = await prisma.colaborador.findFirst({
      where: { id: body.colaboradorId, empresaId: request.empresaId }, select: { id: true },
    });
    if (!col) return reply.status(404).send({ error: 'Colaborador no encontrado' });

    const datos = limpiar(body, true);
    if (!datos.tipo) return reply.status(400).send({ error: 'Falta el tipo de contrato.' });
    if (!datos.fechaInicio) return reply.status(400).send({ error: 'Falta la fecha de inicio.' });
    if ((datos.tipo === 'FIJO' || datos.tipo === 'APRENDIZAJE') && !datos.fechaFin) {
      return reply.status(400).send({ error: 'Un contrato a término fijo necesita fecha de terminación.' });
    }
    // Indefinido y obra o labor no terminan en una fecha: si viene una, se ignora
    // para que no aparezcan vencimientos inventados.
    if (datos.tipo === 'INDEFINIDO' || datos.tipo === 'OBRA_LABOR') datos.fechaFin = null;

    // Un colaborador puede tener historia, pero un solo contrato vigente. El
    // anterior se cierra solo, para que no queden dos activos contradiciéndose.
    if ((datos.estado ?? 'VIGENTE') === 'VIGENTE') {
      await prisma.contrato.updateMany({
        where: { colaboradorId: col.id, estado: 'VIGENTE' }, data: { estado: 'TERMINADO' },
      });
    }
    const creado = await prisma.contrato.create({ data: datos, select: SIN_DOCUMENTO });
    return reply.status(201).send(conEstado(creado as any, new Date()));
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existe = await prisma.contrato.findFirst({
      where: { id, ...deLaEmpresa(request.empresaId) }, select: { id: true, colaboradorId: true },
    });
    if (!existe) return reply.status(404).send({ error: 'Contrato no encontrado' });

    const datos = limpiar(request.body as any, false);
    if (datos.estado === 'VIGENTE') {
      await prisma.contrato.updateMany({
        where: { colaboradorId: existe.colaboradorId, estado: 'VIGENTE', id: { not: id } },
        data: { estado: 'TERMINADO' },
      });
    }
    const act = await prisma.contrato.update({ where: { id }, data: datos, select: SIN_DOCUMENTO });
    return conEstado(act as any, new Date());
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existe = await prisma.contrato.findFirst({
      where: { id, ...deLaEmpresa(request.empresaId) }, select: { id: true },
    });
    if (!existe) return reply.status(404).send({ error: 'Contrato no encontrado' });
    // Las prórrogas se van con él (ON DELETE CASCADE): son parte del contrato,
    // no registros independientes.
    return prisma.contrato.delete({ where: { id } });
  });

  // Confirmar la conversión a indefinido. No la hace el sistema solo: al agotar
  // el tope de cuatro años el contrato pasa a indefinido por ley, pero que un
  // software le cambie el tipo de contrato a alguien sin que nadie lo apruebe es
  // demasiado. Aquí queda la fecha y quién la confirmó.
  app.post('/:id/convertir-indefinido', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = await prisma.contrato.findFirst({
      where: { id, ...deLaEmpresa(request.empresaId) }, select: { id: true, convertidoAIndefinidoEn: true },
    });
    if (!c) return reply.status(404).send({ error: 'Contrato no encontrado' });
    if (c.convertidoAIndefinidoEn) return reply.status(409).send({ error: 'Este contrato ya estaba marcado como indefinido.' });
    const act = await prisma.contrato.update({
      where: { id }, data: { convertidoAIndefinidoEn: new Date(), fechaFin: null }, select: SIN_DOCUMENTO,
    });
    return conEstado(act as any, new Date());
  });

  // ===== Prórrogas =====
  app.post('/:id/prorrogas', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const c = await prisma.contrato.findFirst({
      where: { id, ...deLaEmpresa(request.empresaId) },
      select: { id: true, tipo: true },
    });
    if (!c) return reply.status(404).send({ error: 'Contrato no encontrado' });
    if (c.tipo === 'INDEFINIDO' || c.tipo === 'OBRA_LABOR') {
      return reply.status(400).send({ error: 'Este tipo de contrato no se prorroga.' });
    }
    if (!body.desde || !body.hasta) return reply.status(400).send({ error: 'La prórroga necesita fecha de inicio y de fin.' });

    const datos: any = { contratoId: id, desde: new Date(body.desde), hasta: new Date(body.hasta) };
    if (documentoValido(body.documento)) {
      datos.documento = body.documento;
      datos.documentoTipo = body.documento.slice(5, body.documento.indexOf(';'));
      datos.documentoNombre = typeof body.documentoNombre === 'string' ? body.documentoNombre.slice(0, 120) : null;
    }
    // Se registra aunque el motor la marque como irregular: la pantalla avisa
    // fuerte, pero no bloquea. Hay excepciones y casos que el sistema no conoce,
    // y quien maneja la nómina sabe lo que firma.
    await prisma.prorrogaContrato.create({ data: datos });
    const act = await prisma.contrato.findUnique({ where: { id }, select: SIN_DOCUMENTO });
    return reply.status(201).send(conEstado(act as any, new Date()));
  });

  app.delete('/prorrogas/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = await prisma.prorrogaContrato.findFirst({
      where: { id, contrato: { colaborador: { empresaId: request.empresaId } } }, select: { id: true },
    });
    if (!p) return reply.status(404).send({ error: 'Prórroga no encontrada' });
    return prisma.prorrogaContrato.delete({ where: { id } });
  });
}

// Convierte las alertas del motor en notificaciones para la campana. Se llama
// desde el dashboard, que es lo que se abre todos los días: este proyecto no
// tiene cron, y para un aviso con 30 días de margen alcanza de sobra.
const TITULOS: Record<string, (n: string) => string> = {
  PREAVISO_VENCIDO: n => `Se venció el plazo para avisar: ${n}`,
  PREAVISO_PROXIMO: n => `Contrato por vencer: ${n}`,
  SE_VUELVE_INDEFINIDO: n => `Pasa a indefinido: ${n}`,
  SUPERA_TOPE: n => `Contrato pasado del tope legal: ${n}`,
  CAMBIO_ETAPA_APRENDIZ: n => `Cambio de etapa de aprendiz: ${n}`,
};

const CUERPOS: Record<string, (d: number | null) => string> = {
  PREAVISO_VENCIDO: () => 'Nadie avisó a tiempo, así que el contrato se prorroga solo por un término igual. Revísalo con tu abogado si la intención era terminarlo.',
  PREAVISO_PROXIMO: d => `Quedan ${d} días para avisar por escrito si no se va a renovar. Pasado ese plazo se prorroga automáticamente.`,
  SE_VUELVE_INDEFINIDO: d => `En ${d} días se agota el tope de cuatro años y el contrato pasa a indefinido por ley.`,
  SUPERA_TOPE: () => 'La vigencia de este contrato supera el tope de cuatro años de la Ley 2466 de 2025.',
  CAMBIO_ETAPA_APRENDIZ: d => `En ${d} días pasa a etapa práctica y la remuneración sube del 75% al 100% del salario mínimo.`,
};

export const NOTIF_POR_ALERTA: Record<string, TipoNotif> = {
  PREAVISO_PROXIMO: 'CONTRATO_PREAVISO',
  PREAVISO_VENCIDO: 'CONTRATO_PREAVISO_VENCIDO',
  SE_VUELVE_INDEFINIDO: 'CONTRATO_A_INDEFINIDO',
  SUPERA_TOPE: 'CONTRATO_A_INDEFINIDO',
  CAMBIO_ETAPA_APRENDIZ: 'CONTRATO_ETAPA_APRENDIZ',
};

export async function avisarContratos(empresaId: string): Promise<void> {
  const contratos = await prisma.contrato.findMany({
    where: { estado: 'VIGENTE', colaborador: { empresaId } },
    select: {
      id: true, tipo: true, fechaInicio: true, fechaFin: true, fechaInicioPractica: true,
      colaborador: { select: { id: true, nombre: true, apellido: true } },
      prorrogas: { select: { desde: true, hasta: true } },
    },
  });
  const hoy = new Date();
  for (const c of contratos) {
    const { alertas } = estadoDelContrato(
      { tipo: c.tipo as any, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, fechaInicioPractica: c.fechaInicioPractica },
      c.prorrogas, hoy,
    );
    const nombre = `${c.colaborador.nombre} ${c.colaborador.apellido}`;
    for (const a of alertas) {
      const tipo = NOTIF_POR_ALERTA[a.tipo];
      if (!tipo || !TITULOS[a.tipo]) continue;
      // Sin repetir: una notificación por contrato y por tipo de alerta. Si no,
      // cada vez que alguien abre el tablero le llega el mismo aviso otra vez.
      const yaExiste = await prisma.notificacion.findFirst({
        where: { empresaId, tipo, entidad: 'colaborador', entidadId: c.colaborador.id, titulo: TITULOS[a.tipo](nombre) },
        select: { id: true },
      });
      if (yaExiste) continue;
      await notificar(empresaId, {
        tipo, titulo: TITULOS[a.tipo](nombre), cuerpo: CUERPOS[a.tipo](a.dias),
        entidad: 'colaborador', entidadId: c.colaborador.id,
      });
    }
  }
}
