import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../prisma';
import { eventoDeError, eventoDeNavegador, cambiosAlRepetirse, tokenDeKiosco, type DatosDePeticion, type FilaDeEvento, type ReporteDelNavegador } from './eventoDeError';
import { eventoDeAcceso, motivoDeRespuesta, type IntentoDeAcceso } from './eventoDeAcceso';
import { seAudita, accionDePeticion, cuerpoParaGuardar } from './auditoriaDePeticion';
import { recortar } from './huellaDeEvento';

// La parte que habla con MySQL. La decisión —qué se agrupa, qué se audita, qué se oculta— vive en
// los módulos puros de al lado y está probada allí; esto es la costura, y se verifica con datos
// reales como dice CLAUDE.md §5 y §8.6.
//
// `prisma` se importa de `./prisma` y NO de `./index`: traerlo del índice levanta Fastify entero,
// y correr las pruebas abriría el puerto 3001 disparando las tareas diarias contra la base de
// desarrollo (CLAUDE.md §8.5).

// Los nombres de empresa se guardan junto al evento para que el rastro sobreviva al borrado de la
// empresa. Consultarlos en cada evento sería una consulta extra por error; este caché los pide una
// sola vez. Que un cambio de nombre posterior no se refleje en los eventos viejos es lo correcto:
// dicen cómo se llamaba cuando pasó.
const nombresDeEmpresa = new Map<string, string | null>();

async function nombreDeEmpresa(empresaId: string | null): Promise<string | null> {
  if (!empresaId) return null;
  if (nombresDeEmpresa.has(empresaId)) return nombresDeEmpresa.get(empresaId) ?? null;
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } });
    nombresDeEmpresa.set(empresaId, empresa?.nombre ?? null);
    return empresa?.nombre ?? null;
  } catch {
    // Sin nombre el evento se guarda igual: perder la etiqueta es mucho menos grave que perder el
    // evento. No se cachea el fallo, para que el siguiente vuelva a intentarlo.
    return null;
  }
}

// P2002 es el código de Prisma para "ya existe una fila con esa clave única". Se comprueba por
// código y no por el texto del mensaje, que cambia entre versiones.
function esClaveDuplicada(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

// Marca en la propia petición de que su intento de acceso YA quedó registrado por la ruta. Sin
// ella, el enganche global volvería a registrar el mismo 401 y cada contraseña equivocada dejaría
// dos filas.
const YA_REGISTRADO = Symbol.for('horapro.accesoRegistrado');

type PeticionConSesion = FastifyRequest & {
  user?: { id?: string; email?: string; nombre?: string; empresaId?: string | null };
};

export function datosDePeticion(request: FastifyRequest): DatosDePeticion {
  const conSesion = request as PeticionConSesion;
  return {
    metodo: request.method,
    url: request.url,
    // `request.ip` solo dice la verdad con `trustProxy` puesto: detrás del proxy del hosting, sin
    // esa opción, TODO el mundo aparecería como 127.0.0.1. Ver `index.ts`.
    ip: request.ip,
    navegador: request.headers['user-agent'],
    usuario: conSesion.user
      ? { id: conSesion.user.id, email: conSesion.user.email, nombre: conSesion.user.nombre }
      : null,
    empresa: conSesion.user?.empresaId ? { id: conSesion.user.empresaId } : null,
  };
}

// Guarda la fila. Si ya existe una con la misma huella, suma una ocurrencia en vez de insertar.
async function guardar(fila: FilaDeEvento, log?: FastifyBaseLogger): Promise<void> {
  const ahora = new Date();
  const nombre = fila.empresaNombre ?? (await nombreDeEmpresa(fila.empresaId));
  const datos = { ...fila, empresaNombre: nombre, ultimaVez: ahora };

  // Al repetirse se refresca el detalle: interesa el rastro de la ÚLTIMA vez, que es la que se
  // puede reproducir. `primeraVez` no se toca: dice desde cuándo viene pasando.
  // Y se queda con el lugar y la persona de ESTA vez, no los de la primera (cambiosAlRepetirse).
  const sumarUna = cambiosAlRepetirse(datos, ahora);

  try {
    if (!fila.huella) {
      await prisma.eventoSistema.create({ data: { ...datos, huella: null, primeraVez: ahora } });
      return;
    }
    await prisma.eventoSistema.upsert({
      where: { huella: fila.huella },
      update: sumarUna,
      create: { ...datos, primeraVez: ahora },
    });
  } catch (err) {
    // Dos ocurrencias del MISMO problema a la vez: las dos ven que la fila no existe y las dos
    // intentan crearla; la segunda choca con la restricción única. Sin este reintento se perdía
    // la ocurrencia en silencio, que es justo lo que este módulo no puede hacer. Se cazó
    // verificando contra la base: dos peticiones seguidas dejaban `veces = 1`.
    if (fila.huella && esClaveDuplicada(err)) {
      try {
        await prisma.eventoSistema.update({ where: { huella: fila.huella }, data: sumarUna });
        return;
      } catch (err2) {
        log?.error({ err: err2, huella: fila.huella }, 'REGISTRO DEL SISTEMA: no se pudo sumar la ocurrencia');
        return;
      }
    }
    // Un catch que se traga el error convierte una caída en un silencio, que es exactamente cómo
    // el auto-cierre estuvo dos semanas sin cerrar turnos (CLAUDE.md §8.3). Aquí NO se puede
    // registrar el fallo en la propia tabla —sería morderse la cola—, así que va al log del
    // servidor con un texto reconocible.
    log?.error({ err, huella: fila.huella }, 'REGISTRO DEL SISTEMA: no se pudo guardar el evento');
  }
}

// Todo lo de abajo se llama SIN esperar: registrar un evento no puede frenar ni tumbar la petición
// que lo produjo. Por eso cada una devuelve void y el fallo se queda en el log.

export function registrarError(error: unknown, request: FastifyRequest, estado = 500): void {
  void guardar(eventoDeError(error, datosDePeticion(request), estado), request.log);
}

export function registrarAcceso(intento: Omit<IntentoDeAcceso, 'ip' | 'navegador' | 'ruta'>, request: FastifyRequest): void {
  (request as unknown as Record<symbol, boolean>)[YA_REGISTRADO] = true;
  const datos = datosDePeticion(request);
  const evento = eventoDeAcceso({
    ...intento,
    ip: datos.ip,
    ruta: datos.url,
    navegador: datos.navegador,
  });
  void guardar({
    tipo: 'ACCESO',
    origen: 'SERVIDOR',
    huella: evento.huella,
    mensaje: evento.mensaje,
    detalle: evento.detalle,
    metodo: datos.metodo?.toUpperCase() ?? null,
    ruta: (datos.url ?? '').split('?')[0] || null,
    estado: null,
    ip: evento.ip,
    navegador: recortar(datos.navegador, 255) || null,
    usuarioId: null,
    usuarioEmail: intento.email ?? null,
    usuarioNombre: null,
    empresaId: datos.empresa?.id ?? null,
    empresaNombre: null,
  }, request.log);
}

export function registrarReporteDelNavegador(reporte: ReporteDelNavegador, request: FastifyRequest): void {
  const fila = eventoDeNavegador(reporte, datosDePeticion(request));
  if (fila) void conEmpresaDelKiosco(fila).then(f => guardar(f, request.log));
}

// Un error del kiosco llega sin sesión: la empresa se saca del token que lleva la dirección
// (tokenDeKiosco). Si no se encuentra, el evento se guarda igual, sin empresa.
async function conEmpresaDelKiosco(fila: FilaDeEvento): Promise<FilaDeEvento> {
  const token = fila.empresaId ? null : tokenDeKiosco(fila.ruta);
  if (!token) return fila;
  try {
    const empresa = await prisma.empresa.findUnique({ where: { marcadorToken: token }, select: { id: true, nombre: true } });
    return empresa ? { ...fila, empresaId: empresa.id, empresaNombre: empresa.nombre } : fila;
  } catch {
    return fila;
  }
}

// El enganche global: toda petición que cambió algo y salió bien deja su fila. Va en `onResponse`
// para no añadir trabajo antes de responderle a quien espera.
export function registrarAuditoria(request: FastifyRequest, reply: FastifyReply): void {
  if (!seAudita(request.method, request.url, reply.statusCode)) return;
  const datos = datosDePeticion(request);
  // Sin sesión no hay a quién atribuirle la acción, y una auditoría sin autor no sirve de nada.
  // Las rutas públicas que sí importan (el webhook de Wompi) se reconocen por su ruta.
  const anonimaQueImporta = request.url.startsWith('/api/wompi');
  if (!datos.usuario?.id && !anonimaQueImporta) return;

  void guardar({
    tipo: 'AUDITORIA',
    origen: 'SERVIDOR',
    // Sin huella: cada acción es un hecho distinto y se ve suelta.
    huella: null as unknown as string,
    mensaje: recortar(accionDePeticion(request.method, request.url), 500),
    detalle: cuerpoParaGuardar(request.body),
    metodo: request.method.toUpperCase(),
    ruta: request.url.split('?')[0] || null,
    estado: reply.statusCode,
    ip: datos.ip ?? null,
    navegador: recortar(datos.navegador, 255) || null,
    usuarioId: datos.usuario?.id ?? null,
    usuarioEmail: datos.usuario?.email ?? null,
    usuarioNombre: datos.usuario?.nombre ?? null,
    empresaId: datos.empresa?.id ?? null,
    empresaNombre: null,
  }, request.log);
}

// Lo que el enganche global registra de las respuestas que rechazaron a alguien. Va junto a la
// auditoría en el mismo `onResponse`: una sola pasada por petición.
export function registrarAccesoPorRespuesta(request: FastifyRequest, reply: FastifyReply): void {
  const yaRegistrado = Boolean((request as unknown as Record<symbol, boolean>)[YA_REGISTRADO]);
  const motivo = motivoDeRespuesta(reply.statusCode, request.url, yaRegistrado);
  if (!motivo) return;
  registrarAcceso({ motivo }, request);
}
