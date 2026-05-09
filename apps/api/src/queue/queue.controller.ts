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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { EnqueueAppointmentDto } from './dto/enqueue-appointment.dto';
import { QueueService } from './queue.service';

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('today')
  listToday(@CurrentUser() user: AuthenticatedUser) {
    return this.queueService.listToday(user);
  }

  @Post()
  enqueue(
    @Body() dto: EnqueueAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.queueService.enqueue(
      dto.appointmentId,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id/start')
  start(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.queueService.startConsultation(
      id,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id/lab-required')
  labRequired(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.queueService.markLabRequired(id, user, this.contextFromRequest(request, userAgent));
  }

  @Patch(':id/complete')
  complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.queueService.complete(id, user, this.contextFromRequest(request, userAgent));
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
