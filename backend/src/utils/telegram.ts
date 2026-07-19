// Envío de mensajes por Telegram con UN bot de la plataforma (token en .env,
// creado en @BotFather). Cada empresa guarda su chat_id en su configuración.
// Si el bot no está configurado, se registra en el log (útil en desarrollo).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const telegramConfigurado = Boolean(TOKEN);
// Secreto opcional para validar que el webhook lo llama Telegram y no un tercero.
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

// Registra el webhook del bot (una sola vez, al arrancar) para recibir los
// mensajes por HTTP en vez de long polling — encaja con el hosting compartido.
export async function configurarWebhook(url: string): Promise<void> {
  if (!TOKEN || !url) return;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        allowed_updates: ['message'],
        ...(TELEGRAM_WEBHOOK_SECRET ? { secret_token: TELEGRAM_WEBHOOK_SECRET } : {}),
      }),
    });
    const data: any = await resp.json().catch(() => ({}));
    console.log(data?.ok ? `[telegram] webhook configurado en ${url}` : `[telegram] no se pudo configurar webhook: ${data?.description}`);
  } catch (e: any) {
    console.log(`[telegram] error configurando webhook: ${e?.message}`);
  }
}

export async function enviarTelegram(chatId: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) {
    console.log(`[telegram no configurado] chat ${chatId}: ${texto.replace(/<[^>]+>/g, '')}`);
    return { ok: false, error: 'El bot de Telegram no está configurado en el servidor.' };
  }
  if (!chatId) return { ok: false, error: 'Falta el chat de Telegram.' };
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!data?.ok) return { ok: false, error: data?.description || 'Telegram rechazó el mensaje.' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'No pudimos contactar a Telegram.' };
  }
}
