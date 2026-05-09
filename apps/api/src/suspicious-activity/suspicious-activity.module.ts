import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuspiciousActivityController } from './suspicious-activity.controller';
import { SuspiciousActivityService } from './suspicious-activity.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [SuspiciousActivityController],
  providers: [SuspiciousActivityService],
  exports: [SuspiciousActivityService],
})
export class SuspiciousActivityModule {}
