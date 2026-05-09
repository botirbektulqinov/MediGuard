import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import { createIntegrationTestApp } from './test-app';

const password = 'DemoPass123!';

async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.securityFinding.deleteMany();
  await prisma.securityIncident.deleteMany();
  await prisma.suspiciousActivityEvent.deleteMany();
  await prisma.suspiciousActivityRule.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}

async function seedSecurityData(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash(password, 12);
  const securityRead = await prisma.permission.create({
    data: { key: 'security.read', description: 'security.read permission' },
    select: { id: true },
  });
  const securityManage = await prisma.permission.create({
    data: { key: 'security.incident.manage', description: 'security.incident.manage permission' },
    select: { id: true },
  });
  const securityRole = await prisma.role.create({
    data: {
      name: 'SECURITY_OFFICER',
      description: 'Security officer',
      permissions: {
        create: [{ permissionId: securityRead.id }, { permissionId: securityManage.id }],
      },
    },
    select: { id: true },
  });
  const patientRole = await prisma.role.create({
    data: { name: 'PATIENT', description: 'Patient' },
    select: { id: true },
  });

  await prisma.user.create({
    data: {
      email: 'security@demo.com',
      firstName: 'Sam',
      lastName: 'Security',
      passwordHash,
      roles: { create: { roleId: securityRole.id } },
    },
  });
  await prisma.user.create({
    data: {
      email: 'patient@demo.com',
      firstName: 'Pat',
      lastName: 'Patient',
      passwordHash,
      roles: { create: { roleId: patientRole.id } },
    },
  });
}

describe('Security Center integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createIntegrationTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await seedSecurityData(prisma);
  });

  afterAll(async () => {
    if (prisma) await resetDatabase(prisma);
    if (app) await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  }

  it('detects failed login activity and creates an incident', async () => {
    const securityToken = await login('security@demo.com');
    const patientToken = await login('patient@demo.com');

    await request(app.getHttpServer())
      .get('/api/security/dashboard')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);

    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'missing@demo.com', password: 'WrongPass123!' })
        .expect(401);
    }

    const events = await request(app.getHttpServer())
      .post('/api/security/suspicious-activity/evaluate')
      .set('Authorization', `Bearer ${securityToken}`)
      .expect(201);

    const failedLoginEvent = events.body.find(
      (event: { type: string }) => event.type === 'TOO_MANY_FAILED_LOGINS',
    );
    expect(failedLoginEvent).toBeDefined();

    const incident = await request(app.getHttpServer())
      .post('/api/security/incidents')
      .set('Authorization', `Bearer ${securityToken}`)
      .send({
        sourceEventId: failedLoginEvent.id,
        title: 'Repeated failed logins',
        description: 'Security officer opened incident from suspicious activity event.',
        severity: 'HIGH',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/security/incidents/${incident.body.id}`)
      .set('Authorization', `Bearer ${securityToken}`)
      .send({ status: 'INVESTIGATING', remediationNotes: 'Review IP and account targets.' })
      .expect(200);

    const auditLogs = await request(app.getHttpServer())
      .get('/api/security/audit-logs?action=SECURITY_INCIDENT')
      .set('Authorization', `Bearer ${securityToken}`)
      .expect(200);
    expect(auditLogs.body.length).toBeGreaterThanOrEqual(2);
  });
});
