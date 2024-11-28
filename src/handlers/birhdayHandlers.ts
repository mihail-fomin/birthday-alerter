import { Message } from "node-telegram-bot-api";
import { bot } from "../services/botService";
import { COMMANDS, MESSAGES } from "./commands/types";
import { isValidDate } from "../utils/dateUtils";
import { birthdayRepository } from "../repositories/birthdayRepository";
import dayjs from "dayjs";

const DATE_REGEX = `(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{4}))?`;


export const setupBirthDayHandlers = () => {
    bot.onText(new RegExp(`^${COMMANDS.ADD} (.+) ${DATE_REGEX}`), async (msg: Message, match) => {
        try {
            if (!match || !match[1]) {
                await bot.sendMessage(msg.chat.id, MESSAGES.ERROR.INVALID_FORMAT);
                return;
            }

            const name = match[1];
            const day = parseInt(match[2]);
            const month = parseInt(match[3]?? '01');
            const year = match[4]? parseInt(match[4]) : dayjs().year();

            if (!name) {
                await bot.sendMessage(msg.chat.id, MESSAGES.ERROR.INVALID_FORMAT);
                return;
            }

            if (!isValidDate(day, month)) {
                await bot.sendMessage(msg.chat.id, MESSAGES.ERROR.INVALID_DATE);
                return;
            }

            const birthday = await birthdayRepository.create({
                name,
                day,
                month,
                year,
            });

            await bot.sendMessage(
                msg.chat.id,
                `Успешно добавлен ${birthday.name} с днем рождения ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}${year ? `.${year}` : ''} 🎂`
            );
        } catch (error) {
            console.error('Error in add command:', error);
            await bot.sendMessage(msg.chat.id, MESSAGES.ERROR.GENERAL);
        }
    });

    bot.onText(new RegExp(`^${COMMANDS.UPCOMING}`), async (msg) => listBirthdays(msg.chat.id))

    bot.onText(new RegExp(`^${COMMANDS.DELETE} (.+)$`), async (msg: Message, match) => {
        try {
            if (!match || !match[1]) {
                await bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите имя для удаления. Пример: /delete [имя]');
                return;
            }

            const name = match[1].trim();
    
            // Ищем пользователя по имени в базе
            const birthdayEntry = await birthdayRepository.getBirthdayBoyByName(name)
    
            if (!birthdayEntry) {
                await bot.sendMessage(msg.chat.id, `Не найдено дня рождения для имени "${name}".`);
                return;
            } else {
                await birthdayRepository.deleteBirthDay(birthdayEntry.id)
            }

            await bot.sendMessage(msg.chat.id, `День рождения для "${name}" успешно удален.`);
        } catch (error) {
            console.error('Error in /delete command:', error);
            await bot.sendMessage(msg.chat.id, 'Произошла ошибка. Пожалуйста, попробуйте еще раз.');
        }
    });

    bot.onText(new RegExp(`^${COMMANDS.SEARCH} (.+)$`), async (msg: Message, match) => {
        try {
            if (!match || !match[1]) {
                await bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите имя для Поиска. Пример: /search [имя]');
                return;
            }

            const name = match[1].trim();
    
            // Ищем пользователя по имени в базе
            const birthdayEntry = await birthdayRepository.getBirthdayBoysByName(name)
    
            if (!birthdayEntry.length) {
                await bot.sendMessage(msg.chat.id, `Не найдено дня рождения для имени "${name}".`);
                return;
            }

            birthdayEntry.forEach(async (birthday) => {
                const { day, month } = birthday;

                await bot.sendMessage(msg.chat.id, `День рождения для "${birthday.name}" состоится ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`);
            })
        } catch (error) {
            console.error('Error in /search command:', error);
            await bot.sendMessage(msg.chat.id, 'Произошла ошибка. Пожалуйста, попробуйте еще раз.');
        }
    });
    
}

export async function listBirthdays(chatId: number) {
    const birthdays = await birthdayRepository.findAll();

    if (birthdays.length === 0) {
        bot.sendMessage(chatId, 'Список дней рождения пуст.');
        return;
    }

    const currentDate = dayjs();
    // Сортировка по дате, начиная с ближайших
    const sortedBirthdays = birthdays
        .map(({ name, day, month }) => {
           // Создание объекта dayjs для каждого дня рождения
           const birthdayDate = dayjs().set('month', month - 1).set('date', day);
           // Проверка на прошедшие дни рождения в этом году и перенос на следующий год
           if (birthdayDate.isBefore(currentDate, 'day')) {
               return { name, day, month, date: birthdayDate.add(1, 'year') }; // перенести на следующий год
           }
           return { name, day, month, date: birthdayDate };
       })
        .sort((a, b) => a.date.diff(b.date)); // Сортировка по дате

    const birthdayList = sortedBirthdays
        .map(({ name, day, month }) => `${name} — ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`)
        .join('\n');

    bot.sendMessage(chatId, `Список грядущих дней рождения:\n\n${birthdayList}`);
}