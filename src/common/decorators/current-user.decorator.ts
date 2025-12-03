import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '../interfaces/user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<Express.Request>();
    return request.user as JwtUser;
  },
);
