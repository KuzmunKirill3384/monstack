import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString } from 'class-validator';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

class LoginDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  newPassword!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const token = this.auth.signToken(user);
    res.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
    });
    return { access_token: token };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.setCookie(COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      secure: process.env.NODE_ENV === 'production',
    });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  me(@Req() req: FastifyRequest & { user?: { id: string; email: string } }) {
    return req.user ?? { id: 'anonymous', email: 'anonymous' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Req() req: FastifyRequest & { user: { id: string; email: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }
    try {
      await this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && e.message === 'Current password is wrong') {
        throw new UnauthorizedException('Current password is wrong');
      }
      throw e;
    }
  }
}
