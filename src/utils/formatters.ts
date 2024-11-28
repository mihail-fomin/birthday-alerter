export const getWordForNumber = (number: number, words: string[]): string => {
    const lastDigit = number % 10;

    if (lastDigit === 1 && number % 100 !== 11) {
        return words[0];
    }

    if (lastDigit >= 2 && lastDigit <= 4 && (number % 100 < 10 || number % 100 >= 20)) {
        return words[1];
    }

    return words[2];
};
