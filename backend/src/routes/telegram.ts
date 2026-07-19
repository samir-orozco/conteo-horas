import { FastifyInstance } from 'fastify';
import { enviarTelegram, TELEGRAM_WEBHOOK_SECRET } from '../utils/telegram';

// Webhook público del bot de Telegram (lo llama Telegram, no el frontend).
// Responde el ID del chat cuando alguien escribe /id o /start, para que el
// admin lo copie en HoraPro sin tener que buscarlo con otros bots.
export default async function telegramRoutes(app: FastifyInstance) {
  app.post('/webhook', async (request, reply) => {
    // Validación opcional del secreto que Telegram reenvía en cada llamada
    if (TELEGRAM_WEBHOOK_SECRET) {
      const recibido = request.headers['x-telegram-bot-api-secret-token'];
      if (recibido !== TELEGRAM_WEBHOOK_SECRET) return reply.code(401).send();
    }

    const update = (request.body ?? {}) as any;
    const msg = update.message;
    const texto: string = (msg?.text ?? '').trim();
    const chatId = msg?.chat?.id;

    if (chatId && /^\/(id|start)\b/i.test(texto)) {
      const esGrupo = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
      await enviarTelegram(String(chatId), esGrupo
        ? `🆔 El ID de <b>este grupo</b> es:\n<code>${chatId}</code>\n\nCópialo y pégalo en HoraPro → Configuración → Conexiones → Telegram.`
        : `🆔 Tu ID de chat es:\n<code>${chatId}</code>\n\nCópialo y pégalo en HoraPro → Configuración → Conexiones → Telegram.`);
    }
    // Siempre 200: Telegram reintenta si respondemos error
    return reply.code(200).send({ ok: true });
  });
}
