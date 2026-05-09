import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
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
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { QaTestCasesService } from './qa-test-cases.service';

@ApiTags('qa-test-cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('qa')
export class QaTestCasesController {
  constructor(private readonly qaTestCasesService: QaTestCasesService) {}

  @Get('test-suites')
  @RequirePermissions('qa.read')
  listSuites(@CurrentUser() user: AuthenticatedUser) {
    return this.qaTestCasesService.listSuites(user);
  }

  @Post('test-suites')
  @RequirePermissions('qa.manage')
  createSuite(
    @Body() dto: CreateTestSuiteDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaTestCasesService.createSuite(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Get('test-cases')
  @RequirePermissions('qa.read')
  listCases(@CurrentUser() user: AuthenticatedUser) {
    return this.qaTestCasesService.listCases(user);
  }

  @Post('test-cases')
  @RequirePermissions('qa.manage')
  createCase(
    @Body() dto: CreateTestCaseDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.qaTestCasesService.createCase(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Get('test-cases/:id')
  @RequirePermissions('qa.read')
  getCase(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.qaTestCasesService.getCase(id, user);
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
