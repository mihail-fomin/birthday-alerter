import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const birthdays = [
        { name: 'Миша Фомин', day: 11, month: 7, year: 1995 },
        { name: 'Мария Фомина', day: 23, month: 7, year: 1993 },
    ];

    for (const birthday of birthdays) {
        await prisma.birthday.upsert({
            where: { name: birthday.name },
            update: {
                year: birthday.year,
                month: birthday.month,
                day: birthday.day,
            },
            create: {
                name: birthday.name,
                year: birthday.year,
                month: birthday.month,
                day: birthday.day,
             },
        });
    }

    console.log('Сиды успешно добавлены');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
