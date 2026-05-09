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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { DoctorScheduleService } from './doctor-schedule.service';

@ApiTags('doctor-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('doctor-schedules')
export class DoctorScheduleController {
  constructor(private readonly doctorScheduleService: DoctorScheduleService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('doctorId') doctorId?: string) {
    return this.doctorScheduleService.list(user, doctorId);
  }

  @Post()
  create(
    @Body() dto: CreateDoctorScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.doctorScheduleService.create(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDoctorScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.doctorScheduleService.update(
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
