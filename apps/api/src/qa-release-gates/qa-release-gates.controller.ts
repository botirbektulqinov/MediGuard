import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { CreateReleaseGateDto } from './dto/create-release-gate.dto';
import { QaReleaseGatesService } from './qa-release-gates.service';

@ApiTags('qa-release-gates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('qa/release-gates')
export class QaReleaseGatesController {
  constructor(private readonly qaReleaseGatesService: QaReleaseGatesService) {}

  @Get()
  @RequirePermissions('qa.read')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.qaReleaseGatesService.list(user);
  }

  @Post()
  @RequirePermissions('qa.manage')
  create(
    @Body() dto: CreateReleaseGateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaReleaseGatesService.create(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
