import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ReportsService } from './reports.service';

@ApiTags('dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('clinic-admin')
  clinicAdmin(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.clinicAdminDashboard(user);
  }

  @Get('reception')
  reception(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.receptionDashboard(user);
  }

  @Get('doctor')
  doctor(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.doctorDashboard(user);
  }

  @Get('qa')
  qa(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.qaDashboard(user);
  }

  @Get('security')
  security(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.securityDashboard(user);
  }

  @Get('patient')
  patient(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.patientDashboard(user);
  }
}
