import { Module } from '@nestjs/common';
import { DeliveryAuthorizationsService } from './delivery-authorizations.service';
import { DeliveryAuthorizationsController } from './delivery-authorizations.controller';

@Module({
  controllers: [DeliveryAuthorizationsController],
  providers: [DeliveryAuthorizationsService],
  exports: [DeliveryAuthorizationsService],
})
export class DeliveryAuthorizationsModule {}
