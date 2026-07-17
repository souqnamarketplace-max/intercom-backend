import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ResidentAuthUser {
  id: string;
  unitId: string;
  siteId: string;
}

export const CurrentResident = createParamDecorator((_: unknown, ctx: ExecutionContext): ResidentAuthUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
