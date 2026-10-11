import nodemailer from 'nodemailer';

// Envío de correos vía SMTP (en Banahosting: crear un buzón tipo
// no-responder@horapro.co en cPanel → Email Accounts y usar sus credenciales).
// Si el SMTP no está configurado, el correo se imprime en el log del servidor
// (útil en desarrollo; en producción SÍ debe configurarse).

const smtpConfigurado = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Otros módulos deciden según esto (ej: si no hay correo, no se exige verificación)
export const correoConfigurado = smtpConfigurado;

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function enviarCorreo(opts: { para: string; asunto: string; html: string }): Promise<void> {
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
export function plantillaCorreo(titulo: string, cuerpoHtml: string): string {
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

// Texto de la base dentro de un correo: un nombre con «<» no puede volverse HTML. Estaba solo en
// avisosDeSuscripcion.ts y salió de ahí cuando el resumen semanal la necesitó (11 de octubre de 2026).
export const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const parrafo = (html: string) => `<p style="font-size:14px;color:#303030;line-height:1.5;margin:0 0 12px">${html}</p>`;

// A quién se le escribe: a los administradores activos, que son los que pueden pagar desde
// el panel. Si no queda ninguno, al correo con el que se registró la empresa.
export function destinatarios(e: { email: string; usuarios: { email: string }[] }): string[] {
  const admins = [...new Set(e.usuarios.map(u => u.email.trim().toLowerCase()).filter(Boolean))];
  return admins.length ? admins : [e.email];
}
