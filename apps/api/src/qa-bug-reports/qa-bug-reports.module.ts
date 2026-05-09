import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QaBugReportsController } from './qa-bug-reports.controller';
import { QaBugReportsService } from './qa-bug-reports.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [QaBugReportsController],
  providers: [QaBugReportsService],
})
export class QaBugReportsModule {}
