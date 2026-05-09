import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { CreateSecurityFindingDto } from './dto/create-security-finding.dto';
import { UpdateSecurityFindingDto } from './dto/update-security-finding.dto';
import { SecurityCenterService } from './security-center.service';

@ApiTags('security-center')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('security')
export class SecurityCenterController {
  constructor(private readonly securityCenterService: SecurityCenterService) {}

  @Get('dashboard')
  @RequirePermissions('security.read')
  dashboard() {
    return this.securityCenterService.dashboard();
  }

  @Get('failed-logins')
  @RequirePermissions('security.read')
  failedLogins() {
    return this.securityCenterService.failedLogins();
  }

  @Get('patient-access')
  @RequirePermissions('security.read')
  sensitivePatientAccessLogs() {
    return this.securityCenterService.sensitivePatientAccessLogs();
  }

  @Get('audit-logs')
  @RequirePermissions('security.read')
  auditLogs(@Query() query: AuditLogQueryDto) {
    return this.securityCenterService.auditLogs(query);
  }

  @Get('sessions')
  @RequirePermissions('security.read')
  sessions() {
    return this.securityCenterService.sessions();
  }

  @Patch('sessions/:id/revoke')
  @RequirePermissions('security.incident.manage')
  revokeSession(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.securityCenterService.revokeSession(
      id,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Get('findings')
  @RequirePermissions('security.read')
  findings() {
    return this.securityCenterService.findings();
  }

  @Post('findings')
  @RequirePermissions('security.incident.manage')
  createFinding(
    @Body() dto: CreateSecurityFindingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.securityCenterService.createFinding(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch('findings/:id')
  @RequirePermissions('security.incident.manage')
  updateFinding(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSecurityFindingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.securityCenterService.updateFinding(
      id,
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
