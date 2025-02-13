# Используем официальный образ Node.js
FROM node:20-bullseye

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта в контейнер
COPY . .

# Копируем переменные окружения
COPY .env .env

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем проект
RUN npm run build

# Указываем порт, который будет использовать приложение
EXPOSE 3000

# Команда для запуска приложения
CMD ["npm", "start"]