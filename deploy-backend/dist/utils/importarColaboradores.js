"use strict";
// Carga masiva de colaboradores desde el formato de Excel.
//
// La validación vive aquí, en el servidor, y NO en el navegador. La pantalla la
// usa en seco (soloValidar) para pintar la vista previa, pero quien decide es
// este archivo: un formulario se puede saltar, una ruta no.
//
// Todo se valida antes de crear nada. Con 40 filas y un error en la 37, crear
// las 36 primeras deja a la empresa sin saber qué quedó y qué no.
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLUMNAS_FORMATO = void 0;
exports.validarImportacion = validarImportacion;
// Las columnas del archivo, en orden. Es la misma lista que genera el formato
// que se descarga, para que el que se baja y el que se valida no se separen.
exports.COLUMNAS_FORMATO = [
    { clave: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana María' },
    { clave: 'apellido', titulo: 'Apellido', obligatoria: true, ejemplo: 'Gómez Ruiz' },
    { clave: 'cedula', titulo: 'Cédula', obligatoria: true, ejemplo: '1020304050', ayuda: 'Solo números, sin puntos' },
    { clave: 'cargo', titulo: 'Cargo', obligatoria: false, ejemplo: 'Vigilante' },
    { clave: 'salarioMensual', titulo: 'Salario mensual', obligatoria: true, ejemplo: '1750905', ayuda: 'En pesos, sin centavos', tipo: 'dinero' },
    { clave: 'email', titulo: 'Correo', obligatoria: false, ejemplo: 'ana@empresa.co' },
    { clave: 'telefono', titulo: 'Teléfono', obligatoria: false, ejemplo: '3001234567' },
    { clave: 'fechaNacimiento', titulo: 'Fecha de nacimiento', obligatoria: false, ejemplo: '1990-05-20', ayuda: 'Día/mes/año. Se acomoda sola al leerla.', tipo: 'fecha' },
];
// El horario NO va en el archivo: se elige en la tabla de la pantalla, de una
// lista. Escribirlo a mano obligaba a copiar el nombre exacto de un horario, y
// un dedazo dejaba la fila entera en error por algo que se resuelve con un
// clic. Llega por su id, junto al resto de la fila.
const CLAVE_HORARIO = 'horarioId';
const CLAVE_SEDE = 'sedeId';
const texto = (v) => (v === null || v === undefined ? '' : String(v).trim());
// El salario tal como lo escribe la gente: con puntos de miles, con signo, o ya
// como número si Excel lo guardó así.
function aPesos(v) {
    if (typeof v === 'number')
        return Number.isFinite(v) ? Math.round(v) : null;
    const limpio = texto(v).replace(/[$\s.]/g, '').replace(',', '.');
    if (!limpio || !/^-?\d+(\.\d+)?$/.test(limpio))
        return null;
    return Math.round(Number(limpio));
}
// Una fecha real, no solo con forma de fecha: "1990-13-45" tiene la forma.
function esFechaReal(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
        return false;
    const [a, m, d] = s.split('-').map(Number);
    const fecha = new Date(Date.UTC(a, m - 1, d));
    return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validarImportacion(filas, ctx) {
    const validas = [];
    const errores = [];
    const cedulasVistas = new Map();
    let conDatos = 0;
    filas.forEach((cruda, i) => {
        // La fila 1 de la hoja es el encabezado, así que la primera de datos es la
        // 2. Reportar "fila 1" manda a corregir los títulos.
        const nFila = i + 2;
        const v = (clave) => texto(cruda[clave]);
        // Excel arrastra filas vacías al final. Una fila sin nada no es un error,
        // es el final del archivo.
        // Se mira solo lo que viene del ARCHIVO. El horario y la sede se eligen en
        // la pantalla, y el selector global los pone en todas las filas: si contaran
        // aquí, una fila vacía del final pasaría a reportarse como una persona sin
        // nombre y sin cédula.
        const vacia = exports.COLUMNAS_FORMATO.every(c => v(c.clave) === '');
        if (vacia)
            return;
        conDatos++;
        // Se cuentan los errores de ESTA fila: si tiene alguno, no entra en las
        // válidas. "validas" es lo que el endpoint crea, así que una fila rota ahí
        // dentro es un colaborador sin salario o con una cédula que no lo es.
        let rota = false;
        const err = (campo, mensaje) => {
            rota = true;
            errores.push({ fila: nFila, campo, mensaje });
        };
        const nombre = v('nombre');
        const apellido = v('apellido');
        const cedula = v('cedula');
        if (!nombre)
            err('nombre', 'Falta el nombre.');
        if (!apellido)
            err('apellido', 'Falta el apellido.');
        if (!cedula)
            err('cedula', 'Falta la cédula.');
        else if (!/^\d+$/.test(cedula))
            err('cedula', `"${cedula}" no es una cédula: solo números, sin puntos ni letras.`);
        else if (ctx.cedulasActivas.has(cedula))
            err('cedula', `La cédula ${cedula} ya está registrada en tu empresa.`);
        else if (ctx.cedulasRetiradas.has(cedula))
            err('cedula', `La cédula ${cedula} es de alguien retirado. Para que vuelva, usa Reingresar en la pestaña de retirados: así conserva su historial.`);
        else if (cedulasVistas.has(cedula))
            err('cedula', `Cédula repetida: ya viene en la fila ${cedulasVistas.get(cedula)}.`);
        else
            cedulasVistas.set(cedula, nFila);
        const salario = aPesos(cruda['salarioMensual']);
        if (salario === null)
            err('salarioMensual', 'Falta el salario, o no es un número.');
        else if (salario <= 0)
            err('salarioMensual', 'El salario tiene que ser mayor que cero.');
        const email = v('email');
        if (email && !CORREO.test(email))
            err('email', `"${email}" no parece un correo.`);
        const nacimiento = v('fechaNacimiento');
        if (nacimiento && !esFechaReal(nacimiento)) {
            // No dice "escríbela como AAAA-MM-DD" porque ya no se escribe: en la
            // tabla es un calendario. Lo que hay que hacer es elegirla ahí.
            err('fechaNacimiento', `"${nacimiento}" no es una fecha. Elígela en el calendario de esa columna.`);
        }
        // El id viaja desde el navegador: que la lista solo ofrezca los propios no
        // impide que alguien mande otro a mano.
        const elegir = (clave, validos, que) => {
            const valor = v(clave);
            if (!valor)
                return null;
            if (validos.has(valor))
                return valor;
            err(clave, `Esa ${que} no existe en tu empresa. Elige una de la lista.`);
            return null;
        };
        const horarioId = elegir(CLAVE_HORARIO, ctx.horariosValidos, 'jornada');
        const sedeId = elegir(CLAVE_SEDE, ctx.sedesValidas, 'sede');
        if (rota)
            return;
        validas.push({
            nombre, apellido, cedula,
            cargo: v('cargo') || null,
            salarioMensual: salario ?? 0,
            email: email || null,
            telefono: v('telefono') || null,
            fechaNacimiento: nacimiento || null,
            horarioId,
            sedeId,
        });
    });
    return {
        validas,
        errores,
        excedeCupo: conDatos > ctx.cupoDisponible,
        cupoDisponible: ctx.cupoDisponible,
        conDatos,
        vacio: conDatos === 0,
    };
}
