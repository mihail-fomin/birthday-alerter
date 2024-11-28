import { bot } from '../services/botService';
import { listBirthdays } from './birhdayHandlers';
import { COMMANDS, MESSAGES } from './commands/types';
import { Message } from 'node-telegram-bot-api';

const ADD_USER_TOOLTIP = 'Напишите /add [имя] [день].[месяц].[год(необязательно)] Например, "/add Мария 25.05.2024" или "/add Мария 25.5"'

export const setupCommandHandlers = () => {

// Start command
    bot.onText(new RegExp(`^${COMMANDS.START}$`), async (msg: Message) => {
        try {
            const chatId = msg.chat.id;

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
            console.error('Error in start command:', error);
            await bot.sendMessage(msg.chat.id, MESSAGES.ERROR.GENERAL);
        }
    });

    // Help command
    bot.onText(new RegExp(`^${COMMANDS.HELP}$`), async (msg: Message) => {
        try {
            await bot.sendMessage(msg.chat.id, MESSAGES.HELP);
        } catch (error) {
            console.error('Error in help command:', error);
            await bot.sendMessage(msg.chat.id, MESSAGES.ERROR.GENERAL);
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