import { describe, it, expect } from 'vitest';
import { armarAgenda, DIAS_DE_LA_AGENDA, DIAS_DEL_AVISO_COMERCIAL } from './agendaDelInicio';

// «PRÓXIMOS DÍAS» EN EL INICIO (15 de octubre de 2026). Reemplaza a las tarjetas de festivos y cumpleaños:
// una sola lista, por fecha, de lo que viene en los próximos 30 días. Decisiones del dueño: festivos,
// cumpleaños, contratos y el pago; el pago solo en su última semana, solo para el administrador y sin
// montos.
//
// Las pruebas corren en Los Ángeles (vitest.config.ts): las fechas se dan en UTC explícito (§8.1).

// Un instante en hora de Bogotá (UTC-5 todo el año).
const bog = (a: number, mes: number, d: number, h = 0, min = 0) => new Date(Date.UTC(a, mes - 1, d, h + 5, min));
// Jueves 15 de octubre de 2026, 10:00 en Bogotá.
const AHORA = bog(2026, 10, 15, 10);

const base = {
  ahora: AHORA, festivos: [], personas: [], contratos: [],
  esAdministrador: true, suscripcion: null, exentaPago: false, pruebaDelClima: null,
};
const claves = (a: ReturnType<typeof armarAgenda>) => a.map(e => `${e.tipo} ${e.dia.toISOString().slice(0, 10)} ${e.enDias}`);

describe('armarAgenda: la ventana', () => {
  it('son 30 días contando hoy, y lo comercial avisa con 7', () => {
    expect(DIAS_DE_LA_AGENDA).toBe(30);
    expect(DIAS_DEL_AVISO_COMERCIAL).toBe(7);
  });

  // Un festivo propio con el mismo nombre y día que uno nacional (la base no lo impide: el nacional no tiene
  // empresa) salía dos veces (revisión adversarial).
  it('un festivo repetido sale una sola vez, como de la empresa si alguno lo es', () => {
    const a = armarAgenda({ ...base, festivos: [
      { nombre: 'Aniversario', fecha: bog(2026, 10, 20), empresaId: null },
      { nombre: 'Aniversario', fecha: bog(2026, 10, 20), empresaId: 'e1' },
    ] });
    expect(a).toEqual([{ tipo: 'FESTIVO', dia: bog(2026, 10, 20), enDias: 5, nombre: 'Aniversario', propio: true }]);
    // En el otro orden, igual: no gana el último.
    const alReves = armarAgenda({ ...base, festivos: [
      { nombre: 'Aniversario', fecha: bog(2026, 10, 20), empresaId: 'e1' },
      { nombre: 'Aniversario', fecha: bog(2026, 10, 20), empresaId: null },
    ] });
    expect(alReves).toEqual(a);
  });

  it('dos festivos distintos el mismo día salen los dos', () => {
    const a = armarAgenda({ ...base, festivos: [
      { nombre: 'Uno', fecha: bog(2026, 10, 20), empresaId: null },
      { nombre: 'Otro', fecha: bog(2026, 10, 20), empresaId: 'e1' },
    ] });
    expect(a.map(e => 'nombre' in e && e.nombre).sort()).toEqual(['Otro', 'Uno']);
  });

  it('los festivos de hoy al día 29, con su nombre y si son de la empresa; ni ayer ni el día 30', () => {
    const a = armarAgenda({ ...base, festivos: [
      { nombre: 'Ayer', fecha: bog(2026, 10, 14), empresaId: null },
      { nombre: 'Hoy', fecha: bog(2026, 10, 15), empresaId: null },
      { nombre: 'Aniversario', fecha: bog(2026, 11, 13), empresaId: 'e1' },
      { nombre: 'Fuera', fecha: bog(2026, 11, 14), empresaId: null },
    ] });
    expect(a).toEqual([
      { tipo: 'FESTIVO', dia: bog(2026, 10, 15), enDias: 0, nombre: 'Hoy', propio: false },
      { tipo: 'FESTIVO', dia: bog(2026, 11, 13), enDias: 29, nombre: 'Aniversario', propio: true },
    ]);
  });
});

describe('armarAgenda: cumpleaños', () => {
  // La fecha de nacimiento se guarda como medianoche UTC del día: se lee por sus partes UTC, como la
  // tarjeta de cumpleaños de siempre.
  const nacio = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));

  it('el próximo cumpleaños de cada persona que caiga en la ventana, con su nombre', () => {
    const a = armarAgenda({ ...base, personas: [
      { id: 'c1', nombre: 'Ana Ruiz', fechaNacimiento: nacio(1990, 10, 20) },
      { id: 'c2', nombre: 'Luis Mora', fechaNacimiento: nacio(1985, 10, 15) },
      { id: 'c3', nombre: 'Caro Díaz', fechaNacimiento: nacio(1992, 10, 14) }, // fue ayer: el próximo es en un año
      { id: 'c4', nombre: 'Sin fecha', fechaNacimiento: null },
    ] });
    expect(a).toEqual([
      { tipo: 'CUMPLEANOS', dia: bog(2026, 10, 15), enDias: 0, colaboradorId: 'c2', nombre: 'Luis Mora' },
      { tipo: 'CUMPLEANOS', dia: bog(2026, 10, 20), enDias: 5, colaboradorId: 'c1', nombre: 'Ana Ruiz' },
    ]);
  });

  it('cruzando el año: a mediados de diciembre, el cumpleaños del 3 de enero', () => {
    const a = armarAgenda({ ...base, ahora: bog(2026, 12, 20, 9), personas: [{ id: 'c1', nombre: 'Ana Ruiz', fechaNacimiento: nacio(1990, 1, 3) }] });
    expect(claves(a)).toEqual(['CUMPLEANOS 2027-01-03 14']);
  });

  it('quien nació un 29 de febrero lo celebra el 28 en un año que no es bisiesto', () => {
    const a = armarAgenda({ ...base, ahora: bog(2027, 2, 10, 9), personas: [{ id: 'c1', nombre: 'Ana Ruiz', fechaNacimiento: nacio(2000, 2, 29) }] });
    expect(claves(a)).toEqual(['CUMPLEANOS 2027-02-28 18']);
  });

  it('y el 29 en un año bisiesto', () => {
    const a = armarAgenda({ ...base, ahora: bog(2028, 2, 10, 9), personas: [{ id: 'c1', nombre: 'Ana Ruiz', fechaNacimiento: nacio(2000, 2, 29) }] });
    expect(claves(a)).toEqual(['CUMPLEANOS 2028-02-29 19']);
  });

  // A las 8 de la noche en Bogotá ya es el día siguiente en UTC: «hoy» es el de Bogotá.
  it('de noche, hoy sigue siendo el día de Bogotá', () => {
    const a = armarAgenda({ ...base, ahora: bog(2026, 10, 15, 21), personas: [{ id: 'c1', nombre: 'Ana Ruiz', fechaNacimiento: nacio(1990, 10, 15) }] });
    expect(claves(a)).toEqual(['CUMPLEANOS 2026-10-15 0']);
  });
});

describe('armarAgenda: contratos', () => {
  const contrato = (estado: 'POR_VENCER' | 'PREAVISO_VENCIDO' | 'VENCIDO', vence: Date, limitePreaviso: Date) =>
    ({ colaboradorId: 'c1', colaborador: 'Ana Ruiz', estado, vence, limitePreaviso });

  // El preaviso es de 30 días: un contrato por vencer vence 30 días después de su último día para avisar, o sea
  // siempre fuera de la ventana. Lo que se anuncia es ese último día (revisión adversarial: la prueba anterior usaba
  // un vencimiento a 21 días del aviso, que no puede ocurrir).
  it('por vencer: el último día para avisar', () => {
    const a = armarAgenda({ ...base, contratos: [contrato('POR_VENCER', bog(2026, 11, 19), bog(2026, 10, 20))] });
    expect(a).toEqual([{ tipo: 'CONTRATO_PREAVISO', dia: bog(2026, 10, 20), enDias: 5, colaboradorId: 'c1', nombre: 'Ana Ruiz' }]);
  });

  // Con el preaviso vencido, el contrato ya no se puede dejar vencer: se prorroga solo, como dicen los pendientes.
  it('con el preaviso vencido: el día en que se prorroga; vencido: nada, ya está en los pendientes', () => {
    const a = armarAgenda({ ...base, contratos: [
      contrato('PREAVISO_VENCIDO', bog(2026, 10, 30), bog(2026, 9, 30)),
      { ...contrato('VENCIDO', bog(2026, 10, 10), bog(2026, 9, 10)), colaboradorId: 'c2' },
    ] });
    expect(claves(a)).toEqual(['CONTRATO_SE_PRORROGA 2026-10-30 15']);
  });

  // El motor de contratos guarda algunas fechas al mediodía: el día es el de Bogotá, no la hora.
  it('una fecha a cualquier hora del día cuenta por su día de Bogotá', () => {
    const a = armarAgenda({ ...base, contratos: [contrato('PREAVISO_VENCIDO', bog(2026, 10, 30, 12), bog(2026, 9, 30, 12))] });
    expect(claves(a)).toEqual(['CONTRATO_SE_PRORROGA 2026-10-30 15']);
  });
});

describe('armarAgenda: la suscripción', () => {
  const sus = (finPrueba: Date, pagadoHasta: Date | null = null, estado = 'ACTIVA') => ({ estado, finPrueba, pagadoHasta });

  // Las fechas de la suscripción son el FIN exclusivo: lo pagado hasta el 1 de noviembre a medianoche cubre
  // el 31 de octubre entero. La agenda pone el último día cubierto.
  it('el último día del mes pagado, en su última semana', () => {
    const a = armarAgenda({ ...base, suscripcion: sus(bog(2026, 9, 1), bog(2026, 10, 21)) });
    expect(a).toEqual([{ tipo: 'SUSCRIPCION_VENCE', dia: bog(2026, 10, 20), enDias: 5, eraPrueba: false }]);
  });

  it('el último día de la prueba gratis', () => {
    expect(armarAgenda({ ...base, suscripcion: sus(bog(2026, 10, 18), null, 'PRUEBA') }))
      .toEqual([{ tipo: 'SUSCRIPCION_VENCE', dia: bog(2026, 10, 17), enDias: 2, eraPrueba: true }]);
  });

  // La última semana son siete días: hoy y los seis siguientes (revisión adversarial: eran ocho).
  it('a más de una semana no se anuncia todavía', () => {
    expect(armarAgenda({ ...base, suscripcion: sus(bog(2026, 9, 1), bog(2026, 10, 22, 0, 1)) })).toEqual([]);
    expect(claves(armarAgenda({ ...base, suscripcion: sus(bog(2026, 9, 1), bog(2026, 10, 21, 10)) }))).toEqual(['SUSCRIPCION_VENCE 2026-10-21 6']);
  });

  it('ya vencida no se anuncia: en mora el panel muestra su propio aviso', () => {
    expect(armarAgenda({ ...base, suscripcion: sus(bog(2026, 9, 1), bog(2026, 10, 15, 9)) })).toEqual([]);
  });

  it('ni al supervisor, ni a una empresa exenta de pago, ni a una cancelada, ni sin suscripción', () => {
    const s = sus(bog(2026, 9, 1), bog(2026, 10, 21));
    expect(armarAgenda({ ...base, suscripcion: s, esAdministrador: false })).toEqual([]);
    expect(armarAgenda({ ...base, suscripcion: s, exentaPago: true })).toEqual([]);
    expect(armarAgenda({ ...base, suscripcion: { ...s, estado: 'CANCELADA' } })).toEqual([]);
    expect(armarAgenda({ ...base, suscripcion: null })).toEqual([]);
  });

  // La última semana son hoy y seis días más, también para la prueba del clima (verificación adversarial: el cambio
  // de ocho a siete días no tenía prueba que lo protegiera).
  it('la prueba del clima: su último día a seis días sale; a siete, todavía no', () => {
    expect(claves(armarAgenda({ ...base, pruebaDelClima: { hasta: bog(2026, 10, 22) } }))).toEqual(['PRUEBA_CLIMA_TERMINA 2026-10-21 6']);
    expect(armarAgenda({ ...base, pruebaDelClima: { hasta: bog(2026, 10, 23) } })).toEqual([]);
  });

  it('el último día de la prueba gratis del clima, también en su última semana y solo al administrador', () => {
    expect(armarAgenda({ ...base, pruebaDelClima: { hasta: bog(2026, 10, 20) } }))
      .toEqual([{ tipo: 'PRUEBA_CLIMA_TERMINA', dia: bog(2026, 10, 19), enDias: 4 }]);
    expect(armarAgenda({ ...base, pruebaDelClima: { hasta: bog(2026, 11, 1) } })).toEqual([]);
    expect(armarAgenda({ ...base, pruebaDelClima: { hasta: bog(2026, 10, 20) }, esAdministrador: false })).toEqual([]);
  });
});

describe('armarAgenda: el orden', () => {
  it('por día; el mismo día, lo que pide hacer algo antes que lo que se celebra, y luego por nombre', () => {
    const a = armarAgenda({
      ...base,
      festivos: [{ nombre: 'Festivo', fecha: bog(2026, 10, 20), empresaId: null }],
      personas: [
        { id: 'c2', nombre: 'Zoe', fechaNacimiento: new Date(Date.UTC(1990, 9, 20)) },
        { id: 'c1', nombre: 'Ana', fechaNacimiento: new Date(Date.UTC(1990, 9, 20)) },
        { id: 'c3', nombre: 'Beto', fechaNacimiento: new Date(Date.UTC(1990, 9, 16)) },
      ],
      contratos: [{ colaboradorId: 'c9', colaborador: 'Rosa', estado: 'POR_VENCER', vence: bog(2026, 11, 30), limitePreaviso: bog(2026, 10, 20) }],
      suscripcion: { estado: 'ACTIVA', finPrueba: bog(2026, 9, 1), pagadoHasta: bog(2026, 10, 21) },
    });
    expect(a.map(e => `${e.dia.toISOString().slice(5, 10)} ${e.tipo}${'nombre' in e ? ` ${e.nombre}` : ''}`)).toEqual([
      '10-16 CUMPLEANOS Beto',
      '10-20 SUSCRIPCION_VENCE',
      '10-20 CONTRATO_PREAVISO Rosa',
      '10-20 FESTIVO Festivo',
      '10-20 CUMPLEANOS Ana',
      '10-20 CUMPLEANOS Zoe',
    ]);
  });
});
