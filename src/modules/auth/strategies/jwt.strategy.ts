import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import appConfig from '../../../config/app.config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig().jwt.secret,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deleted');
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkIn = await this.prisma.dailyCheckIn.findFirst({
        where: {
          user_id: payload.sub,
          created_at: {
            gte: today,
          },
        },
      });

      if (checkIn) {
        await this.prisma.dailyCheckIn.update({
          where: { id: checkIn.id },
          data: { last_active_at: new Date() },
        });
      } else {
        await this.prisma.dailyCheckIn.create({
          data: {
            user_id: payload.sub,
            created_at: new Date(),
            last_active_at: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error tracking user activity:', error);
    }

    return { userId: payload.sub, email: payload.email };
  }
}

