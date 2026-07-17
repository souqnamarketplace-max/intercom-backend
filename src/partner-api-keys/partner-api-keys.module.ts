import { Module } from '@nestjs/common';
import { PartnerApiKeysService } from './partner-api-keys.service';
import { PartnerApiKeysController } from './partner-api-keys.controller';

@Module({
  controllers: [PartnerApiKeysController],
  providers: [PartnerApiKeysService],
  exports: [PartnerApiKeysService],
})
export class PartnerApiKeysModule {}
