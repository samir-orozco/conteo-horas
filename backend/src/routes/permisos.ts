import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import { capacidadesEmpresa } from '../utils/capacidades';
import { CLAVE_PERMISOS_REMUNERADOS, parsearPoliticaPermisos, esPermisoRemunerado } from '../utils/saldoTiempo';

// La validación de la evidencia vivía aquí, duplicada: una copia del regex y
// del tope que nunca se migró el día que se extrajo `documentos.ts`. Eso hacía
// que agregar un formato en un sitio no lo agregara en el otro, que es
// exactamente lo que el comentario de cabecera de documentos.ts dice que se
// quiso evitar. Ahora las dos usan la misma función.
import { cambioDeDocumento, documentoValido } from '../utils/documentos';

// Campos que la empresa puede enviar (evita pasar basura a Prisma).
//
// Devuelve el motivo en vez de los datos cuando la evidencia no se acepta: la
// ruta lo convierte en un 400. Antes se descartaba sin decir nada y la novedad
// se guardaba sin el adjunto que la persona creía haber subido.
function limpiarPermiso(data: any, esNuevo: boolean):
  { ok: true; datos: any } | { ok: false; motivo: string } {
  const out: any = {};
  if (esNuevo) out.colaboradorId = data.colaboradorId;
  if (data.tipo !== undefined) out.tipo = data.tipo;
  if (data.descripcion !== undefined) out.descripcion = data.descripcion || null;
  if (data.fechaInicio !== undefined) out.fechaInicio = data.fechaInicio;
  if (data.fechaFin !== undefined) out.fechaFin = data.fechaFin;
  if (data.aprobado !== undefined) out.aprobado = data.aprobado;

  const cambio = cambioDeDocumento(data.evidencia, data.evidenciaNombre);
  if (cambio.accion === 'rechazar') return { ok: false, motivo: cambio.motivo };
  if (cambio.accion === 'quitar') {
    out.evidencia = null; out.evidenciaTipo = null; out.evidenciaNombre = null;
  } else if (cambio.accion === 'guardar') {
    out.evidencia = cambio.documento;
    out.evidenciaTipo = cambio.tipo;
    out.evidenciaNombre = cambio.nombre;
  }
  return { ok: true, datos: out };
}

// El listado NO trae la evidencia (base64 pesado); solo el tipo/nombre para saber que existe.
const SELECT_LISTA = {
  id: true, colaboradorId: true, fechaInicio: true, fechaFin: true, tipo: true,
  descripcion: true, aprobado: true, creadoEn: true, evidenciaTipo: true, evidenciaNombre: true,
  // Colaborador acotado: NUNCA exponer rostroDescriptor (biométrico), salario ni cédula.
  colaborador: { select: { id: true, nombre: true, apellido: true, cargo: true } },
};

export default async function permisoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/', auth, async (request) => {
    const { colaboradorId } = request.query as any;
    const where: any = { colaborador: { empresaId: request.empresaId } };
    if (colaboradorId) where.colaboradorId = colaboradorId;
    const [permisos, cfg] = await Promise.all([
      prisma.permiso.findMany({ where, select: SELECT_LISTA, orderBy: { fechaInicio: 'desc' } }),
      prisma.configuracion.findUnique({
        where: { empresaId_clave: { empresaId: request.empresaId!, clave: CLAVE_PERMISOS_REMUNERADOS } },
      }),
    ]);
    // `remunerado` se resuelve aquí, con la misma función que usa el cálculo del
    // saldo, para que la UI no tenga que reimplementar la regla y no se puedan
    // desincronizar la etiqueta que ve el usuario y el descuento que se aplica.
    const politica = parsearPoliticaPermisos(cfg?.valor);
    return permisos.map(p => ({ ...p, remunerado: esPermisoRemunerado(p.tipo, politica) }));
  });

  // Evidencia de una novedad (se pide aparte para no cargarla en cada listado)
  app.get('/:id/evidencia', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const permiso = await prisma.permiso.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
      select: { evidencia: true, evidenciaTipo: true, evidenciaNombre: true },
    });
    if (!permiso || !permiso.evidencia) return reply.status(404).send({ error: 'Sin evidencia' });
    return permiso;
  });

  app.post('/', auth, async (request, reply) => {
    const data = request.body as any;
    const col = await prisma.colaborador.findFirst({
      where: { id: data.colaboradorId, empresaId: request.empresaId },
    });
    if (!col) return reply.status(404).send({ error: 'Colaborador no encontrado' });
    if (documentoValido(data.evidencia)) {
      const cap = await capacidadesEmpresa(request.empresaId!);
      if (!cap.features.evidencia) return reply.status(403).send({ error: 'Adjuntar evidencia está disponible en el plan Profesional.', codigo: 'FUNCION_PLAN', funcion: 'evidencia' });
    }
    const limpio = limpiarPermiso(data, true);
    if (!limpio.ok) return reply.status(400).send({ error: limpio.motivo });
    const permiso = await prisma.permiso.create({ data: limpio.datos });
    return reply.status(201).send(permiso);
  });

  app.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.permiso.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Permiso no encontrado' });
    const data = request.body as any;
    const limpio = limpiarPermiso(data, false);
    if (!limpio.ok) return reply.status(400).send({ error: limpio.motivo });
    return prisma.permiso.update({ where: { id }, data: limpio.datos });
  });

  app.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existente = await prisma.permiso.findFirst({
      where: { id, colaborador: { empresaId: request.empresaId } },
    });
    if (!existente) return reply.status(404).send({ error: 'Permiso no encontrado' });
    return prisma.permiso.delete({ where: { id } });
  });
}
