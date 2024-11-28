import cron from 'node-cron';
import dayjs from 'dayjs';
import { bot } from '../services/botService'; 
import { userRepository } from '../repositories/userRepository';
import { getWordForNumber } from '../utils/formatters';
import { birthdayRepository } from '../repositories/birthdayRepository';
import { MY_CHAT_ID } from '../config/constants';


// Отправка сообщений о днях рождения
const sendBirthdayMessages = async () => {
    const birthdays = await birthdayRepository.findAll();
    const today = dayjs();

    const messages: string[] = [];

    for (const birthday of birthdays) {
        let birthdayDate = dayjs().set('month', birthday.month - 1).set('date', birthday.day);

        if (birthdayDate.isBefore(today)) {
            birthdayDate = birthdayDate.add(1, 'year');
        }

        const difference = birthdayDate.diff(today, 'days');
        const isToday = difference === 0;
        const isTomorrow = difference === 1;

        if (isToday) {
            messages.push(`Сегодня день рождения отмечает ${birthday.name}! Поздравьте его/ее! 🎉`);
        } else if (isTomorrow) {
            messages.push(`${birthday.name} завтра отмечает День Рождения!`);
        } else if (difference === 7 || difference === 3) {
            let messageTemplate = `${birthday.name} будет отмечать День Рождения через ${difference} ${getWordForNumber(difference, ['день', 'дня', 'дней'])}.`;
            if (difference === 7) {
                messageTemplate += ' Время заказать какую-нибудь хуйню на WB';
            }
            messages.push(messageTemplate);
        }
    }

    if (messages.length > 0) {
        const users = await userRepository.getAllUsers();

        for (const user of users) {
            try {
                await bot.sendMessage(user.chatId, messages.join('\n'));
            } catch (error) {
                console.error(`Не удалось отправить сообщение пользователю ${user.chatId}:`, error);
            }
        }
    } else {
        await bot.sendMessage(MY_CHAT_ID, 'Мишаня, все нормально, я в деле!');
    }
};

// Напоминание об отписке
const sendUnsubscribeReminder = async () => {
    const users = await userRepository.getAllUsers();

    for (const user of users) {
        try {
            await bot.sendMessage(user.chatId, 'МАША, ОТМЕНИ ЕБУЧУЮ ПОДПИСКУ В ОККО');
        } catch (error) {
            console.error(`Не удалось отправить сообщение пользователю ${user.chatId}:`, error);
        }
    }
};

// Настройка всех cron-задач
export const setupSchedulers = () => {
    // Задача на 11 утра каждый день
    cron.schedule('0 11 * * *', sendBirthdayMessages, {
        timezone: 'Asia/Yekaterinburg',
    });

    // Задача на 11 утра 13 декабря
    cron.schedule('0 11 13 12 *', sendUnsubscribeReminder, {
        timezone: 'Asia/Yekaterinburg',
    });

    // cron.schedule('* * * * *', sendBirthdayMessages);
};
