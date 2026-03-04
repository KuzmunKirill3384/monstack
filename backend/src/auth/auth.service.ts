import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const hash = crypto
      .createHash('sha256')
      .update(password + (process.env.PASSWORD_SALT ?? 'salt'))
      .digest('hex');
    if (user.passwordHash !== hash) return null;
    return user;
  }

  signToken(user: User): string {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  login(user: User) {
    return {
      access_token: this.signToken(user),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const currentHash = crypto
      .createHash('sha256')
      .update(currentPassword + (process.env.PASSWORD_SALT ?? 'salt'))
      .digest('hex');
    if (user.passwordHash !== currentHash) throw new Error('Current password is wrong');
    const newHash = crypto
      .createHash('sha256')
      .update(newPassword + (process.env.PASSWORD_SALT ?? 'salt'))
      .digest('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }
}
