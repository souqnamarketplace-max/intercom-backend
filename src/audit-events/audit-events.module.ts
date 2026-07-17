import { Module } from '@nestjs/common';
import { AuditEventsService } from './audit-events.service';
import { AuditEventsController } from './audit-events.controller';

@Module({
  controllers: [AuditEventsController],
  providers: [AuditEventsService],
  exports: [AuditEventsService],
})
export class AuditEventsModule {}
