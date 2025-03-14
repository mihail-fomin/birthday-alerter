import { Message } from "node-telegram-bot-api";
import { bot } from "../services/botService";
import { COMMANDS, MESSAGES } from "./commands/types";
import { isValidDate } from "../utils/dateUtils";
import { birthdayRepository } from "../repositories/birthdayRepository";
import dayjs from "dayjs";
import { logger } from "../logger";
import { handleError } from "../utils/errorHandler";
import { userStates } from "../utils/userStates";

const DATE_REGEX = `(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{4}))?`;

export const setupBirthDayHandlers = () => {
    // Обработчик команды /add без параметров
    bot.onText(new RegExp(`^${COMMANDS.ADD}$`), async (msg: Message) => {
        const { username, id: chatId } = msg.chat;

        try {
            // Устанавливаем состояние ожидания имени
            userStates.set(chatId, { waitingFor: 'name' });
            
            logger.info(`User ${username || chatId} started the add birthday process`);
            await bot.sendMessage(chatId, 'Пожалуйста, введите имя человека:');
        } catch (error) {
            await handleError(error, { command: COMMANDS.ADD, username, chatId }, bot.sendMessage.bind(bot));
        }
    });

    // Сохраняем старый обработчик для обратной совместимости
    bot.onText(new RegExp(`^${COMMANDS.ADD} (.+) ${DATE_REGEX}`), async (msg: Message, match) => {
        const { username, id: chatId } = msg.chat;

        try {
            if (!match || !match[1]) {
                logger.warn(`Invalid format in /add command by user ${username || chatId}`);
                await bot.sendMessage(chatId, MESSAGES.ERROR.INVALID_FORMAT);
                return;
            }

            const name = match[1];
            const day = parseInt(match[2]);
            const month = parseInt(match[3] ?? '01');
            const year = match[4] ? parseInt(match[4]) : dayjs().year();

            if (!name) {
                logger.warn(`Empty name in /add command by user ${username || chatId}`);
                await bot.sendMessage(chatId, MESSAGES.ERROR.INVALID_FORMAT);
                return;
            }

            if (!isValidDate(day, month)) {
                logger.warn(`Invalid date in /add command by user ${username || chatId}: ${day}.${month}`);
                await bot.sendMessage(chatId, MESSAGES.ERROR.INVALID_DATE);
                return;
            }

            const birthday = await birthdayRepository.create({
                name,
                day,
                month,
                year,
            });

            logger.info(`Birthday added by user ${username || chatId}: ${birthday.name} (${day}.${month}.${year})`);
            await bot.sendMessage(
                chatId,
                `Успешно добавлен ${birthday.name} с днем рождения ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}${year ? `.${year}` : ''} 🎂`
            );
        } catch (error) {
            await handleError(error, { command: COMMANDS.ADD, username, chatId }, bot.sendMessage.bind(bot));
        }
    });

    // Обработчик для обработки сообщений в процессе добавления дня рождения
    bot.on('message', async (msg) => {
        const { id: chatId, username } = msg.chat;
        const text = msg.text;
        
        // Пропускаем команды и обрабатываем только текстовые сообщения
        if (!text || text.startsWith('/')) {
            return;
        }
        
        const userState = userStates.get(chatId);
        if (!userState) {
            return;
        }
        
        try {
            if (userState.waitingFor === 'name') {
                // Сохраняем имя и запрашиваем дату
                userState.name = text.trim();
                userState.waitingFor = 'date';
                
                logger.info(`User ${username || chatId} provided name: ${userState.name}`);
                await bot.sendMessage(chatId, `Пожалуйста, введите дату рождения для ${userState.name} в формате ДД.ММ.ГГГГ (год необязателен):`);
            } else if (userState.waitingFor === 'date') {
                // Обрабатываем дату
                const dateMatch = text.match(new RegExp(`^${DATE_REGEX}$`));
                
                if (!dateMatch) {
                    logger.warn(`Invalid date format provided by user ${username || chatId}: ${text}`);
                    await bot.sendMessage(chatId, MESSAGES.ERROR.INVALID_DATE);
                    return;
                }
                
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]);
                const year = dateMatch[3] ? parseInt(dateMatch[3]) : dayjs().year();
                
                if (!isValidDate(day, month)) {
                    logger.warn(`Invalid date provided by user ${username || chatId}: ${day}.${month}`);
                    await bot.sendMessage(chatId, MESSAGES.ERROR.INVALID_DATE);
                    return;
                }
                
                const birthday = await birthdayRepository.create({
                    name: userState.name!,
                    day,
                    month,
                    year,
                });
                
                logger.info(`Birthday added by user ${username || chatId}: ${birthday.name} (${day}.${month}.${year})`);
                await bot.sendMessage(
                    chatId,
                    `Успешно добавлен ${birthday.name} с днем рождения ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}${year ? `.${year}` : ''} 🎂`
                );
                
                // Сбрасываем состояние
                userStates.delete(chatId);
            }
        } catch (error) {
            await handleError(error, { command: 'add_birthday_process', username, chatId }, bot.sendMessage.bind(bot));
            // Сбрасываем состояние в случае ошибки
            userStates.delete(chatId);
        }
    });

    bot.onText(new RegExp(`^${COMMANDS.UPCOMING}`), async (msg) => {
        const { username, id: chatId } = msg.chat;
        logger.info(`User ${username || chatId} requested upcoming birthdays`);
        listBirthdays(chatId);
    });

    bot.onText(new RegExp(`^${COMMANDS.DELETE} (.+)$`), async (msg: Message, match) => {
        const { username, id: chatId } = msg.chat;

        try {
            if (!match || !match[1]) {
                logger.warn(`Invalid format in /delete command by user ${username || chatId}`);
                await bot.sendMessage(chatId, 'Пожалуйста, укажите имя для удаления. Пример: /delete [имя]');
                return;
            }

            const name = match[1].trim();
            const birthdayEntry = await birthdayRepository.getBirthdayBoyByName(name);

            if (!birthdayEntry) {
                logger.warn(`No birthday found for name "${name}" by user ${username || chatId}`);
                await bot.sendMessage(chatId, `Не найдено дня рождения для имени "${name}".`);
                return;
            }

            await birthdayRepository.deleteBirthDay(birthdayEntry.id);
            logger.info(`Birthday deleted by user ${username || chatId}: ${name}`);
            await bot.sendMessage(chatId, `День рождения для "${name}" успешно удален.`);
        } catch (error) {
            await handleError(error, { command: COMMANDS.DELETE, username, chatId }, bot.sendMessage.bind(bot));
        }
    });

    bot.onText(new RegExp(`^${COMMANDS.SEARCH} (.+)$`), async (msg: Message, match) => {
        const { username, id: chatId } = msg.chat;

        try {
            if (!match || !match[1]) {
                logger.warn(`Invalid format in /search command by user ${username || chatId}`);
                await bot.sendMessage(chatId, 'Пожалуйста, укажите имя для поиска. Пример: /search [имя]');
                return;
            }

            const name = match[1].trim();
            const birthdayEntry = await birthdayRepository.getBirthdayBoysByName(name);

            if (!birthdayEntry.length) {
                logger.warn(`No birthdays found for name "${name}" by user ${username || chatId}`);
                await bot.sendMessage(chatId, `Не найдено дня рождения для имени "${name}".`);
                return;
            }

            logger.info(`Birthdays found by user ${username || chatId} for name "${name}": ${birthdayEntry.length} entries`);
            birthdayEntry.forEach(async (birthday) => {
                const { day, month } = birthday;
                await bot.sendMessage(chatId, `День рождения для "${birthday.name}" состоится ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`);
            });
        } catch (error) {
            await handleError(error, { command: COMMANDS.SEARCH, username, chatId }, bot.sendMessage.bind(bot));
        }
    });
};

export async function listBirthdays(chatId: number) {
    try {
        const birthdays = await birthdayRepository.findAll();

        if (birthdays.length === 0) {
            logger.info(`No birthdays found for user ${chatId}`);
            await bot.sendMessage(chatId, 'Список дней рождения пуст.');
            return;
        }

        const currentDate = dayjs();
        const sortedBirthdays = birthdays
            .map(({ name, day, month }) => {
                const birthdayDate = dayjs().set('month', month - 1).set('date', day);
                if (birthdayDate.isBefore(currentDate, 'day')) {
                    return { name, day, month, date: birthdayDate.add(1, 'year') };
                }
                return { name, day, month, date: birthdayDate };
            })
            .sort((a, b) => a.date.diff(b.date));

        const birthdayList = sortedBirthdays
            .map(({ name, day, month }) => `${name} — ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`)
            .join('\n');

        logger.info(`Birthdays listed for user ${chatId}: ${birthdays.length} entries`);
        await bot.sendMessage(chatId, `Список грядущих дней рождения:\n\n${birthdayList}`);
    } catch (error) {
        await handleError(error, { command: 'listBirthdays', chatId }, bot.sendMessage.bind(bot));
    }
}