import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

export const Roles = (...roles: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata('roles', roles, descriptor ? descriptor.value : target)
    return descriptor || target
  }
}

/**
 * BuyerOnlyGuard：只允許 role='user' 的買家執行買家動作（投標/預訂/一口價等）。
 * seller/admin 不應扮演買家角色。
 */
@Injectable()
export class BuyerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest()
    if (user?.role !== 'user') {
      throw new ForbiddenException('只有用戶帳號可以執行此操作（商家與管理員不可投標/預訂/購買）')
    }
    return true
  }
}

/**
 * SellerGuard：只允許 role='seller' 上架商品（銷售是商家專屬功能）。
 */
@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest()
    if (user?.role !== 'seller') {
      throw new ForbiddenException('只有商家帳號可以上架商品')
    }
    return true
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
