import { prisma } from '../prisma';
import { rangoDiaBogota } from './fechas';
// LO QUE ESTE MÓDULO NECESITA, y no el tipo del modal (`RespuestaDeDescanso`), que es más estrecho:
// aquel solo admite FIJO y ROTATIVO, porque rechaza PRESUMIDO a propósito. Este también escribe la
// vuelta al domingo por ley, que el formulario del horario sí puede pedir.
//
// `acuerdo` es opcional porque el modal no lo manda: allí toda respuesta declara un acuerdo, así que
// su ausencia vale como `true`. En `false` BORRA la fecha del acuerdo.
type LoQueSeEscribe = {
  horarioId: string;
  tipo: 'PRESUMIDO' | 'FIJO' | 'ROTATIVO';
  dia: string | null;
  acuerdo?: boolean;
};

// ESCRIBIR LA DECLARACIÓN DEL DÍA DE DESCANSO, HORARIO POR HORARIO (extraído el 29 de septiembre de
// 2026).
//
// Estaba dentro de `POST /descanso-revisado`, que es el modal que se pregunta una sola vez. Al
// llevarlo también al formulario del horario —«el descanso se define por el horario, no por el
// trabajador», corrección del dueño— hacían falta los dos caminos, y copiar cincuenta líneas que
// CONGELAN EL PASADO y mueven un recargo es exactamente lo que el §9.3 dice que se separa a la
// primera. Se extrae entero y los dos lo llaman.
//
// LO QUE NO ENTRA AQUÍ, a propósito: marcar la empresa como revisada. Eso es del modal y solo del
// modal. Declarando desde el formulario UN horario, cerrar la revisión saltaría los otros tres que
// siguen sin respuesta.

export type LoQueSeDeclaro = { horarios: number; personas: number };

export async function declararDescansoDeHorarios(
  // Por horario, la gente activa a la que se le escribe. Quien llama resuelve el ALCANCE: de eso
  // depende que nadie declare el descanso de otra empresa, y no puede decidirlo el cuerpo de la
  // petición.
  porHorario: ReadonlyMap<string, readonly string[]>,
  respuestas: readonly LoQueSeEscribe[],
  ahora: Date = new Date(),
): Promise<LoQueSeDeclaro> {
  // Medianoche de Bogotá de HOY: la frontera entre lo que se congela y lo que sigue a la
  // declaración nueva. El día de hoy cuenta como futuro, igual que en `materializarDias`.
  const { inicioDia } = rangoDiaBogota(ahora);
  let horarios = 0;
  let personas = 0;

  await prisma.$transaction(async (tx) => {
    for (const respuesta of respuestas) {
      const ids = porHorario.get(respuesta.horarioId) ?? [];
      if (ids.length === 0) continue;
      const marcas = ids.map(() => '?').join(',');

      // 1. CONGELAR EL PASADO, ANTES de declarar nada.
      //
      // Las filas de `DiaEsperado` anteriores a la columna tienen `esDescanso` en NULL, que
      // significa «esta fila nunca lo calculó». El motor las resuelve cayendo al respaldo, que es
      // la declaración de HOY. Sin este paso, declarar «descansan el miércoles» reescribiría
      // todos sus domingos pasados como días ordinarios y les quitaría el recargo de forma
      // retroactiva y silenciosa.
      //
      // Se congela lo que la regla decía ANTES, que para todo el mundo era la presunción legal:
      // el domingo. `DAYOFWEEK(fecha) = 1` es domingo, y NO se da por supuesto: se comprobó
      // contra las filas reales el 21 de septiembre de 2026 cotejándolo con `getUTCDay()`.
      //
      // El plan de esta consulta se midió a volumen de producción, no sobre la base local: con
      // 1.048.576 filas usa `Index range scan` sobre (colaboradorId, fecha), coste 99. En la
      // tabla local de 1.969 filas el optimizador elige `Table scan`, que es lo que §8.4 avisa
      // que pasa al medir en pequeño.
      await tx.$executeRawUnsafe(
        `UPDATE dias_esperados SET esDescanso = (DAYOFWEEK(fecha) = 1)
         WHERE colaboradorId IN (${marcas}) AND esDescanso IS NULL AND fecha < ?`,
        ...ids, inicioDia,
      );

      // 2. Ahora sí, la declaración. Solo a los ACTIVOS: cambiarle la declaración a alguien
      // retirado movería la lectura de su historial, y su liquidación ya está entregada.
      // `descansoAcuerdoEn` EN NULL AL VOLVER AL DOMINGO POR LEY, y no es lo mismo que dejarla: esa
      // columna es la afirmación de que existe un acuerdo escrito, no una marca de cuándo se tocó
      // esto. Dejándola puesta quedaría un papel afirmado sobre una declaración que ya no lo
      // necesita, y el día que alguien vuelva a poner «miércoles» la guarda legal lo daría por
      // firmado sin que nadie firmara.
      await tx.colaborador.updateMany({
        where: { id: { in: [...ids] } },
        data: {
          descansoTipo: respuesta.tipo, descansoDia: respuesta.dia,
          descansoAcuerdoEn: respuesta.acuerdo === false ? null : ahora,
        },
      });
      horarios++;
      personas += ids.length;
    }
  }, {
    // Por encima de los 5 segundos por defecto: una empresa grande son decenas de miles de filas
    // que congelar, y que la transacción se corte a la mitad dejaría a unos horarios declarados y
    // a otros no.
    timeout: 30_000,
  });

  return { horarios, personas };
}
