import { describe, it, expect } from 'vitest';
import { armarSemanaDelInicio, ventanaDelInicio, type ColaboradorDelInicio } from './semanaDelInicio';
import { calcularTardanzas, type HorarioConFranjas } from './tardanzas';
import { diasParaMedir } from './diasEsperados';

// LA SEMANA DEL INICIO (15 de octubre de 2026): la asistencia de lunes a domingo, las llegadas tarde
// de los últimos 7 días y «Aún no han marcado entrada», armadas con UNA regla (utils/asistencia.ts y
// `calcularTardanzas`, la del reporte). Esta función no consulta nada: recibe lo que la ruta leyó.
//
// Jueves 15 de octubre de 2026 a las 10 a. m. en Bogotá (UTC-5 todo el año, §8.1).

const bog = (d: number, h = 0, min = 0) => new Date(Date.UTC(2026, 9, d, h + 5, min, 0));
const AHORA = bog(15, 10);

// Lunes a viernes de 08:00 a 17:00, con 5 minutos de tolerancia.
const HORARIO = {
  id: 'h1', nombre: 'Oficina', activo: true, toleranciaMin: 5, almuerzoMin: 60,
  franjas: [{ dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true }],
} as unknown as HorarioConFranjas;

const persona = (id: string, horario: HorarioConFranjas | null = HORARIO): ColaboradorDelInicio =>
  ({ id, nombre: id, apellido: 'Prueba', cargo: null, creadoEn: bog(1), horario });
const marca = (colaboradorId: string, d: number, h: number, min = 0) => ({ colaboradorId, fecha: bog(d), entrada: bog(d, h, min) });

// Ana: llegó tarde el martes (08:20) y hoy no ha marcado. Luis: sin horario, el planificador le pintó
// el jueves a las 09:00 y llegó a las 09:30. Sofía: de vacaciones aprobadas toda la semana.
const luisJueves = { ...diasParaMedir(bog(15), bog(16), [], HORARIO)![0], horaEntrada: '09:00', colaboradorId: 'luis' };
const ENTRADA = {
  ahora: AHORA,
  colaboradores: [persona('ana'), persona('luis', null), persona('sofia')],
  materializados: [luisJueves],
  marcas: [marca('ana', 12, 8), marca('ana', 13, 8, 20), marca('ana', 14, 7, 55), marca('luis', 15, 9, 30)],
  novedades: [{ colaboradorId: 'sofia', tipo: 'VACACIONES', fechaInicio: bog(12), fechaFin: bog(16), horaInicio: null, horaFin: null }],
  festivos: [],
};

describe('ventanaDelInicio', () => {
  it('cubre de lo más viejo que piden las dos tarjetas (hoy − 6) al domingo de esta semana', () => {
    const v = ventanaDelInicio(AHORA);
    expect(v.claves7).toEqual(['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']);
    expect(v.clavesSemana).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(v.inicio).toEqual(bog(9));
    expect(v.fin).toEqual(bog(19));
  });

  it('un lunes, empieza seis días antes: el martes pasado', () => {
    const v = ventanaDelInicio(bog(12, 9));
    expect(v.inicio).toEqual(bog(6));
  });
});

describe('armarSemanaDelInicio', () => {
  const s = armarSemanaDelInicio(ENTRADA);

  it('«Aún no han marcado»: Ana en rojo; Sofía en ámbar con su novedad; Luis no, porque llegó', () => {
    expect(s.sinMarcarHoy.map(p => [p.id, p.novedad, p.horaEntrada, p.horario])).toEqual([
      ['ana', null, '08:00', 'Oficina'],
      ['sofia', 'VACACIONES', '08:00', 'Oficina'],
    ]);
  });

  it('a quien no tiene horario pero sí turno pintado lo mide, y su etiqueta lo dice', () => {
    const sinLuis = armarSemanaDelInicio({ ...ENTRADA, marcas: ENTRADA.marcas.filter(m => m.colaboradorId !== 'luis'), ahora: bog(15, 10) });
    expect(sinLuis.sinMarcarHoy.find(p => p.id === 'luis')).toMatchObject({ horario: 'Turno programado', horaEntrada: '09:00', novedad: null });
  });

  it('la barra de hoy cuadra con las filas rojas: debían menos llegaron = los que faltan', () => {
    const hoy = s.asistenciaSemana.dias.find(d => d.esHoy)!;
    expect(hoy).toMatchObject({ debian: 2, llegaron: 1, conNovedad: 1 });
    expect(hoy.debian - hoy.llegaron).toBe(s.sinMarcarHoy.filter(p => !p.novedad).length);
  });

  it('las llegadas tarde de los 7 días suman lo mismo que la regla del reporte para cada persona', () => {
    const v = ventanaDelInicio(AHORA);
    const delReporte = ['ana', 'luis'].reduce((total, id) => {
      const c = ENTRADA.colaboradores.find(x => x.id === id)!;
      const dias = diasParaMedir(v.inicio, v.fin, ENTRADA.materializados.filter(m => m.colaboradorId === id), c.horario)!
        .filter(d => v.claves7.includes(d.fecha.toISOString().slice(0, 10)));
      return total + calcularTardanzas(ENTRADA.marcas.filter(m => m.colaboradorId === id), dias, [], []).totalMinutos;
    }, 0);
    const enLaTarjeta = s.llegadasTarde7d.dias.reduce((t, d) => t + d.totalMinutos, 0);
    expect(enLaTarjeta).toBe(delReporte);
    expect(enLaTarjeta).toBe(15 + 25);
  });

  it('cada día de las llegadas tarde dice cuántos debían venir, para distinguir «sin turnos» de «todos a tiempo»', () => {
    const [vie, sab, dom, lun] = s.llegadasTarde7d.dias;
    // El viernes Ana y Sofía tenían turno y no marcaron: debían 2, y nadie llegó tarde porque nadie llegó.
    expect(vie).toMatchObject({ clave: '2026-10-09', debian: 2, totalMinutos: 0 });
    expect(sab.debian + dom.debian).toBe(0);
    expect(lun).toMatchObject({ debian: 1, totalMinutos: 0 });
  });

  it('las llegadas tarde de hoy siguen viajando para el Inicio anterior, derivadas del mismo cálculo', () => {
    expect(s.llegadasTardeHoy).toEqual([{ id: 'luis', nombre: 'luis Prueba', horaLlegada: '09:30', minutosTarde: 25 }]);
  });

  it('una llegada tarde en un festivo no cuenta, igual que en el reporte', () => {
    // El martes 13 Ana llegó 15 min tarde; si ese día es festivo, no hay tardanza que contar.
    const conFestivo = armarSemanaDelInicio({ ...ENTRADA, festivos: [{ fecha: bog(13) }] });
    expect(conFestivo.llegadasTarde7d.dias.reduce((t, d) => t + d.totalMinutos, 0)).toBe(25);
    expect(conFestivo.llegadasTarde7d.dias.find(d => d.clave === '2026-10-13')).toMatchObject({ festivo: true, totalMinutos: 0 });
  });

  it('en un festivo no se pide a nadie, ni en la barra ni en «Aún no han marcado»', () => {
    const festivo = armarSemanaDelInicio({ ...ENTRADA, festivos: [{ fecha: bog(15) }] });
    expect(festivo.sinMarcarHoy).toEqual([]);
    expect(festivo.asistenciaSemana.dias.find(d => d.esHoy)).toMatchObject({ festivo: true, debian: 0 });
  });
});
