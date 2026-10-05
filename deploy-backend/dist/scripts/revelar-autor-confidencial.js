"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../prisma");
const revelarConfidencial_1 = require("../utils/revelarConfidencial");
const cifradoConfidencial_1 = require("../utils/cifradoConfidencial");
// QUIÉN ESCRIBIÓ UNA OBSERVACIÓN CONFIDENCIAL DEL CLIMA LABORAL (4 de octubre de 2026).
//
// Decisión del dueño: no hay pantalla para esto. Es un comando que corre el super admin en el servidor,
// y SOLO con la orden de una autoridad (juez, Fiscalía, inspector de trabajo), nunca porque la empresa
// lo pida. Ver docs/CLIMA_LABORAL.md §3.4.
//
// Vive en `src/` y no en `prisma/` para que `tsc` lo compile a `dist/` y viaje al servidor: allá no hay
// ts-node. En el servidor, desde ~/horapro-co-api (el .env lo lee solo, con CLAVE_CONFIDENCIAL y
// DATABASE_URL) y con los límites de hilos de DESPLIEGUE.md §6.1, como todo lo que use Prisma:
//
//   1. Encontrar la nota (no descifra nada):
//      TOKIO_WORKER_THREADS=1 UV_THREADPOOL_SIZE=2 node dist/scripts/revelar-autor-confidencial.js buscar --nit 900123456 --texto "microondas"
//
//   2. Revelar a quién la escribió:
//      TOKIO_WORKER_THREADS=1 UV_THREADPOOL_SIZE=2 node dist/scripts/revelar-autor-confidencial.js revelar --nota <id> \
//        --motivo "Orden de la Fiscalía, radicado 2026-00123" --quien "Nombre de quien lo corre"
//
// La constancia (quién, por qué, qué nota) queda en el registro del sistema ANTES de mostrar el nombre:
// si no se puede dejar la constancia, no se revela.
async function buscar(nit, texto) {
    const empresa = await prisma_1.prisma.empresa.findUnique({ where: { nit }, select: { id: true, nombre: true } });
    if (!empresa)
        return console.log(`No hay ninguna empresa con el NIT ${nit}.`);
    const notas = await prisma_1.prisma.observacionConfidencial.findMany({
        where: { empresaId: empresa.id, texto: { contains: texto } },
        select: { id: true, semana: true, texto: true },
        take: 20,
    });
    console.log(`${empresa.nombre}: ${notas.length} nota(s) con «${texto}»${notas.length === 20 ? ' (se muestran las primeras 20)' : ''}\n`);
    for (const n of notas) {
        const semana = n.semana.toISOString().slice(0, 10);
        console.log(`  ${n.id}  semana del ${semana}\n    «${n.texto.slice(0, 160)}${n.texto.length > 160 ? '…' : ''}»\n`);
    }
}
async function revelar(notaId, motivo, quien) {
    const clave = (0, cifradoConfidencial_1.leerClave)(process.env.CLAVE_CONFIDENCIAL);
    if (!clave)
        throw new Error('Falta CLAVE_CONFIDENCIAL en el entorno. Carga el .env antes de correr el comando.');
    const nota = await prisma_1.prisma.observacionConfidencial.findUnique({
        where: { id: notaId },
        select: { id: true, autorCifrado: true, texto: true, empresa: { select: { id: true, nombre: true } } },
    });
    if (!nota)
        return console.log(`No existe la nota ${notaId}.`);
    const colaboradorId = (0, cifradoConfidencial_1.descifrar)(nota.autorCifrado, clave);
    await prisma_1.prisma.eventoSistema.create({
        data: {
            tipo: 'AUDITORIA',
            mensaje: 'Se reveló el autor de una observación confidencial del clima laboral',
            detalle: JSON.stringify({ nota: nota.id, motivo, quien }),
            usuarioNombre: quien,
            empresaId: nota.empresa.id,
            empresaNombre: nota.empresa.nombre,
        },
    });
    const persona = await prisma_1.prisma.colaborador.findUnique({
        where: { id: colaboradorId },
        select: { nombre: true, apellido: true, cedula: true, cargo: true, activo: true },
    });
    console.log(`Nota: «${nota.texto}»\nEmpresa: ${nota.empresa.nombre}\n`);
    if (!persona)
        return console.log(`La escribió la persona ${colaboradorId}, que ya no existe en la base.`);
    console.log(`La escribió: ${persona.nombre} ${persona.apellido}, cédula ${persona.cedula}`
        + `${persona.cargo ? `, ${persona.cargo}` : ''}${persona.activo ? '' : ' (hoy retirada)'}`);
    console.log('\nQuedó la constancia en el registro del sistema, pestaña Auditoría.');
}
async function main() {
    const orden = (0, revelarConfidencial_1.leerOrden)(process.argv.slice(2));
    if (!orden.ok) {
        console.error(orden.error);
        process.exitCode = 1;
        return;
    }
    if (orden.accion === 'buscar')
        await buscar(orden.nit, orden.texto);
    else
        await revelar(orden.nota, orden.motivo, orden.quien);
}
main()
    .catch(err => { console.error('FALLÓ:', err instanceof Error ? err.message : err); process.exitCode = 1; })
    .finally(() => prisma_1.prisma.$disconnect());
