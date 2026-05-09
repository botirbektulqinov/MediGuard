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
import { ClinicServicesService } from './clinic-services.service';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import { UpdateClinicServiceDto } from './dto/update-clinic-service.dto';

@ApiTags('clinic-services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clinic-services')
export class ClinicServicesController {
  constructor(private readonly clinicServicesService: ClinicServicesService) {}

  @Get()
  @RequirePermissions('service.manage')
  list(@CurrentUser() user: AuthenticatedUser, @Query('clinicId') clinicId?: string) {
    return this.clinicServicesService.list(user, clinicId);
  }

  @Post()
  @RequirePermissions('service.manage')
  create(
    @Body() dto: CreateClinicServiceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.clinicServicesService.create(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id')
  @RequirePermissions('service.manage')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClinicServiceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.clinicServicesService.update(
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
