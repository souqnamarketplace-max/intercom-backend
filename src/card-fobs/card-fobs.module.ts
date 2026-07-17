import { Module } from '@nestjs/common';
import { CardFobsService } from './card-fobs.service';
import { CardFobsController } from './card-fobs.controller';

@Module({
  controllers: [CardFobsController],
  providers: [CardFobsService],
})
export class CardFobsModule {}
