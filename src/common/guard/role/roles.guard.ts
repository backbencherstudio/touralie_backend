import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { ADMIN_ACCESS_ROLES, Role } from './role.enum';
import { UserRepository } from '../../../common/repository/user/user.repository';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    const userDetails = await this.userRepository.getUserDetails(user.userId);

    if (!userDetails) {
      return false;
    }

    if (
      requiredRoles.some((role) => this.hasRoleAccess(userDetails.type, role))
    ) {
      return true;
    } else {
      throw new HttpException(
        'You do not have permission to access this resource',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private hasRoleAccess(userType: string, requiredRole: Role): boolean {
    if (userType === requiredRole) {
      return true;
    }

    if (requiredRole === Role.ADMIN) {
      return ADMIN_ACCESS_ROLES.includes(userType as Role);
    }

    return false;
  }
}
