import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('reports.read')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('appointments-per-day')
  appointmentsPerDay(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.appointmentsPerDay(user);
  }

  @Get('queue-waiting-time')
  queueWaitingTime(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.queueWaitingTime(user);
  }

  @Get('doctor-workload')
  doctorWorkload(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.doctorWorkload(user);
  }

  @Get('test-pass-rate')
  @RequirePermissions('qa.read')
  testPassRate() {
    return this.reportsService.testPassRate();
  }

  @Get('open-bugs-by-severity')
  @RequirePermissions('qa.read')
  openBugsBySeverity() {
    return this.reportsService.openBugsBySeverity();
  }

  @Get('security-incidents-by-severity')
  @RequirePermissions('security.read')
  securityIncidentsBySeverity() {
    return this.reportsService.securityIncidentsBySeverity();
  }

  @Get('failed-login-trends')
  @RequirePermissions('security.read')
  failedLoginTrends() {
    return this.reportsService.failedLoginTrends();
  }
}
