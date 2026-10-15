import { calcularTardanzas, excusaLaTardanza, type HorarioConFranjas, type NovedadParaDia } from './tardanzas';
import { diasParaMedir, type DiaEsperadoCalculado } from './diasEsperados';
import { asistenciaPorDia, estadoDeAsistencia, type DiaDeAsistencia, type PersonaParaAsistencia } from './asistencia';
import { llegadasTardePorDia, type LlegadasDelDia } from './llegadasTardePorDia';
import { claveDiaBogota, rangoDiaBogota, rangoSemanaBogota } from './fechas';

// La semana del Inicio (15 de octubre de 2026): la asistencia de lunes a domingo, las llegadas tarde
// de los últimos 7 días y «Aún no han marcado entrada», con UNA regla —quién debía venir lo dice
// utils/asistencia.ts y quién llegó tarde, `calcularTardanzas`, la misma del reporte—. Esta función
// no consulta nada: recibe lo que la ruta leyó, para poder probarse entera (CLAUDE.md §8.2).

const DIA_MS = 24 * 60 * 60 * 1000;

// Qué días hacen falta: de hoy − 6 (las llegadas tarde) o del lunes (la asistencia), lo que sea más
// viejo, hasta el domingo de esta semana. Las fechas son medianoches de Bogotá (§4).
export function ventanaDelInicio(ahora: Date) {
  const { inicioDia, finDia } = rangoDiaBogota(ahora);
  const { lunes, finExclusivo } = rangoSemanaBogota(inicioDia);
  const hace6 = new Date(inicioDia.getTime() - 6 * DIA_MS);
  const claves = (desde: Date) => Array.from({ length: 7 }, (_, i) => claveDiaBogota(new Date(desde.getTime() + i * DIA_MS)));
  return {
    inicio: hace6 < lunes ? hace6 : lunes,
    fin: finExclusivo,
    inicioDia, finDia,
    claves7: claves(hace6),
    clavesSemana: claves(lunes),
  };
}

export type ColaboradorDelInicio = {
  id: string; nombre: string; apellido: string; cargo: string | null; creadoEn: Date;
  horario: (HorarioConFranjas & { nombre: string }) | null;
};

export type FilaSinMarcar = { id: string; nombre: string; cargo: string | null; horario: string; horaEntrada: string; novedad: string | null };

export function armarSemanaDelInicio(e: {
  ahora: Date;
  colaboradores: ColaboradorDelInicio[];
  // Los días materializados de la ventana; los que falten los completa el horario (`diasParaMedir`).
  materializados: (DiaEsperadoCalculado & { colaboradorId: string })[];
  // Las marcaciones de la ventana, con la fecha de su jornada.
  marcas: { colaboradorId: string; fecha: Date; entrada: Date | null }[];
  // Las novedades APROBADAS que tocan la ventana, como en el reporte.
  novedades: (NovedadParaDia & { colaboradorId: string; tipo: string })[];
  festivos: { fecha: Date }[];
}) {
  const v = ventanaDelInicio(e.ahora);
  const hoy = claveDiaBogota(e.ahora);
  const festivos = new Set(e.festivos.map(f => claveDiaBogota(f.fecha)));
  const de = <T extends { colaboradorId: string }>(filas: T[]) => {
    const m = new Map<string, T[]>();
    for (const f of filas) m.set(f.colaboradorId, [...(m.get(f.colaboradorId) ?? []), f]);
    return (id: string) => m.get(id) ?? [];
  };
  const materializadosDe = de(e.materializados);
  const marcasDe = de(e.marcas.filter(m => m.entrada));
  const novedadesDe = de(e.novedades);
  const en7 = new Set(v.claves7);

  const personas: PersonaParaAsistencia[] = [];
  const tardanzas: { colaboradorId: string; detalle: ReturnType<typeof calcularTardanzas>['detalle'] }[] = [];
  const sinMarcarHoy: FilaSinMarcar[] = [];

  for (const c of e.colaboradores) {
    const dias = diasParaMedir(v.inicio, v.fin, materializadosDe(c.id), c.horario);
    const porClave = new Map<string, DiaDeAsistencia>((dias ?? []).map(d => [claveDiaBogota(d.fecha), d]));
    const marcas = marcasDe(c.id);
    const novedades = novedadesDe(c.id);
    const llegoEn = new Set(marcas.map(m => claveDiaBogota(m.fecha)));
    personas.push({ id: c.id, creadoEn: c.creadoEn, dias: porClave, llegoEn, novedades });

    if (dias) {
      const delDia = (fecha: Date) => en7.has(claveDiaBogota(fecha));
      tardanzas.push({ colaboradorId: c.id, detalle: calcularTardanzas(marcas.filter(m => delDia(m.fecha)), dias.filter(d => delDia(d.fecha)), e.festivos, novedades).detalle });
    }

    const diaHoy = porClave.get(hoy) ?? null;
    const estado = estadoDeAsistencia({
      dia: diaHoy, inicioDia: v.inicioDia, llego: llegoEn.has(hoy), creadoEn: c.creadoEn, festivo: festivos.has(hoy), novedades, ahora: e.ahora,
    });
    if ((estado === 'FALTA' || estado === 'NOVEDAD') && diaHoy?.horaEntrada) {
      const horaEntrada = diaHoy.horaEntrada;
      sinMarcarHoy.push({
        id: c.id, nombre: `${c.nombre} ${c.apellido}`, cargo: c.cargo,
        horario: c.horario?.activo ? c.horario.nombre : 'Turno programado',
        horaEntrada,
        novedad: estado === 'NOVEDAD' ? (novedades.find(n => excusaLaTardanza(n, v.inicioDia, horaEntrada))?.tipo ?? null) : null,
      });
    }
  }

  const asistencia7 = asistenciaPorDia(v.claves7, e.ahora, personas, festivos);
  const llegadas = llegadasTardePorDia(v.claves7, tardanzas).map((d, i): LlegadasDelDia & { fecha: Date; esHoy: boolean; festivo: boolean; debian: number } => ({
    ...d, fecha: asistencia7[i].fecha, esHoy: asistencia7[i].esHoy, festivo: asistencia7[i].festivo, debian: asistencia7[i].debian,
  }));
  const nombreDe = new Map(e.colaboradores.map(c => [c.id, `${c.nombre} ${c.apellido}`]));
  const deHoy = llegadas.find(d => d.clave === hoy);

  return {
    asistenciaSemana: { dias: asistenciaPorDia(v.clavesSemana, e.ahora, personas, festivos) },
    llegadasTarde7d: { dias: llegadas },
    sinMarcarHoy,
    // El Inicio anterior lee este campo (y prisma/verificar-novedad-parcial.ts): se sigue mandando,
    // derivado del mismo cálculo, mientras dure la ventana de despliegue.
    llegadasTardeHoy: (deHoy?.personas ?? []).map(p => ({ id: p.id, nombre: nombreDe.get(p.id) ?? '', horaLlegada: p.horaLlegada, minutosTarde: p.minutosTarde })),
  };
}
