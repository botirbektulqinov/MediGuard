import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QaTestCasesController } from './qa-test-cases.controller';
import { QaTestCasesService } from './qa-test-cases.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [QaTestCasesController],
  providers: [QaTestCasesService],
  exports: [QaTestCasesService],
})
export class QaTestCasesModule {}
