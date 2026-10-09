import { describe, it, expect } from 'vitest';
import { motivoParaNoCorrer } from './seed-resenas-prueba';

// La guarda del seed y de la limpieza de las reseñas de prueba. Una puerta no vale hasta que se la
// ve saltar (CLAUDE.md §12.10): aquí se le pasan las direcciones que TIENEN que hacerla abortar.
//
// La que importa es la de producción: en el servidor DATABASE_URL también apunta a localhost
// (DESPLIEGUE.md, variables del backend), y backend-build lleva estos guiones. Mirar solo el host
// dejaba pasar la base real.
describe('motivoParaNoCorrer', () => {
  it('la base local de desarrollo pasa', () => {
    expect(motivoParaNoCorrer('mysql://usuario:clave@localhost:3306/conteo_horas')).toBeNull();
    expect(motivoParaNoCorrer('mysql://usuario:clave@127.0.0.1:3306/conteo_horas?connection_limit=5')).toBeNull();
  });

  it('la base de producción NO pasa, aunque esté en localhost', () => {
    expect(motivoParaNoCorrer('mysql://usuario:clave@localhost:3306/ewyfwxbg_horapro?connection_limit=5&pool_timeout=10'))
      .toMatch(/ewyfwxbg_horapro/);
  });

  it('cualquier otra base local tampoco: se sabe cuál es la de desarrollo, no cuál es la peligrosa', () => {
    expect(motivoParaNoCorrer('mysql://usuario:clave@localhost:3310/otra_base')).toMatch(/otra_base/);
    expect(motivoParaNoCorrer('mysql://usuario:clave@localhost:3306/')).not.toBeNull();
  });

  it('un host que no es este equipo no pasa', () => {
    expect(motivoParaNoCorrer('mysql://usuario:clave@db.horapro.co:3306/conteo_horas')).toMatch(/db\.horapro\.co/);
  });

  it('sin dirección, o con una ilegible, no pasa', () => {
    expect(motivoParaNoCorrer(undefined)).not.toBeNull();
    expect(motivoParaNoCorrer('')).not.toBeNull();
    expect(motivoParaNoCorrer('no es una url')).not.toBeNull();
  });

  // El motivo se imprime en la terminal: nunca con la clave adentro.
  it('el motivo no lleva la clave', () => {
    const motivo = motivoParaNoCorrer('mysql://usuario:LaClaveDeVerdad@localhost:3306/ewyfwxbg_horapro') ?? '';
    expect(motivo).not.toContain('LaClaveDeVerdad');
  });
});
