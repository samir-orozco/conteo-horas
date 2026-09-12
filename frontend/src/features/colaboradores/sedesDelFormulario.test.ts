import { describe, it, expect } from 'vitest';
import { sedeImplicita } from './sedesDelFormulario';

// Un trabajador PRESENCIAL siempre tiene sede. Si nadie le elige una, se le cuenta
// en la Sede principal al leer, sin asignársela (decisión del dueño del 12 de
// septiembre de 2026). El formulario lo MUESTRA sin meterlo en lo que se guarda. La
// primera versión la preseleccionaba, y quien cambiaba a remoto antes de guardar le
// dejaba la principal a alguien que ya no veía el selector (revisión del 11 de
// septiembre de 2026).

const SEDES = [
  { id: 'norte', nombre: 'Norte' },
  { id: 'principal', nombre: 'Sede principal', principal: true },
];

const SIN_PRINCIPAL = [{ id: 'norte', nombre: 'Norte' }];

describe('la sede en la que cuenta un presencial al que nadie le eligió', () => {
  it('un presencial sin sedes elegidas cuenta en la principal', () => {
    expect(sedeImplicita('PRESENCIAL', [], SEDES)).toBe('principal');
  });

  it('un presencial con sedes elegidas no recibe ninguna más', () => {
    expect(sedeImplicita('PRESENCIAL', ['norte'], SEDES)).toBeNull();
  });

  it('un híbrido o un remoto sin sedes no reciben ninguna', () => {
    expect(sedeImplicita('HIBRIDO', [], SEDES)).toBeNull();
    expect(sedeImplicita('REMOTO', [], SEDES)).toBeNull();
  });

  it('si todavía no cargaron las sedes, o ninguna es la principal, no inventa', () => {
    expect(sedeImplicita('PRESENCIAL', [], [])).toBeNull();
    expect(sedeImplicita('PRESENCIAL', [], SIN_PRINCIPAL)).toBeNull();
  });
});
