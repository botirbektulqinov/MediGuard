import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicAccessService } from './clinic-access.service';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';

@Module({
  imports: [AuditLogModule],
  controllers: [ClinicsController],
  providers: [ClinicAccessService, ClinicsService],
  exports: [ClinicAccessService],
})
export class ClinicsModule {}
