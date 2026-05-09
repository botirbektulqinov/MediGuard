import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QaTestRunsController } from './qa-test-runs.controller';
import { QaTestRunsService } from './qa-test-runs.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [QaTestRunsController],
  providers: [QaTestRunsService],
  exports: [QaTestRunsService],
})
export class QaTestRunsModule {}
