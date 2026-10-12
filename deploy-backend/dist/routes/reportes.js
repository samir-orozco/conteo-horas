"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reporteRoutes;
const prisma_1 = require("../prisma");
const vigencias_1 = require("../utils/vigencias");
const tardanzas_1 = require("../utils/tardanzas");
const fechas_1 = require("../utils/fechas");
const horasColombiana_1 = require("../utils/horasColombiana");
const auxilioTransporte_1 = require("../utils/auxilioTransporte");
const saldoTiempo_1 = require("../utils/saldoTiempo");
const diasEsperados_1 = require("../utils/diasEsperados");
const sedesDeReporte_1 = require("../utils/sedesDeReporte");
const sedesDeEmpresa_1 = require("../utils/sedesDeEmpresa");
const liquidarRegistros_1 = require("../utils/liquidarRegistros");
const novedadesDelPeriodo_1 = require("../utils/novedadesDelPeriodo");
const columnasDeColaborador_1 = require("../utils/columnasDeColaborador");
// La guarda legal: convierte las tres columnas crudas en el estado que el motor entiende, y por el
// camino descarta cualquier día declarado SIN acuerdo escrito. Se resuelve aquí, una vez por
// persona, y nunca dentro del motor: así no hay ninguna rama que pueda saltársela.
const descansoDelHorario_1 = require("../utils/descansoDelHorario");
// Los dos resúmenes de la empresa entera, compartidos con el correo semanal.
const reportesDeEmpresa_1 = require("../utils/reportesDeEmpresa");
// Lo que devuelven los dos resúmenes que se filtran por sede. El filtro decide
// QUIÉN aparece; el resumen se arma siempre con todas las filas, así que no cambia
// según la sede que se mire. Las reglas viven en utils/sedesDeReporte.ts: esto
// solo las junta, y cambia en cada fila los ids de sus lugares por sus nombres.
//
// Los lugares ya traen la sede que se le atribuye al leer a un presencial (12 de
// septiembre de 2026): cuenta en la línea de su sede, entra en el filtro de su
// sede, y en la fila va con `porDefecto` para que la pantalla lo diga.
function responderPorSede(filas, claves, sedes, sedeId) {
    return {
        colaboradores: filas
            .filter(f => (0, sedesDeReporte_1.apareceConFiltro)(f.lugares, sedeId))
            .map(({ lugares, porDefecto, ...fila }) => ({ ...fila, sedes: (0, sedesDeReporte_1.nombrarLugares)(lugares, sedes, porDefecto) })),
        resumen: (0, sedesDeReporte_1.resumirPorSede)(filas, claves, sedes),
    };
}
async function reporteRoutes(app) {
    const auth = { preHandler: [app.requireEmpresa] };
    app.get('/liquidacion', auth, async (request, reply) => {
        const { colaboradorId, desde, hasta } = request.query;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const [colaborador, registros, festivos, tiposHoraTodos, jornadas, auxilios, cfgModo, cfgPermisos, permisosRango, diasMaterializados] = await Promise.all([
            // El colaborador viaja entero en la respuesta, pero sin sus fotos ni su descriptor facial,
            // que es un dato biométrico: se mandaban al navegador y ninguna pantalla los lee de aquí,
            // solo el nombre y el apellido (13 de septiembre de 2026).
            prisma_1.prisma.colaborador.findFirst({
                where: { id: colaboradorId, empresaId: request.empresaId },
                select: { ...columnasDeColaborador_1.COLABORADOR_SIN_FOTOS, horario: { include: { franjas: true } } },
            }),
            // `select` explícito: sin él vienen también `fotoEntrada` y `fotoSalida`,
            // que son base64 de cientos de KB cada una. Un mes de marcaciones se
            // convertía en decenas de MB cargados en memoria para no usarlos. Las
            // fotos se piden aparte, una a una, con `GET /registros/:id/fotos`.
            //
            // También las abiertas: no se liquidan, pero la entrada de una puede ser el regreso
            // de una pausa, y sin ella la pausa se cobraba entera (utils/liquidarRegistros.ts).
            prisma_1.prisma.registro.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
                select: { id: true, fecha: true, entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
                orderBy: { fecha: 'asc' },
            }),
            prisma_1.prisma.diaFestivo.findMany({
                where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] },
            }),
            prisma_1.prisma.tipoHora.findMany(),
            prisma_1.prisma.jornadaVigencia.findMany(),
            prisma_1.prisma.auxilioVigencia.findMany(),
            prisma_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
            prisma_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId: request.empresaId, clave: saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS } } }),
            // Solo los permisos que tocan el rango: un permiso que terminó antes de
            // `desde` o empieza después del corte no afecta este período.
            // Con las horas: la novedad de una salida temprana solo excusa su tramo, y
            // sin ellas el saldo la leería de día completo.
            prisma_1.prisma.permiso.findMany({
                where: { colaboradorId, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } },
                select: { fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true },
            }),
            // Lo que el horario exigía ESE día, congelado cuando se materializó. Es lo
            // que impide que editar un horario hoy mueva la liquidación de julio.
            prisma_1.prisma.diaEsperado.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    fecha: true, programado: true, horaEntrada: true, horaSalida: true,
                    toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                    toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
                    descansos: true,
                    // Si ESE día era su descanso obligatorio. Sin esta columna el día llega al motor sin la
                    // respuesta congelada y el recargo dominical se recalcula con la declaración de HOY, que
                    // es justo lo que esta tabla existe para impedir (20 de septiembre de 2026).
                    esDescanso: true,
                },
                orderBy: { fecha: 'asc' },
            }),
        ]);
        if (!colaborador)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        // Modo de horas extra (SEMANAL por defecto). En HORARIO, extra = fuera de la
        // franja asignada; sin horario activo el helper cae a SEMANAL solo.
        const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
        const festivosDates = festivos.map(f => new Date(f.fecha));
        const horario = colaborador.horario;
        // Valor hora con el divisor de la jornada vigente al final del período
        const jornadaCierre = (0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornadaCierre);
        // El auxilio se elige con el ÚLTIMO INSTANTE del período: `new Date(hasta)` es medianoche UTC,
        // y un reporte que termina el 1 de enero caería antes de las 05:00 (medianoche de Bogotá) y
        // pagaría con el decreto del año anterior.
        const vigenciaDelAuxilio = (0, auxilioTransporte_1.auxilioVigente)(new Date(finExclusivo.getTime() - 1), auxilios);
        // Los días materializados mandan; los que todavía no lo están (backfill a
        // medias, colaborador anterior a la función) caen al horario vigente, que es
        // lo que el sistema hacía siempre. Así nadie ve números nuevos por sorpresa.
        // Se resuelven ANTES de liquidar porque de ahí sale también la hora de
        // salida programada que usa la tolerancia de jornada.
        const diasEsperados = (0, diasEsperados_1.combinarDiasEsperados)(desdeF, finExclusivo, diasMaterializados, horario);
        // El ExtraConfig sale de los días YA COMBINADOS, no del horario vigente: es
        // lo que impide que cambiar un horario reescriba la clasificación de extras
        // de un período ya liquidado.
        const extraConfig = (0, tardanzas_1.construirExtraConfig)(modoExtra, horario, diasEsperados);
        const r = (0, liquidarRegistros_1.liquidarRegistros)(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, colaborador.salarioMensual, horasMes, true, diasEsperados, (0, descansoDelHorario_1.fuenteDelDescansoDe)(colaborador.horario));
        // Saldo de tiempo no remunerado: lo que el horario exigía contra lo que
        // realmente trabajó. Va en su propio campo y NUNCA dentro de `liquidacion`,
        // porque ese array alimenta totalRecargos/totalAdicional y una fila
        // sintética ahí contaminaría los totales de todos los reportes.
        const politica = (0, saldoTiempo_1.parsearPoliticaPermisos)(cfgPermisos?.valor);
        const sinHorario = !horario || !horario.activo;
        const esperadas = (0, saldoTiempo_1.calcularHorasEsperadas)(desdeF, finExclusivo, diasEsperados, festivosDates, permisosRango, politica, (fecha) => (0, vigencias_1.jornadaVigente)(fecha, jornadas));
        const saldo = (0, saldoTiempo_1.armarSaldo)(esperadas, r.minutosOrdinarios, (0, horasColombiana_1.calcularValorHora)(colaborador.salarioMensual, horasMes), sinHorario, 
        // Las extras de este período: con ellas se muestra el total trabajado y el efecto de cruzarlas
        // con el faltante. No cambian lo que se descuenta.
        { minutos: r.minutosExtra, monto: r.totalExtra });
        return {
            colaborador, desde, hasta, liquidacion: r.liquidacion,
            salarioBase: colaborador.salarioMensual,
            totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
            totalPagar: r.totalAdicional, // compat: ahora es lo adicional al salario
            // Los dos: `registrosCont` son marcaciones CERRADAS y `diasCont` son días con marcación. La
            // cabecera de la pantalla mostraba el primero llamándolo días (15 de septiembre de 2026).
            registrosCont: r.registrosCont,
            diasCont: r.diasCont,
            // El auxilio no toca el valor de la hora: va aparte y prorrateado por los días en que la
            // persona efectivamente viajó al trabajo.
            auxilioTransporte: parseFloat((0, auxilioTransporte_1.auxilioDelPeriodo)({
                salarioBasico: colaborador.salarioMensual,
                auxilioPersona: colaborador.auxilioTransporte,
                diasConDesplazamiento: r.diasCont,
            }, vigenciaDelAuxilio).toFixed(2)),
            detalleRegistros: r.detalleRegistros,
            jornadaSemanal: jornadaCierre, horasMes,
            saldo,
        };
    });
    // Resumen de extras y recargos de TODOS los colaboradores activos en un período
    // (para la vista "Todos" del reporte de Extras; el drill-down de cada uno usa /liquidacion).
    app.get('/extras-resumen', auth, async (request) => {
        const { desde, hasta, sedeId } = request.query;
        // Las consultas y el armado viven en utils/reportesDeEmpresa.ts, que comparte con el correo
        // semanal. Los minutos son para el correo: la ruta no los devuelve.
        const { filas, sedes } = await (0, reportesDeEmpresa_1.liquidarEmpresa)(request.empresaId, desde, hasta);
        const resultado = filas.map(({ minutosOrdinarios: _o, minutosExtra: _e, minutosPorDia: _d, ...fila }) => fila);
        return { desde, hasta, ...responderPorSede(resultado, ['totalRecargos', 'totalExtra', 'totalAdicional'], sedes, sedeId) };
    });
    // Llegadas tarde de un colaborador según su horario asignado
    app.get('/tardanzas', auth, async (request, reply) => {
        const { colaboradorId, desde, hasta } = request.query;
        // Solo lo que usa este reporte: si existe, su horario y su salario. Sin `select` venían todas
        // las columnas, también `foto`, `fotoMini` y `rostroDescriptor` (13 de septiembre de 2026).
        const colaborador = await prisma_1.prisma.colaborador.findFirst({
            where: { id: colaboradorId, empresaId: request.empresaId },
            select: { salarioMensual: true, horario: { include: { franjas: true } } },
        });
        if (!colaborador)
            return reply.status(404).send({ error: 'Colaborador no encontrado' });
        if (!colaborador.horario || !colaborador.horario.activo) {
            return { sinHorario: true, detalle: [], totalMinutos: 0, diasTarde: 0 };
        }
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const [registros, festivos, permisos, jornadas, diasMaterializados] = await Promise.all([
            // Solo la entrada: es lo único que lee `calcularTardanzas`. Sin `select`
            // venían también las fotos de cada marcación del período (ver /liquidacion).
            prisma_1.prisma.registro.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
                select: { entrada: true },
            }),
            prisma_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId: request.empresaId }] } }),
            // Con las horas: la novedad de una salida temprana no excusa la llegada de esa mañana.
            prisma_1.prisma.permiso.findMany({ where: { colaboradorId, aprobado: true }, select: { fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true, aprobado: true, colaboradorId: true } }),
            prisma_1.prisma.jornadaVigencia.findMany(),
            // La hora exigida y la tolerancia de cada día, congeladas. Sin esto,
            // adelantar la entrada del horario llenaba de tardanzas los meses cerrados.
            //
            // SIN `esDescanso`, a propósito: las tardanzas no dependen de quién descansa cuándo, y una
            // columna que nadie lee aquí haría creer lo contrario al que venga después.
            prisma_1.prisma.diaEsperado.findMany({
                where: { colaboradorId, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    fecha: true, programado: true, horaEntrada: true, horaSalida: true,
                    toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                    toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
                    descansos: true,
                },
                orderBy: { fecha: 'asc' },
            }),
        ]);
        const diasEsperados = (0, diasEsperados_1.combinarDiasEsperados)(desdeF, finExclusivo, diasMaterializados, colaborador.horario);
        const resultado = (0, tardanzas_1.calcularTardanzas)(registros, diasEsperados, festivos, permisos);
        // Valor del tiempo llegado tarde, a la tarifa base. Es INFORMATIVO: el
        // descuento real sale del saldo del período (ver /liquidacion), que ya
        // incluye estos minutos. Sumar ambos cobraría la tardanza dos veces.
        const valorHora = (0, horasColombiana_1.calcularValorHora)(colaborador.salarioMensual, (0, vigencias_1.horasMesDeJornada)((0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas)));
        return {
            sinHorario: false, horario: colaborador.horario, ...resultado,
            valorHora: parseFloat(valorHora.toFixed(2)),
            montoTardanzas: parseFloat(((resultado.totalMinutos / 60) * valorHora).toFixed(2)),
        };
    });
    // Resumen de llegadas tarde de TODOS los colaboradores activos en un período
    // (para la vista "Todos"; el drill-down de cada uno usa /tardanzas).
    app.get('/tardanzas-resumen', auth, async (request) => {
        const { desde, hasta, sedeId } = request.query;
        const { filas, sedes } = await (0, reportesDeEmpresa_1.tardanzasDeEmpresa)(request.empresaId, desde, hasta);
        return { desde, hasta, ...responderPorSede(filas, ['diasTarde', 'totalMinutos', 'montoTardanzas'], sedes, sedeId) };
    });
    // Nómina del período de TODOS los colaboradores activos (15 de septiembre de 2026): el desglose por
    // concepto de cada uno, su salario como base y sus novedades. Es el reporte que se descarga en el
    // formato de HoraPro y, encima, en el de cada ERP.
    //
    // Persona por persona usa EL MISMO cálculo de /liquidacion: liquidarRegistros con los días
    // congelados del período. No hay una segunda cuenta del dinero, así que el detalle de una persona
    // tiene que dar exactamente lo mismo que este resumen.
    //
    // El salario viaja como base, no como total a pagar: en una quincena, el salario del mes completo
    // no es lo que se paga, y ese módulo todavía no existe.
    app.get('/nomina', auth, async (request) => {
        const { desde, hasta, sedeId } = request.query;
        const empresaId = request.empresaId;
        const { desdeF, finExclusivo } = (0, fechas_1.rangoReporte)(desde, hasta);
        const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, auxilios, cfgModo, cfgPermisos, permisosTodos, diasTodosEsp, sedes, defectoDe, filasDeLugar] = await Promise.all([
            // Solo lo que usa este reporte. La cédula y el cargo van para el archivo del ERP, que
            // identifica a cada persona por su documento.
            prisma_1.prisma.colaborador.findMany({
                where: { empresaId, activo: true },
                select: {
                    id: true, nombre: true, apellido: true, cedula: true, numeroContrato: true, cargo: true,
                    // Las franjas del horario dicen qué día descansa, por lo mismo que en los otros dos
                    // reportes: este es el archivo que se sube al ERP, así que es el que no puede discrepar de
                    // la liquidación.
                    salarioMensual: true, auxilioTransporte: true, modalidad: true, horario: { include: { franjas: true } },
                },
                orderBy: { nombre: 'asc' },
            }),
            // Sin filtro de sede y también las abiertas, por lo mismo que en /extras-resumen: cada persona
            // se liquida con todos sus turnos y la sede solo decide quién aparece.
            prisma_1.prisma.registro.findMany({
                where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    id: true, colaboradorId: true, fecha: true, entrada: true, salida: true, sedeId: true, sedeSalidaId: true,
                    salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true,
                },
                orderBy: { fecha: 'asc' },
            }),
            prisma_1.prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
            prisma_1.prisma.tipoHora.findMany(),
            prisma_1.prisma.jornadaVigencia.findMany(),
            prisma_1.prisma.auxilioVigencia.findMany(),
            prisma_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
            prisma_1.prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: saldoTiempo_1.CLAVE_PERMISOS_REMUNERADOS } } }),
            // Solo las novedades que tocan el rango, con sus horas: una de parte del día no es un día.
            prisma_1.prisma.permiso.findMany({
                where: { colaborador: { empresaId }, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } },
                select: { colaboradorId: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true },
            }),
            prisma_1.prisma.diaEsperado.findMany({
                where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
                select: {
                    colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
                    horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
                    toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
                    descansos: true,
                    // Si ESE día era su descanso obligatorio. Sin esta columna el día llega al motor sin la
                    // respuesta congelada y el recargo dominical se recalcula con la declaración de HOY, que
                    // es justo lo que esta tabla existe para impedir (20 de septiembre de 2026).
                    esDescanso: true,
                },
                orderBy: { fecha: 'asc' },
            }),
            prisma_1.prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true, activa: true } }),
            (0, sedesDeEmpresa_1.sedesPorDefecto)(prisma_1.prisma, empresaId),
            (0, reportesDeEmpresa_1.filasParaLugares)(empresaId, desdeF, finExclusivo),
        ]);
        const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
        const festivosDates = festivos.map(f => new Date(f.fecha));
        const jornadaCierre = (0, vigencias_1.jornadaVigente)(new Date(hasta), jornadas);
        const horasMes = (0, vigencias_1.horasMesDeJornada)(jornadaCierre);
        const politica = (0, saldoTiempo_1.parsearPoliticaPermisos)(cfgPermisos?.valor);
        const porColaborador = (0, reportesDeEmpresa_1.agrupar)(registrosTodos);
        const porColDiasEsp = (0, reportesDeEmpresa_1.agrupar)(diasTodosEsp);
        const porColPermisos = (0, reportesDeEmpresa_1.agrupar)(permisosTodos);
        const porColLugares = (0, reportesDeEmpresa_1.agrupar)(filasDeLugar);
        // La vigencia del auxilio se elige con el ÚLTIMO INSTANTE del período, no con `new Date(hasta)`:
        // esa fecha es medianoche UTC, así que un reporte que termina el 1 de enero caería ANTES de las
        // 05:00 (medianoche de Bogotá) y pagaría con el decreto del año anterior.
        const vigenciaDelAuxilio = (0, auxilioTransporte_1.auxilioVigente)(new Date(finExclusivo.getTime() - 1), auxilios);
        const resultado = colaboradores.map(col => {
            const horario = col.horario;
            const dias = (0, diasEsperados_1.combinarDiasEsperados)(desdeF, finExclusivo, porColDiasEsp.get(col.id) ?? [], horario);
            const extraConfig = (0, tardanzas_1.construirExtraConfig)(modoExtra, horario, dias);
            // Solo las columnas que lee el motor de horas: las demás de la fila (colaborador, sedes) son
            // para saber dónde trabajó, y pasarlas enteras obligaba a un `as any`.
            const suyos = (porColaborador.get(col.id) ?? []).map(reg => ({
                id: reg.id, fecha: reg.fecha, entrada: reg.entrada, salida: reg.salida,
                salidaAlmuerzo: reg.salidaAlmuerzo, salidaDescanso: reg.salidaDescanso, descansoVentana: reg.descansoVentana,
            }));
            const r = (0, liquidarRegistros_1.liquidarRegistros)(suyos, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false, dias, (0, descansoDelHorario_1.fuenteDelDescansoDe)(col.horario));
            return {
                colaboradorId: col.id, cedula: col.cedula, numeroContrato: col.numeroContrato, nombre: col.nombre, apellido: col.apellido, cargo: col.cargo,
                salarioMensual: col.salarioMensual,
                valorHora: parseFloat((0, horasColombiana_1.calcularValorHora)(col.salarioMensual, horasMes).toFixed(2)),
                // El auxilio NO entra en el valor de la hora: se paga aparte y se prorratea por los días en
                // que la persona efectivamente viajó al trabajo, que son los que tienen marcación.
                auxilioTransporte: parseFloat((0, auxilioTransporte_1.auxilioDelPeriodo)({
                    salarioBasico: col.salarioMensual,
                    auxilioPersona: col.auxilioTransporte,
                    diasConDesplazamiento: r.diasCont,
                }, vigenciaDelAuxilio).toFixed(2)),
                registrosCont: r.registrosCont,
                diasCont: r.diasCont,
                minutosOrdinarios: r.minutosOrdinarios,
                liquidacion: r.liquidacion,
                totalRecargos: r.totalRecargos, totalExtra: r.totalExtra, totalAdicional: r.totalAdicional,
                novedades: (0, novedadesDelPeriodo_1.novedadesDelPeriodo)(porColPermisos.get(col.id) ?? [], desdeF, finExclusivo, politica),
                ...(0, sedesDeReporte_1.lugaresConAtribucion)(porColLugares.get(col.id) ?? [], { modalidad: col.modalidad, sedePorDefecto: defectoDe(col.id) }),
            };
        });
        return {
            desde, hasta, horasMes, jornadaSemanal: jornadaCierre,
            ...responderPorSede(resultado, ['totalRecargos', 'totalExtra', 'totalAdicional'], sedes, sedeId),
        };
    });
}
