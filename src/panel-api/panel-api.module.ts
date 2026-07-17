import { Module } from '@nestjs/common';
import { PanelApiService } from './panel-api.service';
import { PanelApiController } from './panel-api.controller';
import { DevicesModule } from '../devices/devices.module';
import { AuditEventsModule } from '../audit-events/audit-events.module';
import { ResidentsModule } from '../residents/residents.module';

@Module({
  imports: [DevicesModule, AuditEventsModule, ResidentsModule],
  controllers: [PanelApiController],
  providers: [PanelApiService],
})
export class PanelApiModule {}
