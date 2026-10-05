import { describe, it, expect } from 'vitest';
import { PLANES_COMERCIALES, type PlanComercial } from './planesComerciales';
// La fuente de verdad de los planes: lo que de verdad prende y apaga cada función. No importa nada,
// así que traerlo desde aquí no arrastra el backend.
import { PLANES, FEATURES, type FeatureKey } from '../../../backend/src/utils/planes';

// LO QUE SE VENDE CONTRA LO QUE SE ENTREGA (4 de octubre de 2026).
//
// La landing y Suscripción prometían cada una su lista, escritas a mano, y ninguna se comparaba con
// `planes.ts`: Suscripción nunca dijo que el Empresarial trae Turnos ni Clima laboral, y la landing nunca
// dijo que el Profesional exporta los reportes. Esta prueba ata la lista a las casillas de verdad.

// Cómo se reconoce cada función con candado en las frases de venta. ES OBLIGATORIO QUE ESTÉN TODAS: si
// alguien agrega una función a `planes.ts` y no la pone aquí, la primera prueba se pone roja, y con eso
// alguien tiene que decidir cómo se anuncia.
const MENCION: Record<FeatureKey, RegExp> = {
  gps: /GPS|geocerca/i,
  telegram: /Telegram/i,
  evidencia: /Evidencia/i,
  // La casilla `exportar` solo gobierna el Excel del reporte diario (Reportes.tsx). La nómina del
  // período se baja en Excel con cualquier plan, por decisión del dueño (4 de octubre de 2026).
  exportar: /reporte diario/i,
  // En plural: el Esencial dice «1 dispositivo», que no es lo mismo que traer varios.
  multiDispositivo: /dispositivos/i,
  multiHorario: /Varios horarios/i,
  multiSede: /Varias sedes/i,
  turnos: /Turnos/i,
  clima: /Clima laboral/i,
  // La casilla `siigo` es la conexión directa, que todavía no existe. El Excel en el formato de Siigo
  // va en todos los planes, así que «Siigo» a secas no sirve para reconocerla.
  siigo: /Conexión directa con Siigo/i,
};

// Lo que dice un plan, con lo que hereda por «Todo lo de …».
function loQueDice(plan: PlanComercial): string[] {
  const propias = plan.incluye.filter(f => !/^Todo lo de /.test(f));
  const hereda = plan.incluye.map(f => /^Todo lo de (.+)$/.exec(f)?.[1]).find(Boolean);
  if (!hereda) return propias;
  const padre = PLANES_COMERCIALES.find(p => p.nombre === hereda);
  if (!padre) throw new Error(`«Todo lo de ${hereda}» no es ningún plan`);
  return [...loQueDice(padre), ...propias];
}

describe('lo que se promete de cada plan', () => {
  it('sabe reconocer cada función con candado de planes.ts', () => {
    expect(Object.keys(MENCION).sort()).toEqual(FEATURES.map(f => f.key).sort());
  });

  it('son los mismos tres planes, con su límite y sus precios de respaldo', () => {
    expect(PLANES_COMERCIALES.map(p => p.id)).toEqual(['ESENCIAL', 'PROFESIONAL', 'EMPRESARIAL']);
    for (const p of PLANES_COMERCIALES) {
      const real = PLANES[p.id];
      expect({ nombre: p.nombre, limite: p.limite, mensual: p.mensual, anual: p.anual }).toEqual({
        nombre: real.nombre, limite: real.limite, mensual: real.precioMensual, anual: real.precioAnual,
      });
      expect(p.incluye).toContain(`Hasta ${real.limite} colaboradores`);
    }
  });

  // Lo que NO tiene casilla y va en todos los planes también se dice, empezando por el de abajo: el
  // dueño decidió dejar la nómina en Excel y para Siigo en todos (4 de octubre de 2026), y una lista
  // que solo la nombrara arriba la vendería como si fuera de un plan mayor.
  it('el Esencial dice que baja la nómina en Excel, también para Siigo', () => {
    const esencial = PLANES_COMERCIALES.find(p => p.id === 'ESENCIAL')!;
    expect(esencial.incluye).toContain('Nómina del período en Excel, también para Siigo');
  });

  // Una por función y por plan, para que el rojo diga cuál y dónde.
  for (const p of PLANES_COMERCIALES) {
    for (const { key } of FEATURES) {
      const loTrae = PLANES[p.id].features[key];
      it(`${p.nombre}: ${loTrae ? 'anuncia' : 'NO anuncia'} «${key}»`, () => {
        const menciones = loQueDice(p).filter(f => MENCION[key].test(f));
        if (loTrae) expect(menciones, `el plan ${p.nombre} trae «${key}» y no lo dice`).not.toEqual([]);
        else expect(menciones, `el plan ${p.nombre} NO trae «${key}» y lo promete`).toEqual([]);
      });
    }
  }
});
