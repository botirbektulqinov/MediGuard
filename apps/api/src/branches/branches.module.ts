import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [AuditLogModule, ClinicsModule],
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
