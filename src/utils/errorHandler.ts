import { Message } from "node-telegram-bot-api";
import { logger } from "../logger";
import { MESSAGES } from "../handlers/commands/types";

/**
 * Обрабатывает ошибки, логирует их и отправляет сообщение пользователю.
 * @param error - Ошибка.
 * @param context - Контекст (например, имя команды и пользователя).
 * @param sendMessage - Функция для отправки сообщения пользователю.
 */
export async function handleError(
    error: unknown,
    context: { command: string; username?: string; chatId: number },
    sendMessage: (chatId: number, message: string) => Promise<Message>
) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logMessage = `Error in ${context.command} command by user ${context.username || context.chatId}: ${errorMessage}`;

    // Логируем ошибку
    logger.error(logMessage);

    // Отправляем сообщение об ошибке пользователю
    await sendMessage(context.chatId, MESSAGES.ERROR.GENERAL);
}