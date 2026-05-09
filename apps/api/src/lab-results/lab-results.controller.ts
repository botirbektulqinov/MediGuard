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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import type { UploadedMedicalFile } from '../files/file-upload.types';
import { UploadLabResultDto } from './dto/upload-lab-result.dto';
import { LabResultsService } from './lab-results.service';

@ApiTags('lab-results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lab-results')
export class LabResultsController {
  constructor(private readonly labResultsService: LabResultsService) {}

  @Get('orders')
  listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.labResultsService.listOrders(user);
  }

  @Get(':id')
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.labResultsService.getById(id, user, this.contextFromRequest(request, userAgent));
  }

  @Post('orders/:orderId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadLabResultDto })
  upload(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() dto: UploadLabResultDto,
    @UploadedFile() file: UploadedMedicalFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.labResultsService.uploadResult(
      orderId,
      dto,
      file,
      user,
      this.contextFromRequest(request, userAgent),
    );
  }

  @Patch(':id/ready')
  markReady(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.labResultsService.markReady(id, user, this.contextFromRequest(request, userAgent));
  }

  private contextFromRequest(request: Request, userAgent?: string): RequestContext {
    return { ipAddress: request.ip, userAgent };
  }
}
