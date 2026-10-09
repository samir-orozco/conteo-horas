import { describe, it, expect, vi } from 'vitest';
import type { EstadoResena, ResenaAdmin, TarjetaPublica } from './api';
import {
  PESTANAS, accionesDelAdmin, autorReal, avisoDeEmpresa, contarPorPestana, cuerpoDelFormulario,
  detallesDeOrigen, estaEnPestana, etiquetaDeAccion, etiquetaDeEstado, etiquetaDeMarca, filtrarResenas,
  formularioDe, formularioNuevo, promedioLegible, puedeQuitarNombre, requiereSeguimiento,
  tarjetaDeVistaPrevia, type Filtros, type FormularioManual,
} from './adminResenas';

// Las decisiones de la pantalla «Reseñas» del super admin (docs/RESENAS.md, sección 4). La suite corre
// en Los Ángeles a propósito (vite.config.ts): las fechas que se pintan tienen que salir en Bogotá.

// Dos de estas reglas son COPIAS de las del servidor, porque el navegador no puede importar el
// backend: qué movimientos de estado se ofrecen y cómo firma la tarjeta. Al final del archivo se
// comparan con las funciones de `backend/src/utils/resenas.ts`, que son las que mandan (§9.3).
// Ese archivo importa `suscripcion` y `fechas`, que arrastran Prisma y date-fns-tz; aquí no se usan
// y se reemplazan para que cargue sin ellos.
vi.mock('../../../../backend/src/utils/suscripcion', () => ({ estadoEfectivo: () => 'ACTIVA' }));
vi.mock('../../../../backend/src/utils/fechas', () => ({
  claveDiaBogota: () => '', medianocheBogota: () => new Date(0), sumarMesesBogota: () => new Date(0),
}));

type DelServidor = {
  transicionValida: (quien: 'ADMIN' | 'CLIENTE', desde: EstadoResena, hacia: unknown) => boolean;
  aTarjetaPublica: (r: Pick<ResenaAdmin, 'id' | 'estrellas' | 'texto' | 'comoAparece' | 'nombrePublico' | 'cargoPublico'>) => TarjetaPublica;
};
// Con `import.meta.glob` y no con un import directo, para que `tsc -b` no siga el archivo hasta el
// backend, que no compila con los tipos del frontend (aquí no hay `@prisma/client`). Vitest sí lo
// carga, con los dos reemplazos de arriba. Si la ruta deja de existir, el glob no encuentra nada y
// las dos pruebas del final se ponen rojas: no pasan en silencio (§12.2).
const DEL_SERVIDOR = import.meta.glob<DelServidor>('../../../../backend/src/utils/resenas.ts');
async function delServidor(): Promise<DelServidor> {
  const cargadores = Object.values(DEL_SERVIDOR);
  expect(cargadores, 'no se encontró backend/src/utils/resenas.ts').toHaveLength(1);
  return cargadores[0]();
}

const BASE: ResenaAdmin = {
  id: 'r1', origen: 'CLIENTE', estado: 'POR_REVISAR', empresaId: 'e1', usuarioId: 'u1', estrellas: 5,
  texto: 'Ya no peleamos con el Excel a fin de mes.', comoAparece: 'CON_NOMBRE',
  nombrePublico: 'Juan Pérez', cargoPublico: 'Tuercas SAS',
  textoAutorizacion: 'Sí, como Juan Pérez, de Tuercas SAS', versionPolitica: '1.2',
  canal: null, referencia: null, autorizacion: null, fechaOpinion: null, registradaPor: null,
  planAlEnviar: 'PROFESIONAL', mesesPagadosAlEnviar: 2, nombreRetiradoEn: null, publicadaEn: null,
  creadoEn: '2026-10-02T15:00:00.000Z', actualizadoEn: '2026-10-02T15:00:00.000Z',
  empresaNombre: 'Tuercas SAS', empresaActiva: true, estadoSuscripcion: 'ACTIVA', esReferida: false,
  autorNombre: 'Juan Pérez', autorEmail: 'juan@tuercas.co', mesesPagados: 3,
  marcas: [], publicable: true, motivoNoPublicable: null,
};
const resena = (cambios: Partial<ResenaAdmin> = {}): ResenaAdmin => ({ ...BASE, ...cambios });

// Una anónima de cliente: el servidor congela el nombre y la empresa igual, para que el dueño sepa quién fue.
const ANONIMA = resena({
  id: 'r2', estrellas: 2, comoAparece: 'ANONIMA', texto: 'El kiosco se demora en reconocer.',
  nombrePublico: 'Ana Ruiz', cargoPublico: 'Lavandería Las Brisas', empresaNombre: 'Lavandería Las Brisas',
  autorNombre: 'Ana Ruiz', autorEmail: 'ana@brisas.co',
});

// Una manual cargada por el dueño, con la fecha de la opinión anclada a medianoche de Bogotá (R31).
const MANUAL = resena({
  id: 'r3', origen: 'MANUAL', empresaId: null, usuarioId: null, estrellas: null,
  texto: 'Liquidar la nómina nos tomaba dos días.', nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM',
  textoAutorizacion: null, versionPolitica: null, canal: 'WhatsApp', referencia: 'chat del 19/07',
  autorizacion: 'dijo que sí', fechaOpinion: '2026-07-19T05:00:00.000Z', registradaPor: 'samir@horapro.co',
  planAlEnviar: null, mesesPagadosAlEnviar: null, empresaNombre: null, empresaActiva: null,
  estadoSuscripcion: null, autorNombre: null, autorEmail: null, mesesPagados: null,
});

const TODAS: Filtros = { pestana: 'TODAS', estrellas: '', origen: '', buscar: '' };
const ESTADOS: EstadoResena[] = ['OMITIDA', 'POR_REVISAR', 'PUBLICADA', 'OCULTA', 'ARCHIVADA'];

describe('pestañas', () => {
  it('son cinco, en el orden de la pantalla, y ninguna es de omitidas', () => {
    expect(PESTANAS.map(p => p.label)).toEqual(['Todas', 'Por revisar', 'Publicadas', 'Ocultas', 'Archivadas']);
  });

  it('una omitida no está en ninguna: la empresa no opinó, solo se cuenta', () => {
    for (const p of PESTANAS) expect(estaEnPestana('OMITIDA', p.id)).toBe(false);
  });

  it('«Todas» es la lista normal, y una archivada sale de ella (R21)', () => {
    expect(estaEnPestana('POR_REVISAR', 'TODAS')).toBe(true);
    expect(estaEnPestana('PUBLICADA', 'TODAS')).toBe(true);
    expect(estaEnPestana('OCULTA', 'TODAS')).toBe(true);
    expect(estaEnPestana('ARCHIVADA', 'TODAS')).toBe(false);
  });

  it('cada pestaña de estado tiene solo las suyas', () => {
    expect(estaEnPestana('ARCHIVADA', 'ARCHIVADA')).toBe(true);
    expect(estaEnPestana('PUBLICADA', 'POR_REVISAR')).toBe(false);
    expect(estaEnPestana('OCULTA', 'OCULTA')).toBe(true);
  });

  it('cuenta cuántas hay en cada una, sin las omitidas', () => {
    const lista = (['POR_REVISAR', 'POR_REVISAR', 'PUBLICADA', 'OCULTA', 'ARCHIVADA', 'OMITIDA', 'OMITIDA'] as const)
      .map((estado, i) => resena({ id: `r${i}`, estado }));
    expect(contarPorPestana(lista)).toEqual({ TODAS: 4, POR_REVISAR: 2, PUBLICADA: 1, OCULTA: 1, ARCHIVADA: 1 });
  });
});

describe('filtrarResenas', () => {
  const lista = [
    BASE, ANONIMA, MANUAL,
    resena({ id: 'r4', estado: 'ARCHIVADA', estrellas: 1 }),
    resena({ id: 'r5', estado: 'OMITIDA', estrellas: null, texto: '' }),
    resena({ id: 'r6', estado: 'PUBLICADA', estrellas: 4, autorNombre: 'Julián Gómez', nombrePublico: 'Julián Gómez' }),
  ];
  const ids = (filtros: Partial<Filtros>) => filtrarResenas(lista, { ...TODAS, ...filtros }).map(r => r.id);

  it('por pestaña, y sin omitidas en ninguna', () => {
    expect(ids({})).toEqual(['r1', 'r2', 'r3', 'r6']);
    expect(ids({ pestana: 'ARCHIVADA' })).toEqual(['r4']);
    expect(ids({ pestana: 'PUBLICADA' })).toEqual(['r6']);
  });

  it('por estrellas, y «sin calificación» encuentra las que no traen', () => {
    expect(ids({ estrellas: '2' })).toEqual(['r2']);
    expect(ids({ estrellas: 'SIN' })).toEqual(['r3']);
  });

  it('por origen', () => {
    expect(ids({ origen: 'MANUAL' })).toEqual(['r3']);
    expect(ids({ origen: 'CLIENTE' })).toEqual(['r1', 'r2', 'r6']);
  });

  it('el buscador encuentra por el texto, por quien la escribió de verdad y sin tildes', () => {
    expect(ids({ buscar: 'kiosco' })).toEqual(['r2']);
    // Una anónima se busca por su autor real: el dueño sabe quién fue aunque la web no.
    expect(ids({ buscar: 'ana@brisas' })).toEqual(['r2']);
    expect(ids({ buscar: 'julian' })).toEqual(['r6']);
    expect(ids({ buscar: 'whatsapp' })).toEqual(['r3']);
  });

  it('los filtros se suman', () => {
    expect(ids({ origen: 'CLIENTE', estrellas: '5', buscar: 'excel' })).toEqual(['r1']);
    expect(ids({ origen: 'MANUAL', estrellas: '5' })).toEqual([]);
  });
});

describe('acciones según el estado (4.2)', () => {
  it('ofrece exactamente los movimientos válidos de cada estado', () => {
    expect(accionesDelAdmin('POR_REVISAR')).toEqual(['PUBLICADA', 'ARCHIVADA']);
    expect(accionesDelAdmin('PUBLICADA')).toEqual(['OCULTA', 'ARCHIVADA']);
    expect(accionesDelAdmin('OCULTA')).toEqual(['PUBLICADA', 'ARCHIVADA']);
    expect(accionesDelAdmin('ARCHIVADA')).toEqual(['POR_REVISAR']);
  });

  it('una omitida no la mueve el admin', () => {
    expect(accionesDelAdmin('OMITIDA')).toEqual([]);
  });

  it('cada acción y cada estado tienen su nombre', () => {
    expect(etiquetaDeAccion('PUBLICADA')).toBe('Publicar');
    expect(etiquetaDeAccion('OCULTA')).toBe('Ocultar');
    expect(etiquetaDeAccion('ARCHIVADA')).toBe('Archivar');
    expect(etiquetaDeAccion('POR_REVISAR')).toBe('Devolver a revisión');
    expect(ESTADOS.map(etiquetaDeEstado)).toEqual(['Omitida', 'Por revisar', 'Publicada', 'Oculta', 'Archivada']);
  });
});

describe('tarjetaDeVistaPrevia (R25, R42)', () => {
  it('con nombre: la firma es el nombre y el cargo con la empresa', () => {
    expect(tarjetaDeVistaPrevia(BASE)).toEqual({
      id: 'r1', estrellas: 5, texto: BASE.texto, nombre: 'Juan Pérez', detalle: 'Tuercas SAS',
    });
  });

  it('anónima: ni el nombre ni la empresa, aunque estén guardados', () => {
    expect(tarjetaDeVistaPrevia(ANONIMA)).toEqual({
      id: 'r2', estrellas: 2, texto: ANONIMA.texto, nombre: 'Cliente de HoraPro', detalle: null,
    });
  });

  it('con el nombre quitado, o sin opción elegida, también sale anónima', () => {
    expect(tarjetaDeVistaPrevia(resena({ nombrePublico: null, cargoPublico: null })).nombre).toBe('Cliente de HoraPro');
    expect(tarjetaDeVistaPrevia(resena({ comoAparece: null })).nombre).toBe('Cliente de HoraPro');
  });

  it('un cargo vacío no deja una línea en blanco', () => {
    expect(tarjetaDeVistaPrevia(resena({ cargoPublico: '' })).detalle).toBeNull();
  });
});

describe('autorReal (R14): quién la escribió, solo para el super admin', () => {
  it('de una anónima de cliente: el nombre, el correo y la empresa', () => {
    expect(autorReal(ANONIMA)).toBe('Ana Ruiz · ana@brisas.co · Lavandería Las Brisas');
  });

  it('de una con nombre no hace falta: la firma ya lo dice', () => {
    expect(autorReal(BASE)).toBeNull();
  });

  it('si la cuenta ya no existe, usa la firma que se congeló al enviar', () => {
    expect(autorReal({ ...ANONIMA, autorNombre: null, autorEmail: null })).toBe('Ana Ruiz · Lavandería Las Brisas');
  });

  it('una manual anónima sin nadie detrás no tiene autor que mostrar', () => {
    expect(autorReal({ ...MANUAL, nombrePublico: null, cargoPublico: null, comoAparece: 'ANONIMA' })).toBeNull();
  });
});

describe('marcas de la fila', () => {
  it('⚑ en las de 1 y 2 estrellas (R17)', () => {
    expect([1, 2, 3, 4, 5, null].map(requiereSeguimiento)).toEqual([true, true, false, false, false, false]);
  });

  it('cada marca de revisión dice qué trae, y una que no se conoce no se pierde (R18)', () => {
    expect(etiquetaDeMarca('ENLACE')).toBe('Trae un enlace');
    expect(etiquetaDeMarca('TELEFONO')).toBe('Trae un teléfono');
    expect(etiquetaDeMarca('CORREO')).toBe('Trae un correo');
    expect(etiquetaDeMarca('ARROBA')).toBe('Trae un @usuario');
    expect(etiquetaDeMarca('OTRA')).toBe('Revisar: OTRA');
  });

  it('avisa si la empresa está inactiva, suspendida, en mora o cancelada (sección 6)', () => {
    expect(avisoDeEmpresa(resena({ empresaActiva: false, estadoSuscripcion: 'SUSPENDIDA' }))).toBe('Empresa inactiva');
    expect(avisoDeEmpresa(resena({ estadoSuscripcion: 'SUSPENDIDA' }))).toBe('Empresa suspendida');
    expect(avisoDeEmpresa(resena({ estadoSuscripcion: 'EN_MORA' }))).toBe('Empresa en mora');
    expect(avisoDeEmpresa(resena({ estadoSuscripcion: 'CANCELADA' }))).toBe('Suscripción cancelada');
  });

  it('no avisa de una al día, de cortesía, en prueba, ni de una manual sin empresa', () => {
    for (const estadoSuscripcion of ['ACTIVA', 'ILIMITADA', 'PRUEBA']) {
      expect(avisoDeEmpresa(resena({ estadoSuscripcion }))).toBeNull();
    }
    expect(avisoDeEmpresa(MANUAL)).toBeNull();
  });

  it('el nombre se puede quitar mientras haya uno guardado, y una sola vez (R23)', () => {
    expect(puedeQuitarNombre(BASE)).toBe(true);
    // También de una anónima: el nombre congelado es un dato de la persona.
    expect(puedeQuitarNombre(ANONIMA)).toBe(true);
    expect(puedeQuitarNombre(resena({ nombrePublico: null, cargoPublico: null, nombreRetiradoEn: '2026-10-05T15:00:00.000Z' }))).toBe(false);
    expect(puedeQuitarNombre({ ...MANUAL, nombrePublico: null, cargoPublico: null })).toBe(false);
  });
});

describe('detallesDeOrigen (R14)', () => {
  it('de cliente: origen, plan, meses pagados y la fecha en que llegó', () => {
    expect(detallesDeOrigen(BASE)).toEqual(['Cliente', 'Profesional', '3 meses pagados', '2 de oct de 2026']);
  });

  it('la fecha es la de Bogotá: las 06:00 UTC del 2 de octubre son la 1 a. m. allá y las 11 p. m. del 1 en Los Ángeles', () => {
    expect(detallesDeOrigen(resena({ creadoEn: '2026-10-02T06:00:00.000Z' }))).toContain('2 de oct de 2026');
  });

  it('un mes en singular; sin el dato de hoy usa el de cuando opinó, y sin ninguno no lo inventa', () => {
    expect(detallesDeOrigen(resena({ mesesPagados: 1 }))).toContain('1 mes pagado');
    // Cero también es un dato: no se esconde como si faltara.
    expect(detallesDeOrigen(resena({ mesesPagados: 0 }))).toContain('0 meses pagados');
    expect(detallesDeOrigen(resena({ mesesPagados: null }))).toContain('2 meses pagados');
    expect(detallesDeOrigen(resena({ mesesPagados: null, mesesPagadosAlEnviar: null, planAlEnviar: null })))
      .toEqual(['Cliente', '2 de oct de 2026']);
  });

  it('un plan que no está en la lista se muestra tal cual', () => {
    expect(detallesDeOrigen(resena({ planAlEnviar: 'A_LA_MEDIDA' }))).toContain('A_LA_MEDIDA');
  });

  it('manual: el canal, quién la cargó y la fecha de la opinión, que es medianoche de Bogotá (R29, R31)', () => {
    // En Los Ángeles las 05:00 UTC del 19 son las 10 p. m. del 18: sin la zona saldría el día anterior.
    expect(detallesDeOrigen(MANUAL)).toEqual(['Manual', 'WhatsApp', 'cargada por samir@horapro.co', '19 de jul de 2026']);
  });
});

describe('promedioLegible', () => {
  it('con coma decimal y un decimal, como se lee en Colombia', () => {
    expect(promedioLegible(4.3)).toBe('4,3');
    expect(promedioLegible(4)).toBe('4,0');
    expect(promedioLegible(null)).toBe('—');
  });
});

describe('el formulario de una manual (4.3)', () => {
  const lleno: FormularioManual = {
    estrellas: 5, sinCalificacion: false, texto: 'Liquidar la nómina nos tomaba dos días.',
    nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM', empresaId: '',
    canal: 'WhatsApp', fechaOpinion: '2026-07-19', referencia: 'chat del 19/07', autorizacion: 'dijo que sí',
  };

  it('nuevo: vacío, con la fecha de hoy y sin estrellas elegidas', () => {
    expect(formularioNuevo('2026-10-08')).toEqual({
      estrellas: null, sinCalificacion: false, texto: '', nombrePublico: '', cargoPublico: '', empresaId: '',
      canal: '', fechaOpinion: '2026-10-08', referencia: '', autorizacion: '',
    });
  });

  it('arma el cuerpo de la petición; sin empresa va null', () => {
    expect(cuerpoDelFormulario(lleno)).toEqual({
      estrellas: 5, texto: lleno.texto, nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM', empresaId: null,
      canal: 'WhatsApp', fechaOpinion: '2026-07-19', referencia: 'chat del 19/07', autorizacion: 'dijo que sí',
    });
    expect(cuerpoDelFormulario({ ...lleno, empresaId: 'e9' })).toMatchObject({ empresaId: 'e9' });
  });

  it('«la fuente no traía calificación» manda sin estrellas aunque se hubieran marcado (R28)', () => {
    expect(cuerpoDelFormulario({ ...lleno, sinCalificacion: true })).toMatchObject({ estrellas: null });
  });

  it('sin estrellas ni la casilla no se guarda: no se decide por omisión si hubo calificación', () => {
    expect(cuerpoDelFormulario({ ...lleno, estrellas: null })).toEqual({
      error: 'Elige las estrellas, o marca que la fuente no traía calificación.',
    });
  });

  it('sin texto o sin fecha tampoco', () => {
    expect(cuerpoDelFormulario({ ...lleno, texto: '   ' })).toEqual({ error: 'Falta el texto de la reseña.' });
    expect(cuerpoDelFormulario({ ...lleno, fechaOpinion: '' })).toEqual({ error: 'Falta la fecha de la opinión.' });
  });

  it('editar parte de la fila, con la fecha de la opinión en el día de Bogotá', () => {
    expect(formularioDe(MANUAL)).toEqual({
      estrellas: null, sinCalificacion: true, texto: MANUAL.texto, nombrePublico: 'Mateo Vera',
      cargoPublico: 'CEO Grupo MSM', empresaId: '', canal: 'WhatsApp', fechaOpinion: '2026-07-19',
      referencia: 'chat del 19/07', autorizacion: 'dijo que sí',
    });
  });

  it('sin fecha de opinión usa el día en que se cargó, en Bogotá; los campos vacíos quedan en blanco', () => {
    // Las 03:00 UTC del 2 de octubre son las 10 p. m. del 1 en Bogotá: cortar el ISO daría el día 2.
    const f = formularioDe({
      ...MANUAL, fechaOpinion: null, creadoEn: '2026-10-02T03:00:00.000Z', canal: null, nombrePublico: null, empresaId: 'e1', estrellas: 4,
    });
    expect(f).toMatchObject({ fechaOpinion: '2026-10-01', canal: '', nombrePublico: '', empresaId: 'e1', estrellas: 4, sinCalificacion: false });
  });
});

// ────────── Las copias, contra el servidor ──────────

describe('las copias de las reglas del servidor siguen iguales a las de backend/src/utils/resenas.ts', () => {
  it('los movimientos de estado que se ofrecen son exactamente los que el servidor acepta', async () => {
    const { transicionValida } = await delServidor();
    for (const desde of ESTADOS) {
      for (const hacia of ESTADOS) {
        expect((accionesDelAdmin(desde) as EstadoResena[]).includes(hacia), `${desde} → ${hacia}`)
          .toBe(transicionValida('ADMIN', desde, hacia));
      }
    }
  });

  it('la vista previa firma igual que la tarjeta que sale en la landing', async () => {
    const { aTarjetaPublica } = await delServidor();
    const casos = [
      BASE, ANONIMA, MANUAL,
      resena({ comoAparece: null }),
      resena({ cargoPublico: '' }),
      resena({ nombrePublico: null, cargoPublico: null }),
      resena({ comoAparece: 'CON_NOMBRE', nombrePublico: '' }),
    ];
    for (const r of casos) expect(tarjetaDeVistaPrevia(r)).toEqual(aTarjetaPublica(r));
  });
});
