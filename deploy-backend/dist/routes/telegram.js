"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = telegramRoutes;
const telegram_1 = require("../utils/telegram");
// Webhook público del bot de Telegram (lo llama Telegram, no el frontend).
// Responde el ID del chat cuando alguien escribe /id o /start, para que el
// admin lo copie en HoraPro sin tener que buscarlo con otros bots.
async function telegramRoutes(app) {
    app.post('/webhook', async (request, reply) => {
        // Validación opcional del secreto que Telegram reenvía en cada llamada
        if (telegram_1.TELEGRAM_WEBHOOK_SECRET) {
            const recibido = request.headers['x-telegram-bot-api-secret-token'];
            if (recibido !== telegram_1.TELEGRAM_WEBHOOK_SECRET)
                return reply.code(401).send();
        }
        const update = (request.body ?? {});
        const msg = update.message;
        const texto = (msg?.text ?? '').trim();
        const chatId = msg?.chat?.id;
        if (chatId && /^\/(id|start)\b/i.test(texto)) {
            const esGrupo = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
            await (0, telegram_1.enviarTelegram)(String(chatId), esGrupo
                ? `🆔 El ID de <b>este grupo</b> es:\n<code>${chatId}</code>\n\nCópialo y pégalo en HoraPro → Configuración → Conexiones → Telegram.`
                : `🆔 Tu ID de chat es:\n<code>${chatId}</code>\n\nCópialo y pégalo en HoraPro → Configuración → Conexiones → Telegram.`);
        }
        // Siempre 200: Telegram reintenta si respondemos error
        return reply.code(200).send({ ok: true });
    });
}
