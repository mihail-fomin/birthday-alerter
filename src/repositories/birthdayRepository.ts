import { prisma } from '../services/prismaService';
import { Birthday } from '@prisma/client';

export interface CreateBirthdayDto {
    name: string;
    day: number;
    month: number;
    year?: number | null;
}

export interface UpdateBirthdayDto {where: Partial<Birthday>}

class BirthdayRepository {
    async create(data: CreateBirthdayDto): Promise<Birthday> {
        return prisma.birthday.create({
            data,
        });
    }

    async findAll(): Promise<Birthday[]> {
        return prisma.birthday.findMany();
    }

    async getBirthdayBoyByName(name: string): Promise<Birthday | null> {
        return await prisma.birthday.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            },
        });
    }

    async getBirthdayBoysByName(name: string): Promise<Birthday[]> {
        return await prisma.birthday.findMany({
            where: {
                name: {
                    contains: name,
                    mode: 'insensitive',
                }
            },
        });
    }
    

    async deleteBirthDay(id: string): Promise<Birthday> {
        return prisma.birthday.delete(
            {where: {
                id
            }}
        )
    }
}

export const birthdayRepository = new BirthdayRepository();

