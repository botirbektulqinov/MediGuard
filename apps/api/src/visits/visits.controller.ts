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
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitNotesDto } from './dto/update-visit-notes.dto';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  create(
    @Body() dto: CreateVisitDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.visitsService.create(dto, user, this.contextFromRequest(request, userAgent));
  }

  @Get(':id')
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.visitsService.getById(id, user, this.contextFromRequest(request, userAgent));
  }

  @Patch(':id/notes')
  updateNotes(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVisitNotesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.visitsService.updateNotes(
      id,
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Post(':id/lab-orders')
  createLabOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateLabOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.visitsService.createLabOrder(
      id,
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id/complete')
  complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.visitsService.complete(id, user, this.contextFromRequest(request, userAgent));
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
