import { describe, it, expect } from 'vitest';
import { cuerpoDelHorario, type FormularioDeHorario } from './cuerpoDelHorario';

// El cuerpo que manda la pantalla de horarios al guardar (12 de septiembre de 2026).
//
// El servidor reemplaza las franjas enteras. Si ninguna franja trae la clave
// `descansos` y lo guardado tiene descansos, cree que es la pantalla de ANTES y responde
// «recarga» (FORMATO_VIEJO), para que una pestaña vieja no borre los descansos que otro
// configuró. Por eso la pantalla nueva manda la clave en cada franja, también vacía: sin
// ella, la pantalla nueva quedaría bloqueada por su propia guarda.
const OFICINA: FormularioDeHorario = {
  nombre: 'Oficina', toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 0, ajustaEntrada: false, fotoEnDescanso: true,
  franjas: [
    {
      dias: ['LUNES'], horaEntrada: '07:00', horaSalida: '16:00', tieneAlmuerzo: true, almuerzoInicio: '12:00', almuerzoFin: '13:00',
      descansos: [{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }],
    },
    { dias: ['SABADO'], horaEntrada: '08:00', horaSalida: '12:00', tieneAlmuerzo: false },
  ],
};

describe('cuerpoDelHorario', () => {
  it('cada franja lleva descansos, también vacía', () => {
    const cuerpo = cuerpoDelHorario(OFICINA);
    expect(cuerpo.franjas[0].descansos).toEqual([{ inicio: '09:00', fin: '09:15' }, { inicio: '15:00', fin: '15:10' }]);
    expect(cuerpo.franjas[1]).toHaveProperty('descansos', []);
    const sinNinguno = cuerpoDelHorario({ ...OFICINA, franjas: [{ ...OFICINA.franjas[0], descansos: [] }] });
    expect(sinNinguno.franjas[0]).toHaveProperty('descansos', []);
  });

  it('las filas sin horas viajan tal cual: el servidor las ignora y numera sus avisos por la fila que ve el administrador', () => {
    const cuerpo = cuerpoDelHorario({
      ...OFICINA, franjas: [{ ...OFICINA.franjas[0], descansos: [{ inicio: '', fin: '' }, { inicio: '15:00', fin: '' }] }],
    });
    expect(cuerpo.franjas[0].descansos).toEqual([{ inicio: '', fin: '' }, { inicio: '15:00', fin: '' }]);
  });

  it('manda los datos del horario y de cada franja, y nunca las claves de un solo descanso', () => {
    const cuerpo = cuerpoDelHorario(OFICINA);
    expect(cuerpo).toMatchObject({
      nombre: 'Oficina', toleranciaMin: 10, almuerzoMin: 60, toleranciaSalidaMin: 0, ajustaEntrada: false, fotoEnDescanso: true,
    });
    expect(Object.keys(cuerpo.franjas[0]).sort()).toEqual(
      ['almuerzoFin', 'almuerzoInicio', 'descansos', 'dias', 'horaEntrada', 'horaSalida', 'tieneAlmuerzo'],
    );
  });
});
