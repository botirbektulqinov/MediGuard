import { Controller, Get, Headers, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PatientPortalService } from './patient-portal.service';

@ApiTags('patient-portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patient-portal')
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('visits')
  visits(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientPortalService.visitHistory(
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Get('lab-results')
  labResults(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientPortalService.labResults(user, this.contextFromRequest(request, userAgent));
  }

  @Get('lab-results/:id')
  labResultById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientPortalService.labResultById(
      id,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
