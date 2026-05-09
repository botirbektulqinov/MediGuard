import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { StartTestRunDto } from './dto/start-test-run.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { QaTestRunsService } from './qa-test-runs.service';

@ApiTags('qa-test-runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('qa/test-runs')
export class QaTestRunsController {
  constructor(private readonly qaTestRunsService: QaTestRunsService) {}

  @Get()
  @RequirePermissions('qa.read')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.qaTestRunsService.list(user);
  }

  @Post()
  @RequirePermissions('qa.execute')
  start(
    @Body() dto: StartTestRunDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaTestRunsService.start(dto, user, this.contextFromRequest(request, userAgent));
  }

  @Get(':id')
  @RequirePermissions('qa.read')
  getById(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.qaTestRunsService.getById(id, user);
  }

  @Get(':id/summary')
  @RequirePermissions('qa.read')
  async summary(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const run = await this.qaTestRunsService.getById(id, user);
    return this.qaTestRunsService.summary(run);
  }

  @Patch('results/:resultId')
  @RequirePermissions('qa.execute')
  updateResult(
    @Param('resultId', new ParseUUIDPipe()) resultId: string,
    @Body() dto: UpdateTestResultDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaTestRunsService.updateResult(
      resultId,
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
