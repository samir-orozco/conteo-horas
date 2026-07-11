"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correoConfigurado = void 0;
exports.enviarCorreo = enviarCorreo;
exports.plantillaCorreo = plantillaCorreo;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Envío de correos vía SMTP (en Banahosting: crear un buzón tipo
// no-responder@horapro.co en cPanel → Email Accounts y usar sus credenciales).
// Si el SMTP no está configurado, el correo se imprime en el log del servidor
// (útil en desarrollo; en producción SÍ debe configurarse).
const smtpConfigurado = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
// Otros módulos deciden según esto (ej: si no hay correo, no se exige verificación)
exports.correoConfigurado = smtpConfigurado;
const transporter = smtpConfigurado
    ? nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: (Number(process.env.SMTP_PORT) || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    : null;
async function enviarCorreo(opts) {
    if (!transporter) {
        console.log(`[correo no configurado] Para: ${opts.para} · Asunto: ${opts.asunto}`);
        console.log(opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        return;
    }
    await transporter.sendMail({
        from: process.env.SMTP_FROM || `"HoraPro" <${process.env.SMTP_USER}>`,
        to: opts.para,
        subject: opts.asunto,
        html: opts.html,
    });
}
// Plantilla mínima con la línea gráfica de HoraPro
function plantillaCorreo(titulo, cuerpoHtml) {
    return `
  <div style="font-family:system-ui,'Segoe UI',Roboto,sans-serif;background:#f6f6f4;padding:32px 16px">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <p style="font-size:22px;font-weight:800;color:#303030;margin:0 0 4px">hora<span style="color:#898989">Pro</span></p>
      <h1 style="font-size:18px;color:#303030;margin:16px 0 8px">${titulo}</h1>
      ${cuerpoHtml}
      <p style="font-size:12px;color:#898989;margin-top:24px">HoraPro · Control de horas laborales para Colombia</p>
    </div>
  </div>`;
}
