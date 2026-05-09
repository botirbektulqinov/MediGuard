import { Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  imports: [AppointmentsModule, AuditLogModule, ClinicsModule, NotificationsModule],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
