import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuditLogQueryDto } from '../security-center/dto/audit-log-query.dto';
import { SecurityCenterService } from '../security-center/security-center.service';

@ApiTags('audit-log-viewer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('security/audit-log-viewer')
export class AuditLogViewerController {
  constructor(private readonly securityCenterService: SecurityCenterService) {}

  @Get()
  @RequirePermissions('security.read')
  search(@Query() query: AuditLogQueryDto) {
    return this.securityCenterService.auditLogs(query);
  }
}
