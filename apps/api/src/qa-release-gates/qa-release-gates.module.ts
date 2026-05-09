import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QaReleaseGatesController } from './qa-release-gates.controller';
import { QaReleaseGatesService } from './qa-release-gates.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [QaReleaseGatesController],
  providers: [QaReleaseGatesService],
})
export class QaReleaseGatesModule {}
