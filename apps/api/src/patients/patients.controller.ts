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
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientContactDto } from './dto/update-patient-contact.dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.patientsService.list(user, search);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('patient.create')
  create(
    @Body() dto: CreatePatientProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientsService.create(dto, user, this.contextFromRequest(request, userAgent));
  }

  @Get('me')
  getOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientsService.getOwn(user, this.contextFromRequest(request, userAgent));
  }

  @Get(':id')
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientsService.getById(id, user, this.contextFromRequest(request, userAgent));
  }

  @Patch(':id/contact')
  updateContact(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePatientContactDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.patientsService.updateContact(
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
