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
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @RequirePermissions('room.manage')
  list(@CurrentUser() user: AuthenticatedUser, @Query('branchId') branchId?: string) {
    return this.roomsService.list(user, branchId);
  }

  @Post()
  @RequirePermissions('room.manage')
  create(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.roomsService.create(dto, user, this.contextFromRequest(request, userAgent));
  }

  @Patch(':id')
  @RequirePermissions('room.manage')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.roomsService.update(id, dto, user, this.contextFromRequest(request, userAgent));
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
