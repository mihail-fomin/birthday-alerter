import winston from "winston";

// Настройка формата логов
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
    )
);

// Создаем логгер
export const logger = winston.createLogger({
    level: 'info', // Уровень логирования (можно изменить на 'debug', 'warn', 'error' и т.д.)
    format: logFormat,
    transports: [
      // Логи в консоль
      new winston.transports.Console(),
      // Логи в файл
      new winston.transports.File({ filename: 'logs/app.log' }),
    ],
  });