import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { rangoReporte, claveDiaBogota, medianocheBogota } from '../utils/fechas';
// La ESCRITURA no vive en esta ruta: `materializarDias` es el único módulo que escribe en
// `dias_esperados`, y abrir un segundo camino sobre la tabla que alimenta la liquidación
// duplicaría el riesgo sin ganar nada.
import {
  pintarDiaDeColaborador, despintarDiaDeColaborador, marcarDescansoDeColaborador,
} from '../utils/materializarDias';
import { combinarDiasEsperados } from '../utils/diasEsperados';
// Los descansos no remunerados se guardan como texto y viajan como `{ inicio, fin }[]`, igual que
// los de una franja. El formato de la columna es cosa de la base y no de la pantalla.
import { leerDescansos } from '../utils/descansos';
import { estadoDescansoDe, propuestaDeDescanso } from '../utils/descansoObligatorio';
import { diaSemanaDeFechaBogota } from '../utils/diasDeLaSemana';
import { descansoDelDia, estadoDelDia } from '../utils/calendarioDeTurnos';
import { jornadaVigente } from '../utils/vigencias';
// El contador mensual de descansos trabajados. Es una ALARMA, no dinero: el recargo se paga igual
// siendo ocasional o habitual, y lo que cambia al llegar a tres es que la compensación en tiempo
// deja de ser opcional.
import { descansosTrabajadosPorMes, clasificarDescansos, MINIMO_HABITUAL } from '../utils/descansoHabitual';
// El modal del descanso trabajado (22 de septiembre de 2026). Las tres piezas son puras, probadas y
// mutadas; aquí solo queda la plomería.
import { limpiarDecisionDeDescanso } from '../utils/cuerpoDeDecisionDeDescanso';
import { diferenciasDeDecision } from '../utils/cambiosDeDescansoTrabajado';
import {
  opcionesDeCompensacion, revisionDeDecision, decisionValida, claseValida, decisionDelDia,
} from '../utils/descansoCompensatorio';

// EL CALENDARIO DE TURNOS (20 de septiembre de 2026).
//
// Lo que esta ruta NO hace, y es la decisión que la define: no vuelve a deducir qué días trabaja
// cada quien. Los lee de `DiaEsperado` y los une con `combinarDiasEsperados`, que es EXACTAMENTE la
// misma fuente y la misma función que usa la liquidación (`routes/reportes.ts`).
//
// La alternativa —derivar los días en el frontend a partir del horario— era tentadora porque no
// pedía ruta nueva, y estaba mal: sería escribir por segunda vez lo que `calcularDiasEsperados` ya
// hace aquí. El día que las dos versiones se separen, el calendario mostraría una cosa y la nómina
// otra, y no habría forma de saber cuál miente.
//
// Por eso, tampoco: ningún cálculo de dinero. La pantalla enseña qué día trabaja cada quien y cuál
// es su descanso obligatorio. Los recargos siguen saliendo de `horasColombiana.ts`.

// Tope de días que se pueden pedir de una vez. NO es una regla de negocio, es una guarda: la
// consulta cruza personas × días y un rango de un año con 200 personas son 73.000 celdas camino al
// navegador. La pantalla pide siete.
const DIAS_MAXIMOS = 62;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export default async function turnoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.requireEmpresa] };

  app.get('/calendario', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const { desde, hasta } = request.query as { desde?: string; hasta?: string };
    if (!desde || !hasta) return reply.status(400).send({ error: 'Faltan las fechas del rango.' });

    const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
    if (finExclusivo <= desdeF) return reply.status(400).send({ error: 'El rango termina antes de empezar.' });
    const cuantos = Math.round((finExclusivo.getTime() - desdeF.getTime()) / UN_DIA_MS);
    if (cuantos > DIAS_MAXIMOS) {
      return reply.status(400).send({ error: `El calendario muestra ${DIAS_MAXIMOS} días como máximo, y se pidieron ${cuantos}.` });
    }

    // LA VENTANA DEL CONTADOR LEGAL es el MES CALENDARIO, no la semana que se pinta: el paso a
    // descanso habitual se cuenta por mes. Se toman los meses que TOCA el rango, porque una semana
    // puede cruzar de mes (28 de septiembre a 4 de octubre).
    //
    // Los límites se derivan de `claveDiaBogota` y NO de `getUTCMonth()`. La diferencia muerde: el
    // último instante del rango son las 04:59 UTC del día siguiente, así que en UTC un rango que
    // en Bogotá termina el 30 de septiembre ya dice octubre, y el contador miraría el mes que no es.
    const ultimoDia = claveDiaBogota(new Date(finExclusivo.getTime() - 1));
    const primerDia = claveDiaBogota(desdeF);
    const [anioIni, mesIni] = primerDia.split('-').map(Number);
    const [anioFin, mesFin] = ultimoDia.split('-').map(Number);
    const mesDesde = new Date(Date.UTC(anioIni, mesIni - 1, 1, 5, 0, 0));
    const mesHasta = new Date(Date.UTC(anioFin, mesFin, 1, 5, 0, 0)); // el primero del mes siguiente
    const mesDelRango = ultimoDia.slice(0, 7);

    const [personas, filasDeDia, jornadas, festivos, diasDelMes, marcasDelMes] = await Promise.all([
      // `select` explícito y corto a propósito: sin él vienen las dos fotos en base64 y el
      // descriptor facial de cada persona, que esta pantalla no pinta. `cargo` sí, que va bajo el
      // nombre en la primera columna.
      prisma.colaborador.findMany({
        where: { empresaId, activo: true },
        select: {
          id: true, nombre: true, apellido: true, cargo: true,
          // Sin estas tres no se puede saber qué día descansa nadie, y la guarda legal de
          // `estadoDescansoDe` no tendría con qué decidir.
          descansoTipo: true, descansoDia: true, descansoAcuerdoEn: true,
          horario: { include: { franjas: true } },
        },
        orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      }),
      // Los días de toda la empresa en UNA consulta, igual que el resumen de reportes: una por
      // persona serían 35 consultas para pintar una semana.
      prisma.diaEsperado.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: {
          colaboradorId: true, fecha: true, programado: true, horaEntrada: true, horaSalida: true,
          toleranciaMin: true, almuerzoMin: true, minutosEsperados: true, toleranciaSalidaMin: true,
          ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true, descansos: true,
          // Las que `DiaEsperadoCalculado` no lleva y que se unen aparte, más abajo.
          esDescanso: true, origen: true,
          // Si alguien MARCÓ este día como libre, que no es lo mismo que que sea su descanso
          // obligatorio (23 de septiembre de 2026). Sin esto, un descanso marcado a alguien FIJO o
          // PRESUMIDO caía a SIN_TURNO y la celda mostraba el recuadro de «Agregar».
          descansoPintado: true,
          // El horario con el que ESTE día quedó congelado, que no es necesariamente el que la
          // persona tiene hoy. La celda muestra su nombre cuando nadie pintó un turno encima, y
          // tomarlo del horario vigente sería poner el nombre de hoy junto a las horas de ayer:
          // una etiqueta que miente, que es el defecto que esta pantalla acaba de quitarse.
          horarioId: true,
          // El turno del catálogo con el que se pintó este día, cuando alguien lo pintó. La celda
          // toma ESE nombre y ESE color; `null` significa que no lo pintó ninguno, y entonces la
          // celda usa el nombre del horario.
          //
          // (Este comentario decía hasta el 22 de septiembre de 2026 que la columna «es siempre
          // null porque el planificador no existe todavía». Existe y la escribe.)
          //
          // Dos columnas de la plantilla y no la entera: la celda pinta un recuadro con un rótulo,
          // y traerse sus descansos y sus ventanas de almuerzo sería cargar el mes de toda la
          // empresa para no usarlo.
          // El `esDescanso` DE LA PLANTILLA (o sea, si el turno pintado es un turno de descanso) no
          // viaja al frontend: se usa aquí para calcular la propuesta de la semana (qué día sugerirle
          // a quien planifica) y nada más.
          //
          // OJO, NO CONFUNDIRLO CON EL DEL DÍA (28 de septiembre de 2026). El de la fila —el de
          // arriba, junto a `origen`— SÍ viaja desde hoy, como `esDescansoObligatorio`, y la razón
          // está escrita donde se agrega: `dia.estado` NO alcanza para distinguir el descanso
          // obligatorio de uno marcado a mano, y de esa diferencia depende un aviso que cuesta plata.
          // El `id` viaja desde el 28 de septiembre de 2026, y es una palabra con una consecuencia:
          // sin él la pantalla sabe que el día tiene un turno pintado pero no CUÁL, así que la previa
          // de la programación en bloque no podía distinguir «ya tiene este mismo turno» de «tiene
          // otro». Comparar por nombre habría sido lo otro, y dos turnos pueden llamarse igual.
          plantilla: { select: { id: true, nombre: true, color: true, esDescanso: true } },
        },
        orderBy: { fecha: 'asc' },
      }),
      prisma.jornadaVigencia.findMany(),
      prisma.diaFestivo.findMany({
        where: { OR: [{ empresaId: null }, { empresaId }], fecha: { gte: desdeF, lt: finExclusivo } },
        select: { fecha: true },
      }),
      // Los días del mes o meses que toca el rango, con TRES columnas y no las quince de arriba:
      // el contador solo necesita saber de quién es el día, cuál es, y si era su descanso. Medido
      // el 21 de septiembre de 2026, la ventana mensual son 4,3 veces las filas de la semanal.
      prisma.diaEsperado.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: mesDesde, lt: mesHasta } },
        select: { colaboradorId: true, fecha: true, esDescanso: true },
      }),
      // Qué días tuvieron MARCACIÓN. Es lo que decide si un descanso se trabajó de verdad, y no es
      // lo mismo que tener turno programado encima: medido en la base local los dos conjuntos
      // salieron DISJUNTOS, ni un solo día tenía las dos cosas.
      //
      // Se comprobó además que ningún día con marcación se queda sin su fila de día esperado (0 de
      // 9 en el mes medido), así que contar desde `dias_esperados` no pierde nada.
      prisma.registro.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: mesDesde, lt: mesHasta } },
        select: { colaboradorId: true, fecha: true },
      }),
    ]);

    // Los horarios de la empresa, para poder nombrar un día por el horario con el que quedó
    // CONGELADO y no por el que la persona tiene hoy.
    //
    // Consulta propia y no colgada de `personas` a propósito: un horario al que ya nadie está
    // asignado (porque se movió a la gente, o se desactivó) sigue teniendo días congelados que lo
    // apuntan, y por `personas` esos nombres no aparecerían. Son pocos: 10 en la base medida.
    //
    // Va DESPUÉS del `Promise.all` y no dentro para no tocar su desestructuración. El costo es un
    // viaje más a una tabla diminuta; la alternativa era una edición en dos puntos del archivo que
    // deja el arreglo y la desestructuración descuadrados si caen en distinto orden.
    const nombreDeHorario = new Map(
      (await prisma.horario.findMany({ where: { empresaId }, select: { id: true, nombre: true } }))
        .map(h => [h.id, h.nombre] as const),
    );

    // LAS DECISIONES YA TOMADAS SOBRE LOS DESCANSOS TRABAJADOS DEL RANGO (22 de septiembre de 2026).
    //
    // Solo tres columnas: la celda únicamente necesita saber si está pendiente. El resto (la nota,
    // el rastro, quién decidió) lo trae `GET /descanso-trabajado` cuando se abre el modal, que es
    // cuando hace falta.
    //
    // Va DESPUÉS del `Promise.all` y no dentro, por lo mismo que la consulta de horarios: meterla
    // dentro obliga a tocar también su desestructuración sesenta líneas más arriba, y según en qué
    // orden caigan las dos ediciones queda un instante con el arreglo de siete y la
    // desestructuración de seis.
    const decisionPorDia = new Map(
      (await prisma.descansoTrabajado.findMany({
        where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
        select: { colaboradorId: true, fecha: true, decision: true },
      })).map(d => [`${d.colaboradorId}|${claveDiaBogota(d.fecha)}`, d.decision] as const),
    );

    const festivosDelRango = new Set(festivos.map(f => claveDiaBogota(f.fecha)));
    // La jornada legal del final del rango: 42 horas hoy, y sube o baja sola con la Ley 2101
    // porque sale de la tabla de vigencias. Escribirla a mano en la pantalla la habría congelado.
    const horasSemanales = jornadaVigente(new Date(finExclusivo.getTime() - 1), jornadas);

    const porColaborador = new Map<string, typeof filasDeDia>();
    for (const f of filasDeDia) {
      const suyas = porColaborador.get(f.colaboradorId);
      if (suyas) suyas.push(f);
      else porColaborador.set(f.colaboradorId, [f]);
    }

    // ───────── El contador legal del mes, resuelto una sola vez ─────────
    //
    // Va aquí y no dentro del `map` de abajo para no recorrer el mes entero una vez por persona:
    // con 35 personas serían 35 pasadas sobre las mismas filas.
    const conMarca = new Set(marcasDelMes.map(r => `${r.colaboradorId}|${claveDiaBogota(r.fecha)}`));
    const diasMesPorPersona = new Map<string, typeof diasDelMes>();
    for (const d of diasDelMes) {
      const suyos = diasMesPorPersona.get(d.colaboradorId);
      if (suyos) suyos.push(d);
      else diasMesPorPersona.set(d.colaboradorId, [d]);
    }

    const contadorPorPersona = new Map<string, Record<string, number>>();
    for (const p of personas) {
      const declarado = estadoDescansoDe(p);
      const suyos = diasMesPorPersona.get(p.id) ?? [];
      contadorPorPersona.set(p.id, descansosTrabajadosPorMes(suyos.map(d => ({
        fecha: d.fecha,
        // Donde la fila no lo calculó (null), se cae a la declaración con la MISMA función que usa
        // el motor. Así el contador y la liquidación no pueden discrepar sobre qué día era su
        // descanso.
        esDescanso: descansoDelDia(d.esDescanso, diaSemanaDeFechaBogota(d.fecha), declarado),
        trabajado: conMarca.has(`${p.id}|${claveDiaBogota(d.fecha)}`),
      }))));
    }

    const filas = personas.map(persona => {
      // Sin `as any`, al revés que en `reportes.ts`: con el `select` anidado de arriba Prisma ya
      // tipa esto como el horario con sus franjas, que es justo lo que `combinarDiasEsperados`
      // pide. El casteo era heredado y costaba un aviso del linter, que está topado.
      const horario = persona.horario;
      const mias = porColaborador.get(persona.id) ?? [];
      // La MISMA función que la liquidación: donde hay fila manda la fila, donde no la hay se cae
      // al horario vigente.
      const combinados = combinarDiasEsperados(desdeF, finExclusivo, mias, horario);

      // `esDescanso` y `origen` viajan aparte porque `DiaEsperadoCalculado` no los lleva y al
      // combinar se perderían. Se unen con la MISMA doctrina, no con una segunda versión de qué
      // días trabaja la persona: eso ya lo decidió `combinarDiasEsperados` arriba.
      const extras = new Map(mias.map(f => [claveDiaBogota(f.fecha), f]));
      // La guarda legal: un día declarado sin acuerdo escrito vale como PRESUMIDO, o sea domingo.
      const estado = estadoDescansoDe(persona);

      const dias = combinados.map(d => {
        const clave = claveDiaBogota(d.fecha);
        const extra = extras.get(clave);
        const esDescanso = descansoDelDia(extra?.esDescanso, diaSemanaDeFechaBogota(d.fecha), estado);
        // Se calcula UNA vez y se usa para dos cosas: lo que la celda pinta, y si ese día necesita
        // una decisión. Calcularlo dos veces permitiría que alguien cambiara una y dejara la otra.
        const estadoDia = estadoDelDia({
          programado: d.programado, esDescanso, descansoPintado: extra?.descansoPintado === true,
        });
        return {
          fecha: clave,
          estado: estadoDia,
          // `null` cuando el día no es un descanso trabajado; `PENDIENTE` cuando lo es y nadie ha
          // decidido todavía, que es el caso que el dueño pidió poder ver sin abrir el modal.
          decision: decisionDelDia(estadoDia === 'DESCANSO_TRABAJADO', decisionPorDia.get(`${persona.id}|${clave}`)),
          // SI ESTE DÍA ES SU DESCANSO OBLIGATORIO (28 de septiembre de 2026).
          //
          // Ya estaba calculado dos líneas arriba para decidir el estado de la celda, y hasta hoy se
          // tiraba. Viaja porque la programación en bloque tiene que poder avisar «pintarías sobre el
          // descanso obligatorio de tres jornadas» ANTES de escribir, y eso es por celda.
          //
          // NO SE PUEDE DEDUCIR DE `estado`, que fue lo primero que se intentó: un día marcado a mano
          // como descanso también sale `DESCANSO` sin ser el obligatorio, así que deducirlo daría un
          // aviso falso justo en el caso que cuesta dinero.
          //
          // Y NO SE PUEDE DEDUCIR EN LA PANTALLA de `descanso.tipo`: la regla lleva dentro la guarda
          // del acuerdo escrito (sin papel, cualquier día declarado vale como domingo), y una segunda
          // copia es como se separan. Ya pasó en la maqueta de esto mismo: su copia se quedó leyendo
          // el tipo en crudo y le decía «pactado por escrito» a alguien a quien el motor trata como
          // presumido.
          esDescansoObligatorio: esDescanso,
          horaEntrada: d.horaEntrada,
          horaSalida: d.horaSalida,
          minutosEsperados: d.minutosEsperados,
          // LAS REGLAS CON LAS QUE ESE DÍA SE LIQUIDA (22 de septiembre de 2026).
          //
          // Pedido del dueño: «nos hace falta más info, similar a como tenemos en la creación de
          // horario: las tolerancias, cómo se maneja el almuerzo, descansos no remunerados». Las
          // muestra el panel que se abre al hacer clic en la jornada.
          //
          // No cuestan ni una consulta más: la de arriba ya traía estas columnas desde antes de
          // hoy, y `combinarDiasEsperados` las calcula del horario para los días que todavía no
          // tienen fila. Por eso viajan ahora y no antes: hasta hoy no había quién las leyera.
          //
          // Salen de la FILA del día y no del horario vigente, por la misma razón que
          // `horarioNombre` aquí abajo: son las reglas que gobiernan ESE día, no las de hoy.
          toleranciaMin: d.toleranciaMin,
          toleranciaSalidaMin: d.toleranciaSalidaMin,
          ajustaEntrada: d.ajustaEntrada,
          almuerzoMin: d.almuerzoMin,
          almuerzoInicio: d.almuerzoInicio,
          almuerzoFin: d.almuerzoFin,
          // Ya convertidos, como hace `franjaParaResponder` con los de la franja. Parsear el texto
          // en la pantalla pondría el formato de la columna en dos sitios.
          descansos: leerDescansos(d.descansos),
          esFestivo: festivosDelRango.has(clave),
          // AUTO = salió del horario · MANUAL = lo ajustó el admin. Null = ese día no tiene fila
          // todavía y lo está resolviendo el horario vigente.
          origen: extra?.origen ?? null,
          // Viaja por `extras` y NO por `combinarDiasEsperados`, igual que `esDescanso` y `origen`:
          // `DiaEsperadoCalculado` no lo lleva, así que al combinar se perdería.
          //
          // `null` significa «a este día no lo pintó ningún turno». La celda NO se inventa entonces
          // un nombre a partir de las horas: eso se quitó el 21 de septiembre de 2026 porque se leía
          // como un turno asignado que nadie había asignado. Cae a `horarioNombre`, aquí abajo.
          // El `id` va junto al nombre y al color porque quien lo necesita es la previa del bloque:
          // para decir cuántas jornadas NO cambian hay que comparar el turno que el día ya tiene
          // contra el que se le va a poner, y eso se compara por identidad, no por nombre.
          turno: extra?.plantilla
            ? { id: extra.plantilla.id, nombre: extra.plantilla.nombre, color: extra.plantilla.color }
            : null,
          // El nombre del horario que rige ESTE día, para la celda que nadie pintó. Un día que el
          // horario programa sí está asignado, y decir «sin asignar» de todo lo no pintado dejaba
          // al administrador viendo a su equipo entero sin asignar.
          //
          // Sale del `horarioId` CONGELADO en la fila. Solo los días SIN fila caen al horario
          // vigente de la persona, que es de donde salen de verdad. Mezclarlos pondría el nombre de
          // hoy al lado de las horas de ayer, que es la misma clase de etiqueta que miente.
          horarioNombre: extra
            ? (extra.horarioId ? nombreDeHorario.get(extra.horarioId) ?? null : null)
            : horario?.nombre ?? null,
        };
      });

      // QUÉ PROPONERLE A QUIEN PLANIFICA ESTA SEMANA (22 de septiembre de 2026).
      //
      // Se resuelve AQUÍ y no en la pantalla. Es una regla que roza el dinero (de ella sale qué día
      // lleva el recargo), y dejar que el frontend la dedujera de las banderas crudas la pondría en
      // dos sitios, que es el error que todo este trabajo vino a quitar.
      //
      // Solo se calcula cuando el rango pedido ES una semana. La pantalla siempre pide siete días;
      // el tope de 62 existe como guarda de abuso, y sobre un rango de tres semanas un solo valor
      // vería dos descansos y diría «ambigua» sobre dos semanas que están claras. `null` significa
      // «no se calculó para este rango», que es distinto de `NO_APLICA` («no es rotativa»).
      const propuestaCruda = combinados.length === 7
        ? propuestaDeDescanso(
          combinados.map(d => {
            const e = extras.get(claveDiaBogota(d.fecha));
            return {
              dia: diaSemanaDeFechaBogota(d.fecha),
              // `pintado` es «tiene un turno del catálogo encima», que es lo que convierte un día
              // en blanco en un hueco proponible. No es lo mismo que `programado`: el horario
              // programa los siete y aun así ninguno está pintado.
              pintado: !!e?.plantilla,
              esDescansoDeTurno: e?.plantilla?.esDescanso === true,
            };
          }),
          estado,
        )
        : null;

      // LA FECHA LA RESUELVE LA RUTA, no la pantalla. La función pura habla en nombres de día
      // (`JUEVES`), que es lo correcto a su nivel y coherente con el resto del módulo. Pero para
      // confirmar hay que PINTAR, y pintar necesita una fecha.
      //
      // La pantalla podría deducirla del índice en la rejilla, y eso la ataría a que los siete días
      // vengan siempre en orden de lunes. Resolverla aquí quita toda la aritmética de fechas del
      // frontend, que es donde más barato sale equivocarse de día.
      const fechaDelDia = (nombre: string): string | null => {
        const encontrado = combinados.find(d => diaSemanaDeFechaBogota(d.fecha) === nombre);
        return encontrado ? claveDiaBogota(encontrado.fecha) : null;
      };
      const propuesta = propuestaCruda !== null
        && (propuestaCruda.estado === 'PROPUESTA' || propuestaCruda.estado === 'RESUELTA')
        ? { ...propuestaCruda, fecha: fechaDelDia(propuestaCruda.dia) }
        : propuestaCruda;

      return {
        id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        cargo: persona.cargo,
        // El estado ya resuelto, no las tres columnas crudas: la pantalla no puede volver a
        // decidir si el acuerdo escrito alcanza, porque esa decisión es la que protege el recargo.
        descanso: { tipo: estado.tipo, dia: estado.tipo === 'FIJO' ? estado.dia : null },
        propuesta,
        minutosEsperados: dias.reduce((a, d) => a + d.minutosEsperados, 0),
        // Cuántos de sus días de descanso tienen turno PROGRAMADO encima en este rango. Es un dato
        // del horario, no de lo que ocurrió: sirve para pintar la semana, y NO para la regla legal.
        descansosConTurno: dias.filter(d => d.estado === 'DESCANSO_TRABAJADO').length,
        // La regla legal, que es otra cosa y por eso viaja aparte (21 de septiembre de 2026).
        //
        // Cuenta los descansos que la persona TRABAJÓ DE VERDAD —con marcaciones— en el MES
        // calendario. Medido en la base local, «programado» y «trabajado» resultaron disjuntos: ni
        // un solo día tenía las dos cosas. Apoyar la alarma en el horario le habría sumado tres a
        // quien no trabajó ninguno.
        descansoHabitual: {
          porMes: contadorPorPersona.get(persona.id) ?? {},
          mes: mesDelRango,
          trabajados: (contadorPorPersona.get(persona.id) ?? {})[mesDelRango] ?? 0,
          clase: clasificarDescansos((contadorPorPersona.get(persona.id) ?? {})[mesDelRango] ?? 0),
        },
        dias,
      };
    });

    // `minimoHabitual` viaja por la MISMA razón que `horasSemanales`, y con el precedente hecho: son
    // los dos números legales que la pantalla nombra, y escribirlos a mano allí los congelaría. El
    // comentario de la constante ya lo advertía («la pantalla también lo nombra: escribirlo dos veces
    // es como se separan»). Lo usa la previa de la programación en bloque para decir quién cruza a
    // descanso habitual con lo que está a punto de aplicarse.
    return { desde, hasta, horasSemanales, minimoHabitual: MINIMO_HABITUAL, filas };
  });

  // ───────────── EL PLANIFICADOR: pintar un día con un turno del catálogo ─────────────
  //
  // Aquí solo queda la plomería, y es deliberado:
  //
  //   el ALCANCE por empresa, que es lo que impide pintarle el día a la gente de otra;
  //   el CUERPO, que llega de la red y no se puede creer;
  //   y la traducción del resultado a un código HTTP.
  //
  // Lo demás vive fuera: qué exige un día pintado lo decide `diaDesdePlantilla` (pura, probada y
  // mutada), y escribirlo lo hace `materializarDias`, que es el único que toca esa tabla y el que
  // aplica las guardas de «solo hacia adelante».

  // "2026-09-23" a medianoche de Bogotá. Se exige el formato ANTES de construir la fecha: sin la
  // comprobación, una cadena cualquiera produce un `Invalid Date` que después viaja a la consulta.
  const fechaDelCuerpo = (v: unknown): Date | null => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const d = medianocheBogota(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  app.put('/dia', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const cuerpo = request.body as
      { colaboradorId?: string; fecha?: string; plantillaId?: string; descanso?: boolean } | null;
    const fecha = fechaDelCuerpo(cuerpo?.fecha);
    if (!cuerpo?.colaboradorId || !fecha) {
      return reply.status(400).send({ error: 'Falta la persona o la fecha.' });
    }

    // MARCAR UN DÍA COMO DESCANSO (23 de septiembre de 2026). Es una acción sobre el día y no un
    // turno del catálogo: «descanso es siempre descanso», así que no hay nada que configurarle ni
    // ninguna plantilla que buscar. Se resuelve antes para no exigir un `plantillaId` que aquí no
    // existe.
    if (cuerpo.descanso === true) {
      const quien = await prisma.colaborador.findFirst({
        where: { id: cuerpo.colaboradorId, empresaId }, select: { id: true },
      });
      if (!quien) return reply.status(404).send({ error: 'Colaborador no encontrado.' });
      const marcado = await marcarDescansoDeColaborador(quien.id, fecha);
      if (!marcado.ok) return reply.status(400).send({ error: marcado.motivo });
      return { ok: true };
    }

    if (!cuerpo.plantillaId) {
      return reply.status(400).send({ error: 'Falta el turno.' });
    }

    // Las dos guardas de alcance se piden a la vez pero se responden por separado: si el turno no
    // existe, decirle «colaborador no encontrado» manda a buscar el problema donde no está.
    const [persona, plantilla] = await Promise.all([
      prisma.colaborador.findFirst({
        where: { id: cuerpo.colaboradorId, empresaId }, select: { id: true },
      }),
      prisma.plantillaTurno.findFirst({
        where: { id: cuerpo.plantillaId, empresaId },
        // Exactamente lo que `PlantillaParaPintar` necesita, más el id que se guarda en el día.
        select: {
          id: true, esDescanso: true, horaEntrada: true, horaSalida: true,
          tieneAlmuerzo: true, almuerzoInicio: true, almuerzoFin: true, descansos: true,
        },
      }),
    ]);
    if (!persona) return reply.status(404).send({ error: 'Colaborador no encontrado.' });
    if (!plantilla) return reply.status(404).send({ error: 'Ese turno no existe en tu catálogo.' });

    const r = await pintarDiaDeColaborador(persona.id, fecha, plantilla);
    // 400 y no 500: que el día ya pasara o que la persona ya marcara no es un fallo del servidor,
    // es una regla del producto, y el mensaje tiene que llegarle al administrador tal cual.
    if (!r.ok) return reply.status(400).send({ error: r.motivo });
    return { ok: true };
  });

  // Quitar el turno pintado. Por `query` y no por cuerpo: un DELETE con cuerpo lo tratan distinto
  // según el cliente, y esto solo necesita dos identificadores.
  app.delete('/dia', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const { colaboradorId, fecha: fechaCruda } = request.query as { colaboradorId?: string; fecha?: string };
    const fecha = fechaDelCuerpo(fechaCruda);
    if (!colaboradorId || !fecha) {
      return reply.status(400).send({ error: 'Falta la persona o la fecha.' });
    }

    const persona = await prisma.colaborador.findFirst({
      where: { id: colaboradorId, empresaId }, select: { id: true },
    });
    if (!persona) return reply.status(404).send({ error: 'Colaborador no encontrado.' });

    const r = await despintarDiaDeColaborador(persona.id, fecha);
    if (!r.ok) return reply.status(400).send({ error: r.motivo });
    return { ok: true };
  });

  // ───────── QUÉ SE DECIDIÓ SOBRE UN DÍA DE DESCANSO TRABAJADO (22 de septiembre de 2026) ─────────
  //
  // Antes de esto el sistema pagaba el recargo y no guardaba NINGUNA constancia de qué se acordó.
  // En un reclamo laboral eso deja a la empresa sin con qué contestar, y el registro es justamente
  // lo que la protege.
  //
  // Las tres decisiones viven fuera y están mutadas: `limpiarDecisionDeDescanso` valida el cuerpo,
  // `opcionesDeCompensacion` dice qué cabe según la clase, y `revisionDeDecision` dice si lo ya
  // decidido sigue cuadrando con el mes. Aquí solo hay alcance, consultas y códigos HTTP.

  // La clase del MES de esa fecha, calculada EXACTAMENTE como la calcula el calendario: con el día
  // congelado (`esDescanso`) y con las MARCACIONES de verdad, que son cosas distintas. Medido el 21
  // de septiembre de 2026, «programado» y «trabajado» resultaron disjuntos.
  //
  // Los límites del mes salen de `claveDiaBogota` y NO de `getUTCMonth()`: en UTC, un día que en
  // Bogotá es 30 de septiembre ya dice octubre, y el contador miraría el mes que no es.
  async function claseDelMesDe(persona: { id: string; descansoTipo: string; descansoDia: string | null; descansoAcuerdoEn: Date | null }, fecha: Date) {
    const [anio, mes] = claveDiaBogota(fecha).split('-').map(Number);
    const desdeMes = new Date(Date.UTC(anio, mes - 1, 1, 5, 0, 0));
    const hastaMes = new Date(Date.UTC(anio, mes, 1, 5, 0, 0));
    const [dias, marcas] = await Promise.all([
      prisma.diaEsperado.findMany({
        where: { colaboradorId: persona.id, fecha: { gte: desdeMes, lt: hastaMes } },
        select: { fecha: true, esDescanso: true },
      }),
      prisma.registro.findMany({
        where: { colaboradorId: persona.id, fecha: { gte: desdeMes, lt: hastaMes } },
        select: { fecha: true },
      }),
    ]);
    const conMarca = new Set(marcas.map(r => claveDiaBogota(r.fecha)));
    const estado = estadoDescansoDe(persona);
    const porMes = descansosTrabajadosPorMes(dias.map(d => ({
      fecha: d.fecha,
      esDescanso: descansoDelDia(d.esDescanso, diaSemanaDeFechaBogota(d.fecha), estado),
      trabajado: conMarca.has(claveDiaBogota(d.fecha)),
    })));
    return clasificarDescansos(porMes[claveDiaBogota(fecha).slice(0, 7)] ?? 0);
  }

  const PARA_DECIDIR = {
    id: true, descansoTipo: true, descansoDia: true, descansoAcuerdoEn: true,
  } as const;

  // Lo que el modal necesita para abrirse: lo decidido (o que no hay nada), la clase del mes, qué
  // opciones caben, si hay que revisar algo, y el rastro.
  app.get('/descanso-trabajado', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const { colaboradorId, fecha: fechaCruda } = request.query as { colaboradorId?: string; fecha?: string };
    const fecha = fechaDelCuerpo(fechaCruda);
    if (!colaboradorId || !fecha) return reply.status(400).send({ error: 'Falta la persona o la fecha.' });

    const persona = await prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId }, select: PARA_DECIDIR });
    if (!persona) return reply.status(404).send({ error: 'Colaborador no encontrado.' });

    const [fila, claseActual] = await Promise.all([
      prisma.descansoTrabajado.findUnique({
        where: { colaboradorId_fecha: { colaboradorId: persona.id, fecha } },
        include: { cambios: { orderBy: { creadoEn: 'desc' }, take: 50 } },
      }),
      claseDelMesDe(persona, fecha),
    ]);

    // Sin fila, la decisión es PENDIENTE. No se crea nada al mirar: una fila escrita por abrir un
    // modal afirmaría que alguien decidió algo.
    // Se ESTRECHAN los dos, no se castean: las dos columnas son VARCHAR y pueden tener cualquier
    // cosa. Lo que no se reconozca sale como PENDIENTE (o sea, a revisión) y como `null` (o sea,
    // sin comparación que inventar).
    const decision = decisionValida(fila?.decision);
    const claseAlDecidir = claseValida(fila?.claseAlDecidir);
    return {
      fecha: claveDiaBogota(fecha),
      decision,
      fechaCompensatorio: fila?.fechaCompensatorio ? claveDiaBogota(fila.fechaCompensatorio) : null,
      nota: fila?.nota ?? null,
      // Estrechada, no casteada, por lo mismo que `decision`: la columna es VARCHAR. Y se calcula
      // UNA vez para las dos cosas (lo que se muestra y lo que se compara), porque si se estrechara
      // dos veces alguien podría cambiar una y dejar la otra.
      claseAlDecidir,
      decididoPor: fila?.decididoNombre ?? null,
      decididoEn: fila?.decididoEn ?? null,
      claseActual,
      ...opcionesDeCompensacion(claseActual),
      revision: revisionDeDecision({ decision, claseAlDecidir, claseActual }),
      cambios: (fila?.cambios ?? []).map(c => ({
        campo: c.campo, antes: c.antes, despues: c.despues,
        quien: c.usuarioNombre ?? null, cuando: c.creadoEn,
      })),
    };
  });

  app.put('/descanso-trabajado', auth, async (request, reply) => {
    const empresaId = request.empresaId!;
    const cuerpo = (request.body ?? {}) as Record<string, unknown>;

    // El alcance va primero y por separado, igual que en `PUT /dia`: se resuelve la persona DENTRO
    // de la empresa y solo entonces se valida el cuerpo contra ese único id.
    const idCrudo = typeof cuerpo.colaboradorId === 'string' ? cuerpo.colaboradorId : '';
    const persona = await prisma.colaborador.findFirst({ where: { id: idCrudo, empresaId }, select: PARA_DECIDIR });
    if (!persona) return reply.status(404).send({ error: 'Colaborador no encontrado.' });

    const limpio = limpiarDecisionDeDescanso(cuerpo, [persona.id]);
    if (!limpio.ok) return reply.status(400).send({ error: limpio.motivo });

    const fecha = medianocheBogota(limpio.datos.fecha);
    const compensatorio = limpio.datos.fechaCompensatorio ? medianocheBogota(limpio.datos.fechaCompensatorio) : null;
    // La clase la escribe el SERVIDOR, no el cuerpo. Si la mandara el cliente, cualquiera podría
    // declarar «era ocasional» para justificar una decisión que no correspondía.
    const claseAlDecidir = await claseDelMesDe(persona, fecha);

    const previo = await prisma.descansoTrabajado.findUnique({
      where: { colaboradorId_fecha: { colaboradorId: persona.id, fecha } },
      select: { id: true, decision: true, fechaCompensatorio: true, claseAlDecidir: true, nota: true },
    });

    const guardado = await prisma.descansoTrabajado.upsert({
      where: { colaboradorId_fecha: { colaboradorId: persona.id, fecha } },
      update: {
        decision: limpio.datos.decision, fechaCompensatorio: compensatorio,
        claseAlDecidir, nota: limpio.datos.nota,
        decididoPor: request.usuarioId ?? null, decididoNombre: request.usuarioNombre ?? null,
        decididoEn: new Date(),
      },
      create: {
        colaboradorId: persona.id, fecha,
        decision: limpio.datos.decision, fechaCompensatorio: compensatorio,
        claseAlDecidir, nota: limpio.datos.nota,
        decididoPor: request.usuarioId ?? null, decididoNombre: request.usuarioNombre ?? null,
        decididoEn: new Date(),
      },
      select: { id: true },
    });

    // EL RASTRO NO PUEDE TUMBAR LA DECISIÓN. Es la misma intención que declara `anotarCambios` en
    // `routes/registros.ts`: «si el historial falla, la corrección igual tiene que guardarse.
    // Perder la bitácora es malo; perder la corrección del trabajador es peor.»
    if (previo) {
      try {
        const difs = diferenciasDeDecision(
          {
            decision: previo.decision, fechaCompensatorio: previo.fechaCompensatorio,
            claseAlDecidir: previo.claseAlDecidir, nota: previo.nota,
          },
          {
            decision: limpio.datos.decision, fechaCompensatorio: compensatorio,
            claseAlDecidir, nota: limpio.datos.nota,
          },
        );
        if (difs.length > 0) {
          await prisma.descansoTrabajadoCambio.createMany({
            data: difs.map(d => ({
              descansoTrabajadoId: guardado.id, campo: d.campo, antes: d.antes, despues: d.despues,
              usuarioId: request.usuarioId ?? null, usuarioNombre: request.usuarioNombre ?? null,
            })),
          });
        }
      } catch (e) {
        request.log.error({ err: e }, 'no se pudo anotar el cambio del descanso trabajado');
      }
    }

    return { ok: true, claseAlDecidir };
  });
}
