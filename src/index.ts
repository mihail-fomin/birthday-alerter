import { Birthday, PrismaClient, User } from '@prisma/client';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

const token = process.env.TELEGRAM_BOT_TOKEN;

const ADD_USER_TOOLTIP = 'Напишите /add [имя] [день].[месяц].[год(необязательно)] Например, "/add Мария 25.05.2024" или "/add Мария 25.5"'
const MY_CHAT_ID = 719127303


if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is not set.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const message = 'Привет! Я — бот, который помогает не забыть дни рождения ваших близких. Выберите одну из команд:';

    const keyboard = [
        [
            {
                text: 'Список ДР',
                callback_data: '/list'
            },
            {
                text: 'Добавить ДР',
                callback_data: '/add'
            }
        ],
    ];

    const options = {
        reply_markup: {
            keyboard: [
                ['Добавить ДР', 'Показать список ДР']
            ],
            inline_keyboard: keyboard,
            resize_keyboard: true,
        }
    };
    // Сохраняем chat.id в базе данных, если его там еще нет
    const user = await getUserByChatId(chatId);

    if (!user) {
        await saveUserId(chatId);
    }

    bot.sendMessage(chatId, message, options);
})

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === 'Добавить ДР') {
        bot.sendMessage(chatId, ADD_USER_TOOLTIP);
    } else if (text === 'Показать список ДР') {
        bot.sendMessage(chatId, 'Формирую список дней рождения...');
        listBirthdays(chatId)
    }
});

bot.onText(/\/add (.+) (\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/, async (msg, match) => {
    console.log('msg: ', msg);

    if (!match) {
        bot.sendMessage(msg.chat.id, 'Неверный формат. Напишите /add [имя] [день].[месяц]. Например, /add Мария 25.05.2024 или /add Мария 25.5');
        return;
    }

    if (!match[1]) {
        bot.sendMessage(msg.chat.id, 'Имя не может быть пустым.');
        return;
    }

    if (parseInt(match[2]) < 1 || parseInt(match[2]) > 31) {
        bot.sendMessage(msg.chat.id, 'Некорректный день.');
        return;
    }

    if(parseInt(match[3]) < 1 || parseInt(match[3]) > 12) {
        bot.sendMessage(msg.chat.id, 'Некорректный месяц.');
        return;
    }

    const name = match[1];
    const day = parseInt(match[2]);
    const month = parseInt(match[3]?? '01');
    const year = match[4]? parseInt(match[4]) : dayjs().year();

    await addBirthday(name, day, month, year);
    bot.sendMessage(msg.chat.id, `Успешно добавлен ${name} с днем рождения ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`);
})

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    const message = callbackQuery.data;

    if (!chatId) {
        return;
    }

    if (message === '/list') {
        bot.sendMessage(chatId, 'Список дней рождения...');
        listBirthdays(chatId)
    } else if (message === '/add') {
        bot.sendMessage(chatId, 'Для того, чтобы добавить именниника, используйте /add [имя] [день] [месяц].');
    }
});

// Метод для отображения списка дней рождения
async function listBirthdays(chatId: number) {
    const birthdays = await getBirthdays();

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

    bot.sendMessage(chatId, `Список грядущих дней рождения:\n${birthdayList}`);
}

// Список пользователей с днями рождения
bot.onText(/\/list/, async (msg) => {
    const birthdays = await getBirthdays();

    const chatId = msg.chat.id;
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

    bot.sendMessage(chatId, `Список грядущих дней рождения:\n${birthdayList}`);
});

bot.onText(/\/birthdays/, async (msg) => {
    const birthdays = await getBirthdays();

    if (birthdays.length === 0) {
        bot.sendMessage(msg.chat.id, 'Нет добавленных дней рождения.');
        return;
    }

    const currentDate = dayjs();
    const messages: string[] = [];

    for (const birthday of birthdays) {
        const birthdayDate = dayjs().set('month', birthday.month - 1).set('date', birthday.day);
        const difference = birthdayDate.diff(currentDate, 'days');
        const isToday = difference === 0;
        const isTomorrow = difference === 1;

        if (isToday) {
            messages.push(`${birthday.name} сегодня отмечает День Рождения!`);
        } else if (isTomorrow) {
            messages.push(`${birthday.name} завтра отмечает День Рождения!`);
        } else if (difference > 1 && difference <= 7) {
            messages.push(`${birthday.name} родится через ${difference} ${getWordForNumber(difference, ['день', 'дня', 'дней'])}.`);
        } 
    }

    if (messages.length > 0) {
        bot.sendMessage(msg.chat.id, messages.join('\n'));
    } else {
        bot.sendMessage(msg.chat.id, 'На этой неделе нет дней рождения.');
    }

})

async function addBirthday(name: string, day: number, month: number, year?: number) {
    await prisma.birthday.create({
        data: {
            name,
            day,
            month,
            year,
        },
    });

    console.log(`Добавлен ${name} с днем рождения ${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}`);
}

// Проверка и отправка сообщений о днях рождения
const sendBirthdayMessages = async () => {
    const birthdays = await getBirthdays();
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
            messages.push(`${birthday.name} будет отмечать День Рождения через ${difference} ${getWordForNumber(difference, ['день', 'дня', 'дней'])}.`);
        }
    }

    if (messages.length > 0) {
        const users = await getAllUsers();

        // Отправляем сообщения каждому пользователю
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

// Настройка cron задачи на 11 утра каждый день
cron.schedule('0 11 * * *', sendBirthdayMessages, {
    timezone: 'Asia/Yekaterinburg',
});

// cron.schedule('* * * * *', sendBirthdayMessages);

async function getBirthdays(): Promise<Birthday[]> {

    return await prisma.birthday.findMany();
}

function getWordForNumber(number: number, words: string[]): string {
    const lastDigit = number % 10;

    if (lastDigit === 1 && number % 100 !== 11) {
        return words[0];
    }

    if (lastDigit >= 2 && lastDigit <= 4 && (number % 100 < 10 || number % 100 >= 20)) {
        return words[1];
    }

    return words[2];
}

async function  getUserByChatId(chatId: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
        where: { chatId },
    });

    return user;
}

async function saveUserId(userId: number) {
    await prisma.user.create({
        data: {
            chatId: userId,
        },
    });
}

async function getAllUsers() {
    return await prisma.user.findMany();
}