import { Module } from '@nestjs/common';
import { VirtualKeysService } from './virtual-keys.service';
import {
  VirtualKeysController,
  ResidentVisitorPassesController,
  PanelVisitorPinController,
  PanelVirtualKeysController,
} from './virtual-keys.controller';
import { VirtualKeySigningService } from './virtual-key-signing.service';
import { DeliveryAuthorizationsModule } from '../delivery-authorizations/delivery-authorizations.module';

@Module({
  imports: [DeliveryAuthorizationsModule],
  controllers: [
    VirtualKeysController,
    ResidentVisitorPassesController,
    PanelVisitorPinController,
    PanelVirtualKeysController,
  ],
  providers: [VirtualKeysService, VirtualKeySigningService],
})
export class VirtualKeysModule {}
