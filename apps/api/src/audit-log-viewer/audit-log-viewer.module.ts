import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityCenterService } from '../security-center/security-center.service';
import { AuditLogViewerController } from './audit-log-viewer.controller';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AuditLogViewerController],
  providers: [SecurityCenterService],
})
export class AuditLogViewerModule {}
