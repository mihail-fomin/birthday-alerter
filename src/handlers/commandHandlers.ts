import { logger } from '../logger';
import { bot } from '../services/botService';
import { handleError } from '../utils/errorHandler';
import { listBirthdays } from './birhdayHandlers';
import { COMMANDS, MESSAGES } from './commands/types';
import { Message } from 'node-telegram-bot-api';

const ADD_USER_TOOLTIP = 'Напишите /add [имя] [день].[месяц].[год(необязательно)] Например, "/add Мария 25.05.2024" или "/add Мария 25.5"'

export const setupCommandHandlers = () => {

// Start command
    bot.onText(new RegExp(`^${COMMANDS.START}$`), async (msg: Message) => {
        const chatId = msg.chat.id;
        
        const { username } = msg.chat

        try {

            logger.info(`User ${username || chatId} started the bot`);

            // Сообщение приветствия
            const message = 'Привет! Я — бот, который помогает не забыть дни рождения ваших близких. Выберите одну из команд:';

            // Inline-клавиатура
            const keyboard = [
                [
                    { text: 'Список ДР', callback_data: '/list' },
                    { text: 'Добавить ДР', callback_data: '/add' },
                    { text: 'Список команд', callback_data: '/help' },
                ],
            ];

            const options = {
                reply_markup: {
                    keyboard: [['Добавить ДР', 'Показать список ДР', 'Список команд']],
                    inline_keyboard: keyboard,
                    resize_keyboard: true,
                },
            };

            // Проверяем, сохранен ли chatId в базе данных, если нет — сохраняем
            // const user = await getUserByChatId(chatId);
            // if (!user) {
            //     await saveUserId(chatId);
            // }

            // Отправляем сообщение с опциями
            await bot.sendMessage(chatId, message, options);
        } catch (error) {
            await handleError(error, { command: MESSAGES.ERROR.GENERAL, username, chatId }, bot.sendMessage.bind(bot));
        }
    });

    // Help command
    bot.onText(new RegExp(`^${COMMANDS.HELP}$`), async (msg: Message) => {
        const chatId = msg.chat.id;
        
        const { username } = msg.chat

        try {
            await bot.sendMessage(msg.chat.id, MESSAGES.HELP);
        } catch (error) {
            await handleError(error, { command: MESSAGES.ERROR.GENERAL, username, chatId }, bot.sendMessage.bind(bot));
        }
    });

    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
    
        if (text === 'Добавить ДР') {
            bot.sendMessage(chatId, ADD_USER_TOOLTIP);
        } else if (text === 'Показать список ДР') {
            bot.sendMessage(chatId, 'Формирую список дней рождения...');
            listBirthdays(chatId)
        } else if (text === 'Список команд') {
            bot.sendMessage(chatId, `${MESSAGES.HELP}`);
        }
    });
}