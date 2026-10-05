import { describe, it, expect } from 'vitest';
import {
  MOTIVO_OTRO, NOMBRE_DE_CARITA, VENTANA_INICIAL, ventanaClima, muestraMotivos,
  calificacionAGuardar, observacionAEnviar,
} from './ventanaClima';

describe('la ventana de las caritas', () => {
  it('los nombres van de Muy mal a Muy bien', () => {
    expect([1, 2, 3, 4, 5].map(n => NOMBRE_DE_CARITA[n])).toEqual(['Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien']);
  });

  it('arranca sin carita, sin motivos y con la observación cerrada', () => {
    expect(VENTANA_INICIAL).toEqual({ carita: null, motivos: [], observacionAbierta: false, texto: '', confidencial: false });
  });

  it('los motivos salen con Muy mal, Mal y Normal, y no con Bien ni Muy bien', () => {
    expect([null, 1, 2, 3, 4, 5].map(muestraMotivos)).toEqual([false, true, true, true, false, false]);
  });

  it('tocar una carita la escoge, y tocar otra la cambia', () => {
    const e = ventanaClima(ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 2 }), { tipo: 'carita', valor: 3 });
    expect(e.carita).toBe(3);
  });

  it('se pueden marcar varios motivos, y tocar uno marcado lo desmarca', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 1 });
    e = ventanaClima(e, { tipo: 'motivo', valor: 'Compañeros' });
    e = ventanaClima(e, { tipo: 'motivo', valor: 'Mucho trabajo' });
    expect(e.motivos).toEqual(['Compañeros', 'Mucho trabajo']);
    e = ventanaClima(e, { tipo: 'motivo', valor: 'Compañeros' });
    expect(e.motivos).toEqual(['Mucho trabajo']);
  });

  it('pasar a una carita feliz borra los motivos que ya no se ven', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 1 });
    e = ventanaClima(e, { tipo: 'motivo', valor: 'Compañeros' });
    e = ventanaClima(e, { tipo: 'carita', valor: 4 });
    expect(e.motivos).toEqual([]);
  });

  it('pasar de una carita triste a otra triste conserva los motivos', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 1 });
    e = ventanaClima(e, { tipo: 'motivo', valor: 'Compañeros' });
    e = ventanaClima(e, { tipo: 'carita', valor: 2 });
    expect(e.motivos).toEqual(['Compañeros']);
  });

  it('sin carita no se puede marcar un motivo', () => {
    expect(ventanaClima(VENTANA_INICIAL, { tipo: 'motivo', valor: 'Compañeros' }).motivos).toEqual([]);
  });

  it('marcar «Otro» abre la observación sola', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 2 });
    e = ventanaClima(e, { tipo: 'motivo', valor: MOTIVO_OTRO });
    expect(e.observacionAbierta).toBe(true);
  });

  it('desmarcar «Otro» no cierra lo que ya se está escribiendo', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 2 });
    e = ventanaClima(e, { tipo: 'motivo', valor: MOTIVO_OTRO });
    e = ventanaClima(e, { tipo: 'texto', valor: 'Faltó gente' });
    e = ventanaClima(e, { tipo: 'motivo', valor: MOTIVO_OTRO });
    expect(e.observacionAbierta).toBe(true);
    expect(e.texto).toBe('Faltó gente');
  });

  it('«+ Agregar observación» la abre con cualquier carita', () => {
    const e = ventanaClima(ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 5 }), { tipo: 'abrirObservacion' });
    expect(e.observacionAbierta).toBe(true);
  });

  it('el interruptor de confidencial se prende y se apaga', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'confidencial' });
    expect(e.confidencial).toBe(true);
    e = ventanaClima(e, { tipo: 'confidencial' });
    expect(e.confidencial).toBe(false);
  });
});

describe('lo que se manda al servidor', () => {
  it('la calificación lleva la carita y los motivos', () => {
    let e = ventanaClima(VENTANA_INICIAL, { tipo: 'carita', valor: 2 });
    e = ventanaClima(e, { tipo: 'motivo', valor: 'Compañeros' });
    expect(calificacionAGuardar(e)).toEqual({ carita: 2, motivos: ['Compañeros'] });
  });

  it('sin carita no hay nada que guardar', () => {
    expect(calificacionAGuardar(VENTANA_INICIAL)).toBeNull();
  });

  it('una observación vacía o solo con espacios no se manda', () => {
    expect(observacionAEnviar({ ...VENTANA_INICIAL, observacionAbierta: true, texto: '   ' })).toBeNull();
  });

  it('la observación va recortada, y confidencial solo si el interruptor está prendido', () => {
    expect(observacionAEnviar({ ...VENTANA_INICIAL, observacionAbierta: true, texto: ' Hola ', confidencial: true }))
      .toEqual({ texto: 'Hola', confidencial: true });
    expect(observacionAEnviar({ ...VENTANA_INICIAL, observacionAbierta: true, texto: 'Hola' }))
      .toEqual({ texto: 'Hola', confidencial: false });
  });
});
