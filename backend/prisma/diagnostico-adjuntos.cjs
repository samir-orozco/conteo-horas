/**
 * ¿Algún adjunto YA GUARDADO dejaría de pasar con la validación nueva?
 *
 * Es la comprobación diferencial de la sección 5.3 del CLAUDE.md aplicada al
 * único riesgo real del cambio de validación de archivos: que una regla más
 * estricta deje fuera archivos que llevan meses en la base.
 *
 * SOLO LEE. No escribe ni borra nada.
 *
 * Usa los validadores REALES del dist recién desplegado, no una copia. Si esta
 * copia divergiera de la de verdad, el diagnóstico mentiría, que es justo lo que
 * no se quiere de un script de comprobación.
 *
 * Cómo leer el resultado:
 *  - Un ⚠ NO significa que el archivo se rompa ni desaparezca. Ninguna ruta GET
 *    valida, así que se sigue viendo y descargando igual. Significa que ESE
 *    registro daría 400 si alguien reenviara el mismo archivo al editarlo. Los
 *    formularios del producto no reenvían adjuntos guardados, así que no debería
 *    pasar, pero es la lista a mirar si alguien reporta algo raro.
 *  - Los dos comprobantes van aparte porque nunca tuvieron ninguna regla: ahí
 *    puede haber cualquier cosa, y el código conserva el valor guardado sin
 *    volver a validarlo justamente por eso.
 *
 * [EN EL SERVIDOR]
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cp ~/horapro-repo/deploy-backend/diagnostico-adjuntos.cjs ~/horapro-co-api/
 *   cd ~/horapro-co-api && set -a && . ./.env && set +a && node diagnostico-adjuntos.cjs
 */
const { PrismaClient } = require('@prisma/client');
const { documentoValido, MAX_DOC } = require('./dist/utils/documentos');
const { fotoPerfilValida, miniValida } = require('./dist/utils/fotoPerfil');

const prisma = new PrismaClient();

// Se corta largo a propósito: el MIME de Word mide 71 caracteres, así que una
// cabeza más corta lo dejaría fuera y todo .docx saldría como ilegible.
const CABEZA = 200;

function describir(dato, valida) {
  if (!dato) return { mime: '(vacío)', pasa: true, largo: 0 };
  const cabeza = dato.slice(0, CABEZA);
  const corte = cabeza.indexOf(';base64,');
  return {
    mime: corte > 5 ? cabeza.slice(5, corte) : '(no es un data URI)',
    pasa: valida(dato),
    largo: dato.length,
  };
}

function revisar(titulo, filas, seValida, valida) {
  const conDato = filas.filter(f => f.dato);
  const malos = conDato.filter(f => !describir(f.dato, valida).pasa);
  const porMime = new Map();
  for (const f of conDato) {
    const m = describir(f.dato, valida).mime;
    porMime.set(m, (porMime.get(m) || 0) + 1);
  }

  console.log(`\n── ${titulo} ──`);
  console.log(`   ${conDato.length} con adjunto, de ${filas.length} filas`);
  for (const [mime, n] of [...porMime].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)}  ${mime}`);
  }
  if (!seValida) {
    console.log('   (esta columna nunca tuvo validación; el valor guardado se conserva sin revalidar)');
  }
  if (malos.length === 0) {
    console.log('   OK: todos pasarían la validación nueva');
  } else {
    console.log(`   AVISO: ${malos.length} NO pasarían si se reenviaran:`);
    for (const f of malos.slice(0, 10)) {
      const d = describir(f.dato, valida);
      const causa = d.largo >= MAX_DOC ? `pesa ${d.largo} (tope ${MAX_DOC})` : 'formato o firma de bytes';
      console.log(`     ${f.id}  ${d.mime}  ${f.nombre || ''}  <- ${causa}`);
    }
    if (malos.length > 10) console.log(`     ... y ${malos.length - 10} más`);
  }
}

async function main() {
  const [permisos, contratos, prorrogas, eventos, pagos, retiros, colaboradores] = await Promise.all([
    prisma.permiso.findMany({ select: { id: true, evidencia: true, evidenciaNombre: true } }),
    prisma.contrato.findMany({ select: { id: true, documento: true, documentoNombre: true } }),
    prisma.prorrogaContrato.findMany({ select: { id: true, documento: true, documentoNombre: true } }),
    prisma.vinculacionEvento.findMany({ select: { id: true, documento: true, documentoNombre: true } }),
    prisma.pago.findMany({ select: { id: true, comprobanteBase64: true } }),
    prisma.solicitudRetiro.findMany({ select: { id: true, comprobanteBase64: true } }),
    prisma.colaborador.findMany({ select: { id: true, foto: true, fotoMini: true, nombre: true } }),
  ]);

  console.log('ADJUNTOS YA GUARDADOS, contra la validación nueva. Solo lectura.');

  revisar('Evidencia de novedades', permisos.map(p => ({ id: p.id, dato: p.evidencia, nombre: p.evidenciaNombre })), true, documentoValido);
  revisar('Contratos', contratos.map(c => ({ id: c.id, dato: c.documento, nombre: c.documentoNombre })), true, documentoValido);
  revisar('Prórrogas', prorrogas.map(c => ({ id: c.id, dato: c.documento, nombre: c.documentoNombre })), true, documentoValido);
  revisar('Soportes de vinculación y retiro', eventos.map(e => ({ id: e.id, dato: e.documento, nombre: e.documentoNombre })), true, documentoValido);
  revisar('Comprobantes de pago de empresa', pagos.map(p => ({ id: p.id, dato: p.comprobanteBase64 })), false, documentoValido);
  revisar('Comprobantes de retiro de afiliado', retiros.map(r => ({ id: r.id, dato: r.comprobanteBase64 })), false, documentoValido);

  // Las fotos usan su propio validador: son más estrictas (no aceptan PDF ni
  // Word) y tienen sus propios topes.
  revisar('Fotos de perfil', colaboradores.map(c => ({ id: c.id, dato: c.foto, nombre: c.nombre })), true, fotoPerfilValida);
  revisar('Miniaturas de las listas', colaboradores.map(c => ({ id: c.id, dato: c.fotoMini, nombre: c.nombre })), true, miniValida);

  console.log('\nUn AVISO no rompe nada: ninguna ruta GET valida, así que todo lo');
  console.log('listado se sigue viendo y descargando. Solo dice qué registro daría');
  console.log('400 si alguien reenviara ese mismo archivo al editarlo.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
