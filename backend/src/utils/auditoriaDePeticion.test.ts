import { describe, it, expect } from 'vitest';
import { seAudita, accionDePeticion, cuerpoParaGuardar, detalleSinDatosDePersonas, NO_SE_GUARDA } from './auditoriaDePeticion';

// Qué queda registrado como "fulano hizo esto" y, sobre todo, qué NO.

describe('seAudita', () => {
  it('solo lo que cambia datos: mirar una pantalla no es una acción', () => {
    expect(seAudita('GET', '/api/colaboradores', 200)).toBe(false);
    expect(seAudita('HEAD', '/api/colaboradores', 200)).toBe(false);
    expect(seAudita('OPTIONS', '/api/colaboradores', 204)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 200)).toBe(true);
    expect(seAudita('PUT', '/api/colaboradores/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('PATCH', '/api/registros/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('DELETE', '/api/colaboradores/ckv123abc456def789ghi012j', 200)).toBe(true);
  });

  it('solo lo que salió bien: lo que falló ya queda en Errores o en Accesos', () => {
    expect(seAudita('POST', '/api/colaboradores', 400)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 401)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 500)).toBe(false);
    expect(seAudita('POST', '/api/colaboradores', 201)).toBe(true);
  });

  it('el kiosco queda fuera: son cientos de marcaciones al día y ya quedan en su propia tabla', () => {
    expect(seAudita('POST', '/api/worker/marcar', 200)).toBe(false);
    expect(seAudita('POST', '/api/worker/login', 200)).toBe(false);
    expect(seAudita('POST', '/api/worker/novedad', 200)).toBe(false);
    expect(seAudita('POST', '/api/registro-facial/abc123def456/registrar', 200)).toBe(false);
  });

  it('el login de la plataforma queda fuera: va a Accesos, no a Auditoría', () => {
    expect(seAudita('POST', '/api/auth/login', 200)).toBe(false);
  });

  it('el propio registro queda fuera, o borrar el registro escribiría en el registro', () => {
    expect(seAudita('POST', '/api/eventos/navegador', 204)).toBe(false);
    expect(seAudita('DELETE', '/api/admin/eventos', 200)).toBe(false);
  });

  it('el webhook de Telegram es ruido; el de Wompi mueve dinero y se audita', () => {
    expect(seAudita('POST', '/api/telegram/webhook', 200)).toBe(false);
    expect(seAudita('POST', '/api/wompi/webhook', 200)).toBe(true);
  });

  it('lo que de verdad se quiere vigilar sí entra', () => {
    expect(seAudita('DELETE', '/api/admin/empresas/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('PUT', '/api/colaboradores/ckv123abc456def789ghi012j', 200)).toBe(true);
    expect(seAudita('PUT', '/api/admin/configuracion', 200)).toBe(true);
    expect(seAudita('PUT', '/api/registros/ckv123abc456def789ghi012j', 200)).toBe(true);
  });
});

describe('accionDePeticion', () => {
  it('dice en castellano qué se hizo', () => {
    expect(accionDePeticion('POST', '/api/colaboradores')).toBe('Creó un colaborador');
    expect(accionDePeticion('PUT', '/api/colaboradores/ckv123abc456def789ghi012j')).toBe('Editó un colaborador');
    expect(accionDePeticion('DELETE', '/api/admin/empresas/ckv123abc456def789ghi012j')).toBe('Borró una empresa');
  });

  it('el clima laboral: los motivos, los casos de seguimiento y sus comentarios, cada uno por su nombre', () => {
    expect(accionDePeticion('PUT', '/api/clima/motivos')).toBe('Editó los motivos del clima laboral');
    expect(accionDePeticion('PATCH', '/api/clima/seguimientos/ckv123abc456def789ghi012j')).toBe('Editó un caso de seguimiento');
    expect(accionDePeticion('POST', '/api/clima/seguimientos/ckv123abc456def789ghi012j/comentarios')).toBe('Creó un comentario de seguimiento');
    expect(accionDePeticion('PUT', '/api/clima/seguimientos/ckv123abc456def789ghi012j/comentarios/ckv999abc456def789ghi012j')).toBe('Editó un comentario de seguimiento');
    expect(accionDePeticion('DELETE', '/api/clima/seguimientos/ckv123abc456def789ghi012j/comentarios/ckv999abc456def789ghi012j')).toBe('Borró un comentario de seguimiento');
  });

  it('las caritas del kiosco NO se auditan: el cuerpo llevaría el texto confidencial', () => {
    expect(seAudita('PUT', '/api/worker/clima', 200)).toBe(false);
    expect(seAudita('POST', '/api/worker/clima/observacion', 200)).toBe(false);
  });

  it('la reseña que envía una empresa NO se audita: copiaría su nombre y su texto a un registro que «Quitar el nombre» no alcanza', () => {
    expect(seAudita('POST', '/api/resenas', 201)).toBe(false);
    expect(seAudita('POST', '/api/resenas/', 201)).toBe(false);
    // Lo del super admin sí: es quien publica, y R24 pide que cada acción quede.
    expect(seAudita('POST', '/api/admin/resenas', 201)).toBe(true);
    expect(seAudita('PUT', '/api/admin/resenas/ckv123abc456def789ghi012j/estado', 200)).toBe(true);
    expect(seAudita('POST', '/api/admin/resenas/ckv123abc456def789ghi012j/quitar-nombre', 200)).toBe(true);
  });

  it('las reseñas del super admin se dicen con su nombre, no con la ruta (R24)', () => {
    const ID = 'ckv123abc456def789ghi012j';
    expect(accionDePeticion('POST', '/api/admin/resenas')).toBe('Creó una reseña');
    expect(accionDePeticion('PUT', `/api/admin/resenas/${ID}`)).toBe('Editó una reseña');
    // Con el método solo, quitar el nombre sería «Creó una reseña», que dice lo contrario de lo que pasó.
    expect(accionDePeticion('POST', `/api/admin/resenas/${ID}/quitar-nombre`)).toBe('Quitó el nombre de una reseña');
  });

  it('el cambio de estado de una reseña dice cuál, leyendo el cuerpo', () => {
    const ruta = '/api/admin/resenas/ckv123abc456def789ghi012j/estado';
    expect(accionDePeticion('PUT', ruta, { estado: 'PUBLICADA' })).toBe('Publicó una reseña');
    expect(accionDePeticion('PUT', ruta, { estado: 'OCULTA' })).toBe('Ocultó una reseña');
    expect(accionDePeticion('PUT', ruta, { estado: 'ARCHIVADA' })).toBe('Archivó una reseña');
    expect(accionDePeticion('PUT', ruta, { estado: 'POR_REVISAR' })).toBe('Devolvió a revisión una reseña');
    // Sin cuerpo, o con uno que no dice nada, se dice lo que se sabe y no se inventa el estado.
    for (const cuerpo of [undefined, null, {}, { estado: 'BORRADA' }, { estado: 3 }, 'PUBLICADA', { estado: 'toString' }]) {
      expect(accionDePeticion('PUT', ruta, cuerpo), JSON.stringify(cuerpo)).toBe('Cambió el estado de una reseña');
    }
  });

  it('el cuerpo solo cambia el texto de las rutas que lo leen', () => {
    expect(accionDePeticion('PUT', '/api/colaboradores/ckv123abc456def789ghi012j', { estado: 'PUBLICADA' })).toBe('Editó un colaborador');
  });

  it('una ruta que nadie tradujo sale tal cual, no como un texto inventado', () => {
    expect(accionDePeticion('POST', '/api/algo-nuevo/ckv123abc456def789ghi012j')).toBe('POST /api/algo-nuevo/:id');
  });
});

// Las rutas cuyo cuerpo es de la empresa guardan sus valores, limpios (ver el bloque de abajo para las demás).
describe('cuerpoParaGuardar, en las rutas que guardan sus valores', () => {
  it('la contraseña NUNCA se guarda, venga con el nombre que venga', () => {
    const guardado = cuerpoParaGuardar({
      email: 'ana@empresa.co',
      password: 'LaClaveDeAna123',
      passwordActual: 'anterior',
      nuevaPassword: 'siguiente',
    }, '/api/auth/usuarios/u1');
    expect(guardado).not.toContain('LaClaveDeAna123');
    expect(guardado).not.toContain('anterior');
    expect(guardado).not.toContain('siguiente');
    expect(guardado).toContain('ana@empresa.co');
  });

  it('tampoco los tokens, los códigos de verificación ni las firmas', () => {
    const guardado = cuerpoParaGuardar({
      marcadorToken: 'tok_secreto_del_kiosco',
      deviceToken: 'dispositivo_abc',
      resetToken: 'reset_xyz',
      verificacionCodigo: '482913',
      firma: 'sha256=abcdef',
    }, '/api/configuracion');
    expect(guardado).not.toContain('tok_secreto_del_kiosco');
    expect(guardado).not.toContain('dispositivo_abc');
    expect(guardado).not.toContain('reset_xyz');
    expect(guardado).not.toContain('482913');
    expect(guardado).not.toContain('sha256=abcdef');
  });

  it('una foto no se guarda entera: se deja constancia de su tamaño', () => {
    const foto = 'data:image/jpeg;base64,' + 'A'.repeat(90000);
    const guardado = cuerpoParaGuardar({ nombre: 'Ana', fotoEntrada: foto }, '/api/configuracion/empresa');
    expect(guardado).not.toContain('AAAAAAAAAA');
    expect(guardado).toContain('Ana');
    expect(guardado).toMatch(/KB/);
  });

  it('el base64 sin encabezado también se reconoce', () => {
    const guardado = cuerpoParaGuardar({ comprobante: 'iVBORw0KGgo' + 'B'.repeat(3000) }, '/api/admin/empresas/e1/pagos');
    expect(guardado).not.toContain('BBBBBBBBBB');
    expect(guardado).toMatch(/KB/);
  });

  it('un cuerpo enorme se recorta, para que una petición no se coma la tabla', () => {
    const guardado = cuerpoParaGuardar({ notas: Array.from({ length: 400 }, (_, i) => `nota numero ${i}`) }, '/api/configuracion');
    expect(guardado.length).toBeLessThanOrEqual(4000);
  });

  it('lo que no es un objeto no revienta', () => {
    expect(cuerpoParaGuardar(undefined, '/api/configuracion')).toBe('');
    expect(cuerpoParaGuardar(null, '/api/configuracion')).toBe('');
    expect(cuerpoParaGuardar('texto suelto', '/api/configuracion')).toBe('texto suelto');
  });

  // R23: «Quitar el nombre» limpia la fila de `resenas`, pero no llega a este registro, que no se
  // borra. Así que el nombre, el cargo y lo que dice dónde quedó y cómo autorizó (que suele traer un
  // teléfono o un chat) no se copian aquí nunca. Lo demás sí, para que se lea qué se hizo.
  it('de una reseña cargada a mano no quedan el nombre, el cargo, dónde quedó ni cómo autorizó', () => {
    const guardado = cuerpoParaGuardar({
      estrellas: 5,
      texto: 'Liquidar la nómina nos tomaba dos días.',
      nombrePublico: 'Carolina Calle',
      cargoPublico: 'CEO Tuercas & Pernos',
      canal: 'WhatsApp',
      referencia: 'chat con Carolina, 300 123 4567',
      autorizacion: 'Carolina dijo que sí por WhatsApp',
      fechaOpinion: '2026-07-19',
    }, '/api/admin/resenas');
    expect(guardado).not.toContain('Carolina');
    expect(guardado).not.toContain('Tuercas');
    expect(guardado).not.toContain('300 123 4567');
    expect(guardado).toContain('WhatsApp');
    expect(guardado).toContain('2026-07-19');
  });

  it('los objetos anidados también se limpian', () => {
    const guardado = cuerpoParaGuardar({ usuario: { email: 'ana@empresa.co', password: 'LaClaveDeAna123' } }, '/api/auth/usuarios');
    expect(guardado).not.toContain('LaClaveDeAna123');
    expect(guardado).toContain('ana@empresa.co');
  });
});

// LOS DATOS DE LAS PERSONAS NO SE COPIAN A LA AUDITORÍA (14 de octubre de 2026). Decisión del dueño, opción A de
// POLITICA-PRIVACIDAD-1.3-para-abogado.md §0: la auditoría dice quién hizo qué y sobre cuál registro, sin los datos.
// La política promete que HoraPro no tiene ninguna pantalla para ver los datos de los trabajadores de sus clientes, y
// este registro, que el super admin ve y que no se borra, guardaba el cuerpo entero (cédula, salario, novedades).
describe('cuerpoParaGuardar: los datos de las personas no se copian', () => {
  const ana = {
    nombre: 'Ana', apellido: 'Restrepo', cedula: '1036998877', cargo: 'Cajera', email: 'ana@correo.co', telefono: '3001234567',
    fechaNacimiento: '1990-05-04', salarioMensual: 2345678, activo: false, sedeIds: ['sede-1', 'sede-2'], horarioId: 'horario-9',
  };

  it('de la ficha de un colaborador quedan los campos que se enviaron, sin sus valores', () => {
    const g = cuerpoParaGuardar(ana, '/api/colaboradores/col-1');
    for (const dato of ['Ana', 'Restrepo', '1036998877', 'Cajera', 'ana@correo.co', '3001234567', '1990-05-04', '2345678', 'false']) {
      expect(g).not.toContain(dato);
    }
    expect(JSON.parse(g)).toMatchObject({ nombre: NO_SE_GUARDA, cedula: NO_SE_GUARDA, salarioMensual: NO_SE_GUARDA });
  });

  it('los ids sí quedan: dicen sobre cuál registro y no son datos de nadie', () => {
    const g = JSON.parse(cuerpoParaGuardar(ana, '/api/colaboradores/col-1'));
    expect(g.sedeIds).toEqual(['sede-1', 'sede-2']);
    expect(g.horarioId).toBe('horario-9');
  });

  it('un campo que se llama como un id pero trae un texto largo no es un id, y no queda', () => {
    const g = JSON.parse(cuerpoParaGuardar({ notaId: 'Me dejaron sola en el cierre '.repeat(3) }, '/api/colaboradores/col-1'));
    expect(g.notaId).toBe(NO_SE_GUARDA);
  });

  it('de una novedad no quedan ni el tipo ni la descripción, que pueden ser de salud', () => {
    const g = cuerpoParaGuardar({ colaboradorId: 'col-1', tipo: 'INCAPACIDAD_EPS', descripcion: 'Gastritis aguda', fechaInicio: '2026-10-01' }, '/api/permisos');
    expect(g).not.toContain('INCAPACIDAD');
    expect(g).not.toContain('Gastritis');
    expect(g).not.toContain('2026-10-01');
    expect(JSON.parse(g).colaboradorId).toBe('col-1');
  });

  it('de un comentario del seguimiento del clima no queda el texto', () => {
    const g = cuerpoParaGuardar({ texto: 'Hablé con ella, está pasando por un divorcio' }, '/api/clima/seguimientos/s1/comentarios');
    expect(g).not.toContain('divorcio');
  });

  it('lo de adentro tampoco: un objeto o una lista anidados guardan su forma, no sus valores', () => {
    const g = JSON.parse(cuerpoParaGuardar({ turnos: [{ colaboradorId: 'col-1', inicio: '08:00' }] }, '/api/turnos'));
    expect(g).toEqual({ turnos: [{ colaboradorId: 'col-1', inicio: NO_SE_GUARDA }] });
  });

  it('el aviso de pago de Wompi tampoco: trae el correo de quien pagó', () => {
    const g = cuerpoParaGuardar({ event: 'transaction.updated', data: { transaction: { id: 'tx-1', customer_email: 'pagador@correo.co' } } }, '/api/wompi/eventos');
    expect(g).not.toContain('pagador@correo.co');
    expect(JSON.parse(g).data.transaction.id).toBe('tx-1');
  });

  it('una ruta que nadie clasificó guarda solo los campos: la que se escriba mañana nace protegida', () => {
    const g = cuerpoParaGuardar({ nombre: 'Ana', cedula: '1036998877' }, '/api/ruta-nueva');
    expect(g).not.toContain('Ana');
    expect(g).not.toContain('1036998877');
  });

  it('un texto suelto, en una ruta con datos de personas, tampoco', () => {
    expect(cuerpoParaGuardar('Ana Restrepo 1036998877', '/api/colaboradores/importar')).toBe('(texto de 23 caracteres; no se guarda)');
  });

  it('lo que es de la empresa sí guarda sus valores: una sede, un horario, la configuración', () => {
    expect(cuerpoParaGuardar({ nombre: 'Bodega Norte', radio: 150 }, '/api/sedes/s1')).toContain('Bodega Norte');
    expect(cuerpoParaGuardar({ toleranciaMin: 10 }, '/api/horarios')).toContain('10');
    expect(cuerpoParaGuardar({ TELEGRAM_ALERTAS_TARDE: '1' }, '/api/configuracion')).toContain('"1"');
  });

  it('y el rol que se le puso a un usuario sí queda: es lo que delata una escalada', () => {
    expect(cuerpoParaGuardar({ rol: 'SUPER_ADMIN' }, '/api/auth/usuarios/u1')).toContain('SUPER_ADMIN');
  });
});

// LAS FILAS QUE YA ESTABAN GUARDADAS. El comando `limpiar-auditoria` (src/scripts) les aplica la misma regla; esto
// decide qué le pasa a cada una. null = la fila no cambia.
describe('detalleSinDatosDePersonas: las filas viejas', () => {
  const ana = { nombre: 'Ana', cedula: '1036998877', sedeIds: ['sede-1'] };

  it('una fila vieja de un colaborador queda igual que si se guardara hoy', () => {
    expect(detalleSinDatosDePersonas(JSON.stringify(ana), '/api/colaboradores/col-1')).toBe(cuerpoParaGuardar(ana, '/api/colaboradores/col-1'));
  });

  it('la de una ruta de la empresa no cambia', () => {
    expect(detalleSinDatosDePersonas('{"nombre":"Bodega Norte"}', '/api/sedes/s1')).toBeNull();
  });

  it('una fila recortada, que no se puede leer, se reemplaza entera', () => {
    expect(detalleSinDatosDePersonas('{"nombre":"Ana","cedula":"10369', '/api/colaboradores/col-1')).toBe('(no se guarda: el detalle venía recortado)');
  });

  it('un texto suelto viejo, en una ruta con datos de personas, se reemplaza', () => {
    expect(detalleSinDatosDePersonas('Ana Restrepo 1036998877', '/api/colaboradores/importar')).toBe('(texto de 23 caracteres; no se guarda)');
  });

  it('sin detalle no cambia, y una fila ya limpia tampoco: correr el comando dos veces no hace nada', () => {
    expect(detalleSinDatosDePersonas(null, '/api/colaboradores/col-1')).toBeNull();
    expect(detalleSinDatosDePersonas('', '/api/colaboradores/col-1')).toBeNull();
    expect(detalleSinDatosDePersonas(cuerpoParaGuardar(ana, '/api/colaboradores/col-1'), '/api/colaboradores/col-1')).toBeNull();
  });

  it('un reemplazo de antes tampoco cambia al limpiar otra vez', () => {
    expect(detalleSinDatosDePersonas('(texto de 23 caracteres; no se guarda)', '/api/colaboradores/importar')).toBeNull();
    expect(detalleSinDatosDePersonas('(no se guarda: el detalle venía recortado)', '/api/colaboradores/col-1')).toBeNull();
  });
});
