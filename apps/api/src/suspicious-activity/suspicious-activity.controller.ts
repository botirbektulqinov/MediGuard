import { Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { SuspiciousActivityService } from './suspicious-activity.service';

@ApiTags('suspicious-activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('security/suspicious-activity')
export class SuspiciousActivityController {
  constructor(private readonly suspiciousActivityService: SuspiciousActivityService) {}

  @Get('rules')
  @RequirePermissions('security.read')
  listRules() {
    return this.suspiciousActivityService.listRules();
  }

  @Get('events')
  @RequirePermissions('security.read')
  listEvents() {
    return this.suspiciousActivityService.listEvents();
  }

  @Post('evaluate')
  @RequirePermissions('security.incident.manage')
  evaluate(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.suspiciousActivityService.evaluate(
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
