import dayjs from "dayjs";

export const parseDateString = (dateStr: string) => {
    const dateParts = dateStr.split('.');
    return {
        day: parseInt(dateParts[0]),
        month: parseInt(dateParts[1]),
        year: dateParts[2] ? parseInt(dateParts[2]) : null
    };
};

export const isValidDate = (day: number, month: number) => {
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return false;
    }

    return true
};