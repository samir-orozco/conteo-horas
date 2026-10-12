"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAVE_RESUMEN_SEMANAL = exports.HORA_DEL_RESUMEN = void 0;
exports.semanaDelResumen = semanaDelResumen;
exports.armarResumen = armarResumen;
exports.nombreDeSemana = nombreDeSemana;
exports.tonoDelCambio = tonoDelCambio;
exports.correoDelResumen = correoDelResumen;
exports.avisoDelResumen = avisoDelResumen;
const fechas_1 = require("./fechas");
const correo_1 = require("./correo");
// EL RESUMEN SEMANAL POR CORREO (11 de octubre de 2026).
//
// Sale el lunes a las 7 a. m. de Bogotá, solo a los administradores, con la semana anterior
// completa. Aquí vive la decisión; la plomería (consultas, envío, marca de «ya se mandó») está en
// envioResumenSemanal.ts.
const DIA_MS = 24 * 60 * 60 * 1000;
exports.HORA_DEL_RESUMEN = 7;
// El interruptor de la empresa, en `configuracion`. Encendido de fábrica: la empresa que lo apaga
// guarda '0', y una clave que no existe es encendido. Solo el administrador lo cambia (routes/configuracion.ts).
exports.CLAVE_RESUMEN_SEMANAL = 'RESUMEN_SEMANAL_CORREO';
// "YYYY-MM-DD" de una medianoche de Bogotá (05:00 UTC): su fecha UTC es la de Bogotá.
const clave = (medianoche) => medianoche.toISOString().slice(0, 10);
// Qué semana le toca al resumen en este instante, o null si no toca.
//
// Toca el lunes desde las 7 hasta la medianoche, y nada más. Desde las 7 y no A las 7 porque el
// trabajo corre también al arrancar la app, y en un hosting que la duerme puede ser la primera
// visita del lunes la que lo dispara. Solo el lunes porque un resumen de la semana que llega el
// miércoles ya no sirve para lo que existe: decidir qué hacer al empezar la semana.
//
// Que no salga dos veces el mismo lunes no se decide aquí: lo pregunta quien envía.
function semanaDelResumen(ahora) {
    const { inicioDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    if (inicioDia.getUTCDay() !== 1)
        return null;
    if (ahora.getTime() - inicioDia.getTime() < exports.HORA_DEL_RESUMEN * 60 * 60 * 1000)
        return null;
    const dia = (n) => clave(new Date(inicioDia.getTime() - n * DIA_MS));
    return {
        desde: dia(7), hasta: dia(1),
        anterior: { desde: dia(14), hasta: dia(8) },
    };
}
const MAX_NOMBRES = 5;
const MAX_TARDE = 3;
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const sumar = (filas, f) => filas.reduce((s, x) => s + f(x), 0);
const horasDe = (p) => sumar(p.horas, h => h.minutosOrdinarios + h.minutosExtra) / 60;
const nombreDe = (x) => `${x.nombre} ${x.apellido}`;
// "2026-09-29" → "mar 29". Se lee de la cadena y no con el reloj de la máquina (§8.1).
function diaCorto(fecha) {
    const [a, m, d] = fecha.split('-').map(Number);
    return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}`;
}
const plural = (n, uno, varios) => (n === 1 ? uno : varios);
function lineaDeContrato(c) {
    // Un caso por valor y un default explícito (§9.4): el motor de contratos puede sumar alertas.
    switch (c.tipo) {
        case 'PREAVISO_PROXIMO': return `Contrato de ${c.nombre}: quedan ${c.dias} días para avisar por escrito si no se va a renovar`;
        case 'PREAVISO_VENCIDO': return `Contrato de ${c.nombre}: se venció el plazo para avisar y se prorroga solo`;
        case 'SE_VUELVE_INDEFINIDO': return `Contrato de ${c.nombre}: en ${c.dias} días pasa a indefinido por ley`;
        case 'SUPERA_TOPE': return `Contrato de ${c.nombre}: supera el tope legal de cuatro años`;
        case 'CAMBIO_ETAPA_APRENDIZ': return `Contrato de ${c.nombre}: en ${c.dias} días pasa a etapa práctica`;
        default: return `Contrato de ${c.nombre}: tiene un aviso pendiente`;
    }
}
function armarResumen(e) {
    const cifra = (f) => ({ actual: f(e.actual), anterior: f(e.anterior) });
    const atencion = [];
    const cerrados = e.turnosCerradosSolos;
    if (cerrados.length) {
        // Por persona y no por turno: quien tuvo tres turnos sin salida el mismo día salía tres veces.
        const diasDe = new Map();
        for (const t of cerrados)
            diasDe.set(t.nombre, (diasDe.get(t.nombre) ?? new Set()).add(t.fecha));
        const personas = [...diasDe.entries()];
        const nombres = personas.slice(0, MAX_NOMBRES)
            .map(([nombre, dias]) => `${nombre} (${[...dias].sort().map(diaCorto).join(', ')})`).join(', ');
        const resto = personas.length > MAX_NOMBRES ? ` y ${personas.length - MAX_NOMBRES} más` : '';
        atencion.push(`${cerrados.length} ${plural(cerrados.length, 'turno se cerró solo', 'turnos se cerraron solos')} porque nadie marcó la salida: ${nombres}${resto}`);
    }
    if (e.novedadesPorAprobar) {
        atencion.push(`${e.novedadesPorAprobar} ${plural(e.novedadesPorAprobar, 'novedad espera', 'novedades esperan')} tu aprobación`);
    }
    atencion.push(...e.contratos.map(lineaDeContrato));
    const masTarde = e.actual.tardanzas
        .filter(t => t.diasTarde > 0)
        .sort((a, b) => b.diasTarde - a.diasTarde || b.totalMinutos - a.totalMinutos)
        .slice(0, MAX_TARDE)
        .map(t => ({ nombre: nombreDe(t), veces: t.diasTarde, minutos: t.totalMinutos }));
    const llegadasTarde = (p) => sumar(p.tardanzas, t => t.diasTarde);
    const huboActividad = (p) => horasDe(p) > 0 || llegadasTarde(p) > 0;
    const dias = Array.from({ length: 7 }, (_, i) => {
        const [a, m, d] = e.semana.desde.split('-').map(Number);
        return new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10);
    });
    const porDia = dias.map(fecha => ({
        dia: diaCorto(fecha).split(' ')[0],
        fecha,
        horas: sumar(e.actual.horas, h => h.minutosPorDia?.[fecha] ?? 0) / 60,
    }));
    return {
        semana: e.semana,
        horasTrabajadas: cifra(horasDe),
        horasExtra: cifra(p => sumar(p.horas, h => h.minutosExtra) / 60),
        recargosYExtras: cifra(p => sumar(p.horas, h => h.totalAdicional)),
        llegadasTarde: cifra(llegadasTarde),
        atencion,
        turnosCerradosSolos: cerrados.length,
        masTarde,
        porDia,
        hayAlgo: huboActividad(e.actual) || atencion.length > 0,
        huboActividad: huboActividad(e.actual),
        comparable: huboActividad(e.anterior),
    };
}
// ── El correo y el aviso de la campana ────────────────────────────────────────
const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
// "28 sep – 4 oct", o "5 – 11 oct" si no cruza de mes. Con el año solo si cruza de año.
function nombreDeSemana(s) {
    const [a1, m1, d1] = s.desde.split('-').map(Number);
    const [a2, m2, d2] = s.hasta.split('-').map(Number);
    if (a1 !== a2)
        return `${d1} ${MESES[m1 - 1]} ${a1} – ${d2} ${MESES[m2 - 1]} ${a2}`;
    if (m1 !== m2)
        return `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]}`;
    return `${d1} – ${d2} ${MESES[m2 - 1]}`;
}
function tonoDelCambio(cifra, diferencia) {
    if (diferencia === 0)
        return 'neutro';
    // Un caso por valor y un default explícito (§9.4).
    switch (cifra) {
        case 'llegadasTarde': return diferencia > 0 ? 'malo' : 'bueno';
        case 'horasExtra':
        case 'recargosYExtras': return diferencia > 0 ? 'costo' : 'bueno';
        case 'horasTrabajadas': return 'neutro';
        default: return 'neutro';
    }
}
// La comparación se hace sobre lo que se muestra, redondeado: si no, «1.864 h» contra «1.866 h»
// podría decir «▼ 1 h» y el lector no cuadraría la resta.
const diferencia = (c) => Math.round(c.actual) - Math.round(c.anterior);
function cambio(c, formato) {
    const d = diferencia(c);
    if (d === 0)
        return 'igual';
    return `${d > 0 ? '▲' : '▼'} ${formato(Math.abs(d))}`;
}
const horas = (n) => `${entero.format(n)} h`;
const pesos = (n) => `$ ${entero.format(n)}`;
const veces = (n) => entero.format(n);
// La paleta de HoraPro (amarillo y grafito) y el color de cada tono.
const C = {
    tinta: '#303030', gris: '#898989', fondo: '#f6f6f4', tarjeta: '#f6f6f4', linea: '#ececea',
    amarillo: '#FFD85E', atencion: '#FFF7DB', bordeAtencion: '#FBE3A0', vacio: '#e4e4e1',
};
const COLOR_DEL_TONO = { bueno: '#1E8E5A', malo: '#C0392B', costo: '#B7791F', neutro: C.gris };
const FUENTE = "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const ALTO_BARRA = 72;
// "Jorge Pérez" → "JP", para el círculo de cada persona.
const iniciales = (nombre) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
// El correo se arma con tablas y estilos en cada elemento, que es lo único que Gmail, Outlook y los
// clientes del celular pintan igual. Sin SVG (Gmail no lo muestra): el logo es un PNG publicado
// con el frontend, y si el cliente no carga imágenes queda su texto alternativo.
function correoDelResumen(r, empresa, origen) {
    const semana = nombreDeSemana(r.semana);
    const enlace = `${origen}/app/reportes`;
    const titulo = (t) => `<p style="${FUENTE};font-size:12px;font-weight:700;color:${C.gris};letter-spacing:.06em;margin:28px 0 12px">${t}</p>`;
    const tarjeta = (etiqueta, cifra, formato) => {
        const c = r[cifra];
        const tono = tonoDelCambio(cifra, diferencia(c));
        return `<td class="col" width="50%" valign="top" style="padding:6px">`
            + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.tarjeta};border-radius:14px">`
            + `<tr><td style="padding:16px 18px">`
            + `<p style="${FUENTE};font-size:13px;color:${C.gris};margin:0 0 6px">${etiqueta}</p>`
            + `<p style="${FUENTE};font-size:24px;font-weight:800;color:${C.tinta};margin:0">${formato(Math.round(c.actual))}</p>`
            + (r.comparable ? `<p style="${FUENTE};font-size:13px;font-weight:600;color:${COLOR_DEL_TONO[tono]};margin:6px 0 0">${cambio(c, formato)}</p>` : '')
            + `</td></tr></table></td>`;
    };
    const cifras = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px">`
        + `<tr>${tarjeta('Horas trabajadas', 'horasTrabajadas', horas)}${tarjeta('Horas extra', 'horasExtra', horas)}</tr>`
        + `<tr>${tarjeta('Recargos y extras', 'recargosYExtras', pesos)}${tarjeta('Llegadas tarde', 'llegadasTarde', veces)}</tr>`
        + `</table>`;
    // Una celda por día: arriba sus horas, al medio la barra (proporcional al día más largo) y abajo
    // el día. La barra es una celda con fondo y alto, que Outlook sí respeta; un div con alto no.
    const maximo = Math.max(...r.porDia.map(d => d.horas), 0);
    const celda = (contenido, estilo = '') => `<td align="center" valign="bottom" width="14%" style="${FUENTE};${estilo}">${contenido}</td>`;
    const barras = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`
        + `<tr>${r.porDia.map(d => celda(d.horas > 0 ? horas(Math.round(d.horas)) : '', `font-size:12px;color:${C.gris};padding-bottom:6px`)).join('')}</tr>`
        + `<tr>${r.porDia.map(d => {
            const alto = d.horas > 0 && maximo > 0 ? Math.max(4, Math.round((d.horas / maximo) * ALTO_BARRA)) : 3;
            const color = d.horas > 0 ? C.amarillo : C.vacio;
            return celda(`<table role="presentation" cellpadding="0" cellspacing="0" width="28"><tr><td height="${alto}" style="height:${alto}px;background:${color};border-radius:6px 6px 2px 2px;font-size:0;line-height:0">&nbsp;</td></tr></table>`, `height:${ALTO_BARRA}px`);
        }).join('')}</tr>`
        + `<tr>${r.porDia.map(d => celda(d.dia, `font-size:12px;color:${C.tinta};font-weight:600;padding-top:8px`)).join('')}</tr>`
        + `</table>`;
    const boton = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.amarillo};border-radius:12px">`
        + `<a href="${enlace}" style="${FUENTE};display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:${C.tinta};text-decoration:none">${r.atencion.length ? 'Revisar en HoraPro' : 'Ver los reportes en HoraPro'}</a>`
        + `</td></tr></table>`;
    const atencion = r.atencion.length
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:${C.atencion};border:1px solid ${C.bordeAtencion};border-radius:14px">`
            + `<tr><td style="padding:20px 22px">`
            + `<p style="${FUENTE};font-size:16px;font-weight:800;color:${C.tinta};margin:0 0 12px">Necesita tu atención `
            + `<span style="display:inline-block;background:${C.tinta};color:#ffffff;font-size:12px;font-weight:700;border-radius:10px;padding:2px 8px;vertical-align:2px">${r.atencion.length}</span></p>`
            + r.atencion.map(a => `<p style="${FUENTE};font-size:14px;line-height:1.5;color:${C.tinta};margin:0 0 8px;padding-left:14px;border-left:3px solid ${C.amarillo}">${(0, correo_1.escapar)(a)}</p>`).join('')
            + `<div style="height:8px;line-height:8px;font-size:0">&nbsp;</div>${boton}`
            + `</td></tr></table>`
        : `<div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>${boton}`;
    const tarde = r.masTarde.length
        ? titulo(r.masTarde.length === 1 ? 'QUIÉN LLEGÓ TARDE' : `QUIÉNES MÁS LLEGARON TARDE`)
            + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`
            + r.masTarde.map(t => `<tr>`
                + `<td width="44" style="padding:8px 0;border-bottom:1px solid ${C.linea}"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="34" height="34" style="${FUENTE};width:34px;height:34px;border-radius:17px;background:${C.tinta};color:#ffffff;font-size:12px;font-weight:700">${(0, correo_1.escapar)(iniciales(t.nombre))}</td></tr></table></td>`
                + `<td style="${FUENTE};padding:8px 0;border-bottom:1px solid ${C.linea};font-size:14px;font-weight:600;color:${C.tinta}">${(0, correo_1.escapar)(t.nombre)}</td>`
                + `<td align="right" style="${FUENTE};padding:8px 0;border-bottom:1px solid ${C.linea};font-size:13px;color:${C.gris};white-space:nowrap">${t.veces} ${plural(t.veces, 'vez', 'veces')} · ${entero.format(t.minutos)} min en total</td>`
                + `</tr>`).join('')
            + `</table>`
        : '';
    const cuerpo = r.huboActividad
        ? (r.comparable ? `<p style="${FUENTE};font-size:14px;color:${C.gris};margin:0 0 16px">Comparada con la semana anterior.</p>` : '')
            + cifras + titulo('HORAS POR DÍA') + barras
        : `<p style="${FUENTE};font-size:15px;line-height:1.5;color:${C.tinta};margin:0">No hubo marcaciones esta semana. Esto es lo que tiene pendiente <b>${(0, correo_1.escapar)(empresa)}</b>.</p>`;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
        + `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">`
        + `<style>@media (max-width:520px){.col{display:block!important;width:100%!important}.caja{padding:24px 18px!important}}</style></head>`
        + `<body style="margin:0;padding:0;background:${C.fondo}">`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo}"><tr><td align="center" style="padding:32px 12px">`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px">`
        + `<tr><td class="caja" style="padding:36px 36px 28px">`
        + `<img src="${origen}/logo-correo.png" width="140" height="30" alt="HoraPro" style="display:block;border:0;width:140px;height:30px;${FUENTE};font-size:22px;font-weight:800;color:${C.tinta}">`
        + `<p style="${FUENTE};font-size:13px;font-weight:600;color:${C.gris};margin:32px 0 6px">Resumen semanal · ${semana}</p>`
        + `<h1 style="${FUENTE};font-size:24px;line-height:1.25;font-weight:800;color:${C.tinta};margin:0 0 8px">Tu semana en ${(0, correo_1.escapar)(empresa)}</h1>`
        + cuerpo + atencion + tarde
        + `</td></tr>`
        + `<tr><td style="padding:20px 36px 32px;border-top:1px solid ${C.linea}">`
        + `<p style="${FUENTE};font-size:12px;line-height:1.5;color:${C.gris};margin:0">Te llega cada lunes porque eres administrador. Lo puedes apagar en Configuración → Cuenta.</p>`
        + `<p style="${FUENTE};font-size:12px;color:${C.gris};margin:8px 0 0">HoraPro · Control de horas laborales para Colombia</p>`
        + `</td></tr></table></td></tr></table></body></html>`;
    return { asunto: `Resumen semanal · ${empresa} · ${semana}`, html };
}
function avisoDelResumen(r) {
    const n = r.turnosCerradosSolos;
    const a = r.atencion.length;
    const partes = r.huboActividad
        ? [
            `${horas(Math.round(r.horasTrabajadas.actual))} trabajadas`,
            `${horas(Math.round(r.horasExtra.actual))} extra`,
            ...(n ? [`${n} ${plural(n, 'turno cerrado solo', 'turnos cerrados solos')}`] : []),
        ]
        : ['No hubo marcaciones esta semana', `${a} ${plural(a, 'cosa necesita', 'cosas necesitan')} tu atención`];
    return {
        titulo: `Resumen de la semana ${nombreDeSemana(r.semana)}`,
        cuerpo: `${partes.join(' · ')}. También te llegó por correo.`,
    };
}
