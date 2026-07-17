import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PartnerAuthContext } from '../guards/partner-api-key.guard';

export const CurrentPartner = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PartnerAuthContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.partnerAuth;
  },
);
