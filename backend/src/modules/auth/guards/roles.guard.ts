import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

export const Roles = (...roles: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata('roles', roles, descriptor ? descriptor.value : target)
    return descriptor || target
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler()
    const clazz = context.getClass()
    // 同時查 method 層級同 class 層級 metadata（@Roles 定義喺 controller class 上）
    const requiredRoles =
      this.reflector.get<string[]>('roles', handler) ||
      this.reflector.get<string[]>('roles', clazz)
    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }
    return true
  }
}
