"use strict";
// Envío de mensajes por Telegram con UN bot de la plataforma (token en .env,
// creado en @BotFather). Cada empresa guarda su chat_id en su configuración.
// Si el bot no está configurado, se registra en el log (útil en desarrollo).
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramConfigurado = void 0;
exports.enviarTelegram = enviarTelegram;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
exports.telegramConfigurado = Boolean(TOKEN);
async function enviarTelegram(chatId, texto) {
    if (!TOKEN) {
        console.log(`[telegram no configurado] chat ${chatId}: ${texto.replace(/<[^>]+>/g, '')}`);
        return { ok: false, error: 'El bot de Telegram no está configurado en el servidor.' };
    }
    if (!chatId)
        return { ok: false, error: 'Falta el chat de Telegram.' };
    try {
        const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!data?.ok)
            return { ok: false, error: data?.description || 'Telegram rechazó el mensaje.' };
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e?.message || 'No pudimos contactar a Telegram.' };
    }
}
