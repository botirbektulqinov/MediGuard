import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const roles = [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'LAB_TECHNICIAN',
  'QA_MANAGER',
  'SECURITY_OFFICER',
  'PATIENT',
] as const;

const permissions = [
  'users.read',
  'users.manage',
  'roles.read',
  'roles.manage',
  'permissions.read',
  'permissions.manage',
  'audit.read',
  'auth.me',
  'clinic.manage',
  'branch.manage',
  'room.manage',
  'service.manage',
  'staff.read',
  'staff.manage',
  'patient.read',
  'patient.create',
  'patient.update',
  'patient.sensitive.read',
  'appointment.read',
  'appointment.create',
  'appointment.update',
  'appointment.cancel',
  'doctor-schedule.manage',
  'queue.read',
  'queue.manage',
  'visit.read',
  'visit.create',
  'visit.update',
  'lab.read',
  'lab.upload',
  'lab.publish',
  'qa.read',
  'qa.manage',
  'qa.execute',
  'security.read',
  'security.incident.manage',
  'reports.read',
] as const;

const rolePermissions: Record<(typeof roles)[number], string[]> = {
  SUPER_ADMIN: [...permissions],
  CLINIC_ADMIN: [
    'users.read',
    'roles.read',
    'audit.read',
    'clinic.manage',
    'branch.manage',
    'room.manage',
    'service.manage',
    'staff.read',
    'staff.manage',
    'patient.read',
    'appointment.read',
    'appointment.update',
    'appointment.cancel',
    'doctor-schedule.manage',
    'reports.read',
  ],
  RECEPTIONIST: [
    'patient.read',
    'patient.create',
    'patient.update',
    'appointment.read',
    'appointment.create',
    'appointment.update',
    'appointment.cancel',
    'queue.read',
    'queue.manage',
  ],
  DOCTOR: [
    'patient.read',
    'patient.sensitive.read',
    'appointment.read',
    'queue.read',
    'visit.read',
    'visit.create',
    'visit.update',
    'lab.read',
  ],
  LAB_TECHNICIAN: ['patient.read', 'lab.read', 'lab.upload', 'lab.publish'],
  QA_MANAGER: ['qa.read', 'qa.manage', 'qa.execute', 'reports.read'],
  SECURITY_OFFICER: ['audit.read', 'security.read', 'security.incident.manage', 'reports.read'],
  PATIENT: [
    'auth.me',
    'appointment.read',
    'appointment.create',
    'appointment.cancel',
    'visit.read',
    'lab.read',
  ],
};

const demoUsers = [
  ['admin@demo.com', 'System', 'Admin', 'SUPER_ADMIN'],
  ['clinic.admin@demo.com', 'Clinic', 'Admin', 'CLINIC_ADMIN'],
  ['reception@demo.com', 'Riley', 'Reception', 'RECEPTIONIST'],
  ['doctor@demo.com', 'Dana', 'Doctor', 'DOCTOR'],
  ['lab@demo.com', 'Lee', 'Lab', 'LAB_TECHNICIAN'],
  ['qa@demo.com', 'Quinn', 'QA', 'QA_MANAGER'],
  ['security@demo.com', 'Sam', 'Security', 'SECURITY_OFFICER'],
  ['patient@demo.com', 'Pat', 'Patient', 'PATIENT'],
] as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);

  const permissionRecords = new Map<string, { id: string }>();
  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: `${key} permission`,
      },
      select: { id: true },
    });
    permissionRecords.set(key, permission);
  }

  const roleRecords = new Map<string, { id: string }>();
  for (const name of roles) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name.replaceAll('_', ' ').toLowerCase()} role`,
      },
      select: { id: true },
    });
    roleRecords.set(name, role);

    for (const permissionKey of rolePermissions[name]) {
      const permission = permissionRecords.get(permissionKey);
      if (!permission) {
        throw new Error(`Missing permission ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const userRecords = new Map<string, { id: string }>();
  for (const [email, firstName, lastName, roleName] of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        firstName,
        lastName,
        passwordHash,
      },
      select: { id: true },
    });
    userRecords.set(email, user);

    const role = roleRecords.get(roleName);
    if (!role) {
      throw new Error(`Missing role ${roleName}`);
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
  }

  const clinic = await prisma.clinic.upsert({
    where: { slug: 'mediguard-demo-clinic' },
    update: {
      name: 'MediGuard Demo Clinic',
      phone: '+1-555-0100',
      email: 'clinic.admin@demo.com',
      address: '100 Secure Care Avenue',
      timezone: 'America/New_York',
    },
    create: {
      name: 'MediGuard Demo Clinic',
      slug: 'mediguard-demo-clinic',
      phone: '+1-555-0100',
      email: 'clinic.admin@demo.com',
      address: '100 Secure Care Avenue',
      timezone: 'America/New_York',
    },
    select: { id: true },
  });

  const branch = await prisma.branch.upsert({
    where: { clinicId_code: { clinicId: clinic.id, code: 'MAIN' } },
    update: {
      name: 'Main Branch',
      address: '100 Secure Care Avenue',
      phone: '+1-555-0101',
    },
    create: {
      clinicId: clinic.id,
      name: 'Main Branch',
      code: 'MAIN',
      address: '100 Secure Care Avenue',
      phone: '+1-555-0101',
    },
    select: { id: true },
  });

  const room = await prisma.room.upsert({
    where: { branchId_code: { branchId: branch.id, code: 'EXAM-1' } },
    update: {
      name: 'Exam Room 1',
      type: 'EXAM',
      capacity: 1,
      isActive: true,
    },
    create: {
      branchId: branch.id,
      name: 'Exam Room 1',
      code: 'EXAM-1',
      type: 'EXAM',
      capacity: 1,
    },
    select: { id: true },
  });

  await prisma.clinicService.upsert({
    where: { clinicId_code: { clinicId: clinic.id, code: 'CONSULT' } },
    update: {
      name: 'General Consultation',
      description: 'Standard primary care consultation',
      durationMinutes: 30,
      priceCents: 7500,
      isActive: true,
    },
    create: {
      clinicId: clinic.id,
      name: 'General Consultation',
      code: 'CONSULT',
      description: 'Standard primary care consultation',
      durationMinutes: 30,
      priceCents: 7500,
    },
  });

  const staffSeeds = [
    ['clinic.admin@demo.com', 'EMP-1000', 'Clinic Administrator', 'Administration'],
    ['reception@demo.com', 'EMP-1001', 'Receptionist', 'Front Desk'],
    ['doctor@demo.com', 'EMP-1002', 'Physician', 'Clinical'],
    ['lab@demo.com', 'EMP-1003', 'Lab Technician', 'Laboratory'],
    ['qa@demo.com', 'EMP-1004', 'QA Manager', 'Quality'],
    ['security@demo.com', 'EMP-1005', 'Security Officer', 'Security'],
  ] as const;

  for (const [email, employeeCode, jobTitle, department] of staffSeeds) {
    const user = userRecords.get(email);
    if (!user) {
      throw new Error(`Missing demo user ${email}`);
    }

    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: {
        clinicId: clinic.id,
        branchId: branch.id,
        employeeCode,
        jobTitle,
        department,
        isActive: true,
      },
      create: {
        userId: user.id,
        clinicId: clinic.id,
        branchId: branch.id,
        employeeCode,
        jobTitle,
        department,
      },
    });
  }

  const doctorUser = userRecords.get('doctor@demo.com');
  if (!doctorUser) {
    throw new Error('Missing doctor demo user');
  }

  const doctorStaff = await prisma.staffProfile.findUniqueOrThrow({
    where: { userId: doctorUser.id },
    select: { id: true },
  });

  const doctor = await prisma.doctorProfile.upsert({
    where: { staffProfileId: doctorStaff.id },
    update: {
      specialty: 'Family Medicine',
      licenseNumber: 'MD-1002',
      consultationRoomId: room.id,
      schedule: {
        monday: [{ startsAt: '09:00', endsAt: '17:00' }],
        wednesday: [{ startsAt: '09:00', endsAt: '17:00' }],
      },
    },
    create: {
      staffProfileId: doctorStaff.id,
      specialty: 'Family Medicine',
      licenseNumber: 'MD-1002',
      consultationRoomId: room.id,
      schedule: {
        monday: [{ startsAt: '09:00', endsAt: '17:00' }],
        wednesday: [{ startsAt: '09:00', endsAt: '17:00' }],
      },
    },
    select: { id: true },
  });

  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    const existingSchedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId: doctor.id,
        branchId: branch.id,
        dayOfWeek,
        startsAt: '09:00',
        endsAt: '17:00',
      },
      select: { id: true },
    });

    if (existingSchedule) {
      await prisma.doctorSchedule.update({
        where: { id: existingSchedule.id },
        data: {
          clinicId: clinic.id,
          slotMinutes: 30,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveUntil: null,
          isActive: true,
        },
      });
    } else {
      await prisma.doctorSchedule.create({
        data: {
          clinicId: clinic.id,
          branchId: branch.id,
          doctorId: doctor.id,
          dayOfWeek,
          startsAt: '09:00',
          endsAt: '17:00',
          slotMinutes: 30,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
    }
  }

  const patientUser = userRecords.get('patient@demo.com');
  if (!patientUser) {
    throw new Error('Missing patient demo user');
  }

  const patient = await prisma.patientProfile.upsert({
    where: {
      clinicId_medicalRecordNumber: {
        clinicId: clinic.id,
        medicalRecordNumber: 'MRN-1001',
      },
    },
    update: {
      userId: patientUser.id,
      firstName: 'Pat',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      primaryDoctorId: doctor.id,
      medicalNotes: 'Sensitive demo note for authorization regression tests.',
    },
    create: {
      userId: patientUser.id,
      clinicId: clinic.id,
      medicalRecordNumber: 'MRN-1001',
      firstName: 'Pat',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      gender: 'UNKNOWN',
      primaryDoctorId: doctor.id,
      medicalNotes: 'Sensitive demo note for authorization regression tests.',
    },
    select: { id: true },
  });

  await prisma.patientContact.upsert({
    where: { patientId: patient.id },
    update: {
      phone: '+1-555-0199',
      email: 'patient@demo.com',
      address: '200 Patient Road',
      city: 'Demo City',
    },
    create: {
      patientId: patient.id,
      phone: '+1-555-0199',
      email: 'patient@demo.com',
      address: '200 Patient Road',
      city: 'Demo City',
    },
  });

  const existingEmergencyContact = await prisma.patientEmergencyContact.findFirst({
    where: { patientId: patient.id, fullName: 'Jordan Patient' },
    select: { id: true },
  });
  if (!existingEmergencyContact) {
    await prisma.patientEmergencyContact.create({
      data: {
        patientId: patient.id,
        fullName: 'Jordan Patient',
        relationship: 'Spouse',
        phone: '+1-555-0188',
      },
    });
  }

  const qaUser = userRecords.get('qa@demo.com');
  const existingQaSuite = await prisma.testSuite.findFirst({
    where: { name: 'Core Clinic Workflow Regression', featureArea: 'Appointments' },
    select: { id: true },
  });
  const qaSuite =
    existingQaSuite ??
    (await prisma.testSuite.create({
      data: {
        name: 'Core Clinic Workflow Regression',
        featureArea: 'Appointments',
        description: 'Smoke and regression coverage for booking, queue, visit, and lab flow.',
        ...(qaUser ? { createdByUserId: qaUser.id } : {}),
      },
      select: { id: true },
    }));

  const existingQaCase = await prisma.testCase.findFirst({
    where: {
      suiteId: qaSuite.id,
      title: 'Patient booking reaches completed consultation',
    },
    select: { id: true },
  });
  if (!existingQaCase) {
    await prisma.testCase.create({
      data: {
        suiteId: qaSuite.id,
        title: 'Patient booking reaches completed consultation',
        featureArea: 'Appointments',
        description: 'End-to-end operational smoke test for the core patient flow.',
        preconditions: 'Demo patient, doctor, and receptionist accounts exist.',
        steps:
          'Patient books appointment; reception confirms and queues; doctor starts consultation and completes visit.',
        expectedResult: 'Appointment status history reaches COMPLETED and audit logs are created.',
        priority: 'CRITICAL',
        isRequired: true,
        ...(qaUser ? { createdByUserId: qaUser.id } : {}),
      },
    });
  }

  const securityRules = [
    [
      'TOO_MANY_FAILED_LOGINS',
      'Too many failed logins',
      'Detects repeated failed login attempts by email or IP address.',
      'HIGH',
      5,
      15,
    ],
    [
      'EXCESSIVE_PATIENT_PROFILE_VIEWS',
      'Excessive patient profile views',
      'Detects users viewing many patient profiles in a short window.',
      'HIGH',
      10,
      15,
    ],
    [
      'DISABLED_USER_LOGIN',
      'Disabled user attempted login',
      'Detects login attempts against disabled accounts.',
      'MEDIUM',
      1,
      60,
    ],
    [
      'ROLE_PERMISSION_CHANGED',
      'Role or permission changed',
      'Detects role assignment or permission assignment audit events.',
      'HIGH',
      1,
      60,
    ],
    [
      'REPEATED_LAB_RESULT_DOWNLOAD',
      'Repeated lab result download',
      'Detects repeated downloads of the same medical attachment.',
      'HIGH',
      3,
      30,
    ],
    [
      'PATIENT_RECORD_OUTSIDE_APPOINTMENT',
      'Patient record accessed outside appointment context',
      'Detects audited patient profile access without appointment-context evidence.',
      'MEDIUM',
      1,
      60,
    ],
  ] as const;

  for (const [type, name, description, severity, threshold, windowMinutes] of securityRules) {
    await prisma.suspiciousActivityRule.upsert({
      where: { type },
      update: { name, description, severity, threshold, windowMinutes, isEnabled: true },
      create: { type, name, description, severity, threshold, windowMinutes },
    });
  }

  const securityUser = userRecords.get('security@demo.com');
  const existingFinding = await prisma.securityFinding.findFirst({
    where: {
      title: 'Refresh tokens stored in browser localStorage',
      affectedModule: 'Frontend Auth',
    },
    select: { id: true },
  });
  if (!existingFinding) {
    await prisma.securityFinding.create({
      data: {
        title: 'Refresh tokens stored in browser localStorage',
        description:
          'The current portfolio frontend stores refresh tokens in browser localStorage for demo simplicity.',
        severity: 'MEDIUM',
        affectedModule: 'Frontend Auth',
        evidence: { storage: 'localStorage', recommendedControl: 'HttpOnly secure cookie' },
        remediation:
          'Move refresh tokens to HttpOnly Secure SameSite cookies before production use.',
        ...(securityUser ? { createdByUserId: securityUser.id } : {}),
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
