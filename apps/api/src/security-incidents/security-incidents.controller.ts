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
import { CreateSecurityIncidentDto } from './dto/create-security-incident.dto';
import { UpdateSecurityIncidentDto } from './dto/update-security-incident.dto';
import { SecurityIncidentsService } from './security-incidents.service';

@ApiTags('security-incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('security/incidents')
export class SecurityIncidentsController {
  constructor(private readonly securityIncidentsService: SecurityIncidentsService) {}

  @Get()
  @RequirePermissions('security.read')
  list() {
    return this.securityIncidentsService.list();
  }

  @Get(':id')
  @RequirePermissions('security.read')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.securityIncidentsService.getById(id);
  }

  @Post()
  @RequirePermissions('security.incident.manage')
  create(
    @Body() dto: CreateSecurityIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.securityIncidentsService.create(
      dto,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id')
  @RequirePermissions('security.incident.manage')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSecurityIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.securityIncidentsService.update(
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
