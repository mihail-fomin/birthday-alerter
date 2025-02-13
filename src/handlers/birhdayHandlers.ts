import { Message } from "node-telegram-bot-api";
import { bot } from "../services/botService";
import { COMMANDS, MESSAGES } from "./commands/types";
import { isValidDate } from "../utils/dateUtils";
import { birthdayRepository } from "../repositories/birthdayRepository";
import dayjs from "dayjs";
import { logger } from "../logger";
import { handleError } from "../utils/errorHandler";

const DATE_REGEX = `(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{4}))?`;

export const setupBirthDayHandlers = () => {
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