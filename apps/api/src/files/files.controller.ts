import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const download = await this.filesService.getDownload(
      id,
      user,
      this.contextFromRequest(request, userAgent),
    );

    return new StreamableFile(download.stream, {
      type: download.mimeType,
      disposition: `attachment; filename="${download.originalName}"`,
    });
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
