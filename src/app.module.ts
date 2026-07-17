import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ResidentAuthModule } from './resident-auth/resident-auth.module';
import { OwnersModule } from './owners/owners.module';
import { SitesModule } from './sites/sites.module';
import { EntryPointsModule } from './entry-points/entry-points.module';
import { DevicesModule } from './devices/devices.module';
import { UnitsModule } from './units/units.module';
import { ZonesModule } from './zones/zones.module';
import { ResidentsModule } from './residents/residents.module';
import { CardFobsModule } from './card-fobs/card-fobs.module';
import { VirtualKeysModule } from './virtual-keys/virtual-keys.module';
import { DeliveryAuthorizationsModule } from './delivery-authorizations/delivery-authorizations.module';
import { AuditEventsModule } from './audit-events/audit-events.module';
import { SiteIntegrationsModule } from './site-integrations/site-integrations.module';
import { PartnerApiKeysModule } from './partner-api-keys/partner-api-keys.module';
import { PartnerApiModule } from './partner-api/partner-api.module';
import { PanelApiModule } from './panel-api/panel-api.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ResidentAuthModule,
    OwnersModule,
    SitesModule,
    EntryPointsModule,
    DevicesModule,
    UnitsModule,
    ZonesModule,
    ResidentsModule,
    CardFobsModule,
    VirtualKeysModule,
    DeliveryAuthorizationsModule,
    AuditEventsModule,
    SiteIntegrationsModule,
    PartnerApiKeysModule,
    PartnerApiModule,
    PanelApiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
