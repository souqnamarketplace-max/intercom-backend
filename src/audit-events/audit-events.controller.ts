import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AuditEventsService } from './audit-events.service';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';

@Controller('audit-events')
export class AuditEventsController {
  constructor(private readonly service: AuditEventsService) {}

  // NOTE: intentionally not JwtAuthGuard-protected yet — real device ingestion
  // needs its own per-device auth (short-lived signed tokens per the security
  // decisions in the spec), not staff JWT. Locking this down is a next step,
  // not an oversight.
  @Post()
  create(@Body() dto: CreateAuditEventDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findForSite(
    @CurrentUser() user: AuthUser,
    @Query('siteId') siteId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.findForSite(user, siteId, cursor);
  }
}
