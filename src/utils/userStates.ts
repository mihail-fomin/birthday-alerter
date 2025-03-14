// Состояние для отслеживания процесса ввода
export interface UserState {
    waitingFor: 'name' | 'date' | null;
    name?: string;
}

// Карта для хранения состояний пользователей
export const userStates = new Map<number, UserState>(); 