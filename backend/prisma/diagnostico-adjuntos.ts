// Qué pasaría con los adjuntos QUE YA ESTÁN GUARDADOS si se volvieran a subir
// hoy, con la validación nueva.
//
// SOLO LEE. No escribe ni borra nada. Es la comprobación diferencial que pide
// la sección 5.3 del CLAUDE.md, aplicada al único riesgo real de este cambio:
// que una regla más estricta deje fuera archivos que llevan meses en la base.
//
// Lo que responde, y por qué importa cada cosa:
//
//  - Un adjunto que hoy NO pasaría no desaparece ni se rompe. Ninguna ruta GET
//    valida (se comprobó), así que se sigue viendo y descargando igual. Lo que
//    significa es que, si alguien EDITA ese registro y reenvía el mismo
//    archivo, ahora recibiría un 400. Para los formularios del producto eso no
//    ocurre (solo mandan el documento cuando se adjunta uno nuevo), pero es la
//    lista de casos a mirar si alguien reporta algo raro.
//  - Los dos comprobantes se listan aparte porque son los que nunca tuvieron
//    ninguna regla: ahí puede haber cualquier cosa, y por eso el código
//    conserva el valor guardado sin volver a validarlo.
//
//   cd backend && npx tsx prisma/diagnostico-adjuntos.ts

import { PrismaClient } from '@prisma/client';
import { documentoValido, MAX_DOC } from '../src/utils/documentos';

const prisma = new PrismaClient();

// El MIME que declara el data URI. Se corta largo a propósito: el de Word mide
// 71 caracteres, así que una cabeza de 64 lo dejaría fuera y todo .docx
// aparecería como ilegible.
const CABEZA = 200;

function describir(dato: string | null): { mime: string; pasa: boolean; largo: number } {
  if (!dato) return { mime: '(vacío)', pasa: true, largo: 0 };
  const cabeza = dato.slice(0, CABEZA);
  const corte = cabeza.indexOf(';base64,');
  return {
    mime: corte > 5 ? cabeza.slice(5, corte) : '(no es un data URI)',
    pasa: documentoValido(dato),
    largo: dato.length,
  };
}

async function revisar(
  titulo: string,
  filas: { id: string; dato: string | null; nombre?: string | null }[],
  seValida: boolean,
) {
  const conDato = filas.filter(f => f.dato);
  const malos = conDato.filter(f => !describir(f.dato).pasa);
  const porMime = new Map<string, number>();
  for (const f of conDato) {
    const m = describir(f.dato).mime;
    porMime.set(m, (porMime.get(m) ?? 0) + 1);
  }

  console.log(`\n── ${titulo} ──`);
  console.log(`   ${conDato.length} con adjunto, de ${filas.length} filas`);
  for (const [mime, n] of [...porMime].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${n.toString().padStart(4)}  ${mime}`);
  }
  if (!seValida) {
    console.log('   (esta columna nunca tuvo validación y el valor guardado se conserva sin revalidar)');
  }
  if (malos.length === 0) {
    console.log('   ✓ todos pasarían la validación nueva');
  } else {
    console.log(`   ⚠ ${malos.length} NO pasarían si se reenviaran:`);
    for (const f of malos.slice(0, 10)) {
      const d = describir(f.dato);
      const causa = d.largo >= MAX_DOC ? `pesa ${d.largo} (tope ${MAX_DOC})` : 'formato o firma de bytes';
      console.log(`     ${f.id}  ${d.mime}  ${f.nombre ?? ''}  ← ${causa}`);
    }
    if (malos.length > 10) console.log(`     ... y ${malos.length - 10} más`);
  }
}

async function main() {
  const [permisos, contratos, prorrogas, eventos, pagos, retiros] = await Promise.all([
    prisma.permiso.findMany({ select: { id: true, evidencia: true, evidenciaNombre: true } }),
    prisma.contrato.findMany({ select: { id: true, documento: true, documentoNombre: true } }),
    prisma.prorrogaContrato.findMany({ select: { id: true, documento: true, documentoNombre: true } }),
    prisma.vinculacionEvento.findMany({ select: { id: true, documento: true, documentoNombre: true } }),
    prisma.pago.findMany({ select: { id: true, comprobanteBase64: true } }),
    prisma.solicitudRetiro.findMany({ select: { id: true, comprobanteBase64: true } }),
  ]);

  console.log('ADJUNTOS YA GUARDADOS, contra la validación nueva. Solo lectura.');

  await revisar('Evidencia de novedades', permisos.map(p => ({ id: p.id, dato: p.evidencia, nombre: p.evidenciaNombre })), true);
  await revisar('Contratos', contratos.map(c => ({ id: c.id, dato: c.documento, nombre: c.documentoNombre })), true);
  await revisar('Prórrogas', prorrogas.map(c => ({ id: c.id, dato: c.documento, nombre: c.documentoNombre })), true);
  await revisar('Soportes de vinculación y retiro', eventos.map(e => ({ id: e.id, dato: e.documento, nombre: e.documentoNombre })), true);
  await revisar('Comprobantes de pago de empresa', pagos.map(p => ({ id: p.id, dato: p.comprobanteBase64 })), false);
  await revisar('Comprobantes de retiro de afiliado', retiros.map(r => ({ id: r.id, dato: r.comprobanteBase64 })), false);

  console.log('\nRecordatorio: ninguna ruta GET valida, así que nada de lo listado');
  console.log('arriba deja de verse ni de descargarse. Un ⚠ significa que ESE');
  console.log('registro daría 400 si alguien reenviara el mismo archivo al editarlo.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
