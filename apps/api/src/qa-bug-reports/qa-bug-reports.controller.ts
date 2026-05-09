import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseBoolPipe,
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
import { CreateBugReportDto } from './dto/create-bug-report.dto';
import { UpdateBugStatusDto } from './dto/update-bug-status.dto';
import { QaBugReportsService } from './qa-bug-reports.service';

@ApiTags('qa-bug-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('qa/bug-reports')
export class QaBugReportsController {
  constructor(private readonly qaBugReportsService: QaBugReportsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('assignedToMe', new ParseBoolPipe({ optional: true })) assignedToMe?: boolean,
  ) {
    return this.qaBugReportsService.list(user, assignedToMe);
  }

  @Post()
  @RequirePermissions('qa.manage')
  create(
    @Body() dto: CreateBugReportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaBugReportsService.create(dto, user, this.contextFromRequest(request, userAgent));
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBugStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaBugReportsService.updateStatus(
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
