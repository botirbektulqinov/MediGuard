import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuditLogModule } from './audit-log/audit-log.module';
import { AuditLogViewerModule } from './audit-log-viewer/audit-log-viewer.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { ClinicsModule } from './clinics/clinics.module';
import { envValidationSchema } from './config/env.schema';
import { AppointmentsModule } from './appointments/appointments.module';
import { DoctorScheduleModule } from './doctor-schedule/doctor-schedule.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { LabResultsModule } from './lab-results/lab-results.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { PatientsModule } from './patients/patients.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { PrismaModule } from './prisma/prisma.module';
import { QaBugReportsModule } from './qa-bug-reports/qa-bug-reports.module';
import { QaReleaseGatesModule } from './qa-release-gates/qa-release-gates.module';
import { QaTestCasesModule } from './qa-test-cases/qa-test-cases.module';
import { QaTestRunsModule } from './qa-test-runs/qa-test-runs.module';
import { RolesModule } from './roles/roles.module';
import { RoomsModule } from './rooms/rooms.module';
import { QueueModule } from './queue/queue.module';
import { ReportsModule } from './reports/reports.module';
import { SecurityCenterModule } from './security-center/security-center.module';
import { SecurityIncidentsModule } from './security-incidents/security-incidents.module';
import { ClinicServicesModule } from './services/clinic-services.module';
import { StaffModule } from './staff/staff.module';
import { SuspiciousActivityModule } from './suspicious-activity/suspicious-activity.module';
import { UsersModule } from './users/users.module';
import { VisitsModule } from './visits/visits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuditLogModule,
    UsersModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    ClinicsModule,
    BranchesModule,
    RoomsModule,
    ClinicServicesModule,
    StaffModule,
    PatientsModule,
    DoctorScheduleModule,
    AppointmentsModule,
    QueueModule,
    NotificationsModule,
    FilesModule,
    VisitsModule,
    PrescriptionsModule,
    LabResultsModule,
    PatientPortalModule,
    QaTestCasesModule,
    QaTestRunsModule,
    QaBugReportsModule,
    QaReleaseGatesModule,
    ReportsModule,
    SecurityCenterModule,
    SecurityIncidentsModule,
    SuspiciousActivityModule,
    AuditLogViewerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
