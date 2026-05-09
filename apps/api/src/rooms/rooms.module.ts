import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [AuditLogModule, ClinicsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
