import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityCenterController } from './security-center.controller';
import { SecurityCenterService } from './security-center.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [SecurityCenterController],
  providers: [SecurityCenterService],
})
export class SecurityCenterModule {}
