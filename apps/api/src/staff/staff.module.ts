import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [AuditLogModule, ClinicsModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
