import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    validateUser(email: string, password: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        role: string;
        createdAt: Date;
    } | null>;
    login(user: {
        id: string;
        email: string;
        role: string;
    }): Promise<{
        access_token: string;
    }>;
}
