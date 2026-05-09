import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [AuditLogModule, ClinicsModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
