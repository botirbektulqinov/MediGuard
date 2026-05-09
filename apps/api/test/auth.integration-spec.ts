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
  await prisma.releaseGateCheck.deleteMany();
  await prisma.releaseGate.deleteMany();
  await prisma.bugReport.deleteMany();
  await prisma.testRunResult.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.testSuite.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.patientEmergencyContact.deleteMany();
  await prisma.patientContact.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.clinicService.deleteMany();
  await prisma.room.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.clinic.deleteMany();
}

async function seedAuthData(prisma: PrismaService): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  const usersRead = await prisma.permission.create({
    data: { key: 'users.read', description: 'Read users' },
  });
  const auditRead = await prisma.permission.create({
    data: { key: 'audit.read', description: 'Read audit logs' },
  });
  const role = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      description: 'Super admin',
      permissions: {
        create: [{ permissionId: usersRead.id }, { permissionId: auditRead.id }],
      },
    },
  });

  for (const user of [
    { email: 'admin@demo.com', status: 'ACTIVE' as const },
    { email: 'lockout@demo.com', status: 'ACTIVE' as const },
    { email: 'disabled@demo.com', status: 'DISABLED' as const },
  ]) {
    await prisma.user.create({
      data: {
        email: user.email,
        firstName: 'Test',
        lastName: 'User',
        passwordHash,
        status: user.status,
        roles: {
          create: { roleId: role.id },
        },
      },
    });
  }
}

describe('Auth integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createIntegrationTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await seedAuthData(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await resetDatabase(prisma);
    }
    if (app) {
      await app.close();
    }
  });

  it('logs in, refreshes, gets current user, and logs out', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password })
      .expect(200);

    expect(loginResponse.body.user.email).toBe('admin@demo.com');
    expect(loginResponse.body.user.passwordHash).toBeUndefined();
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(200);

    expect(refreshResponse.body.refreshToken).not.toBe(loginResponse.body.refreshToken);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
      .send({ refreshToken: refreshResponse.body.refreshToken })
      .expect(200);
  });

  it('rejects refresh token reuse and revokes the token family', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password })
      .expect(200);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshResponse.body.refreshToken })
      .expect(401);

    const reuseAuditLog = await prisma.auditLog.findFirst({
      where: { action: 'AUTH_REFRESH_REUSE_DETECTED' },
    });
    expect(reuseAuditLog).toBeTruthy();
  });

  it('rejects logout when the refresh token does not belong to the user session', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({ refreshToken: 'not-a-valid-refresh-token-value-with-enough-length' })
      .expect(401);

    const invalidLogoutAuditLog = await prisma.auditLog.findFirst({
      where: { action: 'AUTH_LOGOUT_INVALID_REFRESH_TOKEN' },
    });
    expect(invalidLogoutAuditLog).toBeTruthy();
  });

  it('rejects invalid credentials and tracks failed login attempts', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'wrong' })
      .expect(401);

    const failedAttempt = await prisma.loginAttempt.findFirst({
      where: { email: 'admin@demo.com', success: false },
    });
    expect(failedAttempt).toBeTruthy();
  });

  it('locks an account after repeated failed attempts', async () => {
    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'lockout@demo.com', password: 'wrong' });
    }

    const lockedUser = await prisma.user.findUnique({ where: { email: 'lockout@demo.com' } });
    expect(lockedUser?.lockedUntil).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'lockout@demo.com', password })
      .expect(403);
  });

  it('rejects disabled accounts', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'disabled@demo.com', password })
      .expect(403);
  });

  it('rejects missing and invalid bearer tokens', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
