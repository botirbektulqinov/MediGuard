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
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
}

async function seedQaData(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash(password, 12);
  const permissions = new Map<string, { id: string }>();
  for (const key of ['qa.read', 'qa.manage', 'qa.execute']) {
    const permission = await prisma.permission.create({
      data: { key, description: key },
      select: { id: true },
    });
    permissions.set(key, permission);
  }

  const qaRole = await prisma.role.create({
    data: {
      name: 'QA_MANAGER',
      description: 'QA manager',
      permissions: {
        create: [...permissions.values()].map((permission) => ({ permissionId: permission.id })),
      },
    },
    select: { id: true },
  });
  const developerRole = await prisma.role.create({
    data: { name: 'DEVELOPER', description: 'Developer' },
    select: { id: true },
  });

  const qaUser = await prisma.user.create({
    data: {
      email: 'qa@demo.com',
      firstName: 'Quinn',
      lastName: 'QA',
      passwordHash,
      roles: { create: { roleId: qaRole.id } },
    },
    select: { id: true },
  });
  const developerUser = await prisma.user.create({
    data: {
      email: 'developer@demo.com',
      firstName: 'Dev',
      lastName: 'User',
      passwordHash,
      roles: { create: { roleId: developerRole.id } },
    },
    select: { id: true },
  });

  return { developerUser, qaUser };
}

describe('QA Center integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seeded: Awaited<ReturnType<typeof seedQaData>>;

  beforeAll(async () => {
    app = await createIntegrationTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    seeded = await seedQaData(prisma);
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

  it('runs QA failed-test to bug lifecycle and blocked release gate workflow', async () => {
    const qaToken = await login('qa@demo.com');
    const developerToken = await login('developer@demo.com');

    const suite = await request(app.getHttpServer())
      .post('/api/qa/test-suites')
      .set('Authorization', `Bearer ${qaToken}`)
      .send({
        name: 'Authentication Regression',
        featureArea: 'Authentication',
        description: 'Critical auth regression coverage',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/qa/test-cases')
      .set('Authorization', `Bearer ${qaToken}`)
      .send({
        suiteId: suite.body.id,
        title: 'Invalid login is rejected',
        featureArea: 'Authentication',
        steps: 'Submit invalid credentials',
        expectedResult: 'API returns 401 and records failed login',
        priority: 'CRITICAL',
        isRequired: true,
      })
      .expect(201);

    const run = await request(app.getHttpServer())
      .post('/api/qa/test-runs')
      .set('Authorization', `Bearer ${qaToken}`)
      .send({ suiteId: suite.body.id, name: 'Sprint 5 QA Run' })
      .expect(201);

    const resultId = run.body.results[0].id as string;
    const failedRun = await request(app.getHttpServer())
      .patch(`/api/qa/test-runs/results/${resultId}`)
      .set('Authorization', `Bearer ${qaToken}`)
      .send({ status: 'FAILED', actualResult: 'Invalid login returned 500' })
      .expect(200);
    expect(failedRun.body.status).toBe('COMPLETED');

    const bug = await request(app.getHttpServer())
      .post('/api/qa/bug-reports')
      .set('Authorization', `Bearer ${qaToken}`)
      .send({
        testRunResultId: resultId,
        title: 'Invalid login returns 500',
        description: 'Expected 401 but received 500.',
        severity: 'CRITICAL',
        featureArea: 'Authentication',
        assignedToUserId: seeded.developerUser.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/qa/bug-reports/${bug.body.id}/status`)
      .set('Authorization', `Bearer ${developerToken}`)
      .send({ status: 'READY_FOR_QA' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/qa/bug-reports/${bug.body.id}/status`)
      .set('Authorization', `Bearer ${developerToken}`)
      .send({ status: 'CLOSED' })
      .expect(403);

    const gate = await request(app.getHttpServer())
      .post('/api/qa/release-gates')
      .set('Authorization', `Bearer ${qaToken}`)
      .send({ testRunId: run.body.id, name: 'Sprint 5 Release Gate', version: '0.5.0' })
      .expect(201);
    expect(gate.body.status).toBe('BLOCKED');

    await request(app.getHttpServer())
      .patch(`/api/qa/bug-reports/${bug.body.id}/status`)
      .set('Authorization', `Bearer ${qaToken}`)
      .send({ status: 'CLOSED' })
      .expect(200);

    const audits = await prisma.auditLog.count({
      where: { action: { startsWith: 'QA_' } },
    });
    expect(audits).toBeGreaterThanOrEqual(5);
  });
});
