"use strict";
// Lo que se le pide al comando que revela el autor de una observación confidencial (4 de octubre de
// 2026). El comando está en src/scripts/revelar-autor-confidencial.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOTIVO_MINIMO = void 0;
exports.leerOrden = leerOrden;
exports.MOTIVO_MINIMO = 20;
const USO = [
    'Uso:',
    '  buscar  --nit <NIT de la empresa> --texto "<un pedazo de la nota>"',
    '  revelar --nota <id que dio buscar> --motivo "<la orden de la autoridad y su radicado>" --quien "<quién lo corre>"',
].join('\n');
function banderas(args) {
    const m = new Map();
    for (let i = 0; i < args.length; i++) {
        const valor = args[i + 1];
        if (args[i].startsWith('--') && valor !== undefined && !valor.startsWith('--'))
            m.set(args[i].slice(2), valor.trim());
    }
    return m;
}
function leerOrden(argv) {
    const [accion, ...resto] = argv;
    const b = banderas(resto);
    if (accion === 'buscar') {
        const nit = b.get('nit');
        const texto = b.get('texto');
        if (!nit || !texto)
            return { ok: false, error: `Falta --nit o --texto.\n${USO}` };
        return { ok: true, accion, nit, texto };
    }
    if (accion === 'revelar') {
        const nota = b.get('nota');
        const motivo = b.get('motivo');
        const quien = b.get('quien');
        if (!nota || !quien)
            return { ok: false, error: `Falta --nota o --quien.\n${USO}` };
        if (!motivo || motivo.length < exports.MOTIVO_MINIMO) {
            return { ok: false, error: `El motivo tiene que decir qué autoridad lo ordenó y su radicado (mínimo ${exports.MOTIVO_MINIMO} letras).\n${USO}` };
        }
        return { ok: true, accion, nota, motivo, quien };
    }
    return { ok: false, error: USO };
}
