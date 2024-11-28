import { User } from "@prisma/client";
import { prisma } from "../services/prismaService";

class UserRepository {
    async getUserByChatId(chatId: number): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { chatId },
        });
    
        return user;
    }
    
    async saveUserId(userId: number) {
        await prisma.user.create({
            data: {
                chatId: userId,
            },
        });
    }
    
    async getAllUsers() {
        return await prisma.user.findMany();
    }
}

export const userRepository = new UserRepository