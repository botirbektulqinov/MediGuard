import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { ClinicServicesController } from './clinic-services.controller';
import { ClinicServicesService } from './clinic-services.service';

@Module({
  imports: [AuditLogModule, ClinicsModule],
  controllers: [ClinicServicesController],
  providers: [ClinicServicesService],
})
export class ClinicServicesModule {}
