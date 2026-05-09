import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReleaseGateDto } from './dto/create-release-gate.dto';
import { calculateQualityGate } from './quality-gate';

const releaseGateSelect = Prisma.validator<Prisma.ReleaseGateSelect>()({
  id: true,
  testRunId: true,
  name: true,
  version: true,
  status: true,
  minPassRate: true,
  createdAt: true,
  updatedAt: true,
  testRun: { select: { id: true, name: true, suite: { select: { name: true } } } },
  checks: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, status: true, message: true, details: true, createdAt: true },
  },
});

@Injectable()
export class QaReleaseGatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  list(user: AuthenticatedUser) {
    this.assertPermission(user, 'qa.read');
    return this.prisma.releaseGate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: releaseGateSelect,
    });
  }

  async create(input: CreateReleaseGateDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'qa.manage');
    const testRun = await this.prisma.testRun.findUnique({
      where: { id: input.testRunId },
      select: {
        id: true,
        results: {
          select: {
            status: true,
            testCase: { select: { id: true, title: true, isRequired: true } },
          },
        },
      },
    });
    if (!testRun) {
      throw new NotFoundException('Test run not found.');
    }

    const bugs = await this.prisma.bugReport.findMany({
      where: { testRunResult: { testRunId: input.testRunId } },
      select: { id: true, title: true, severity: true, status: true },
    });
    const calculated = calculateQualityGate({
      minPassRate: input.minPassRate ?? 90,
      results: testRun.results.map((result) => ({
        status: result.status,
        testCaseId: result.testCase.id,
        title: result.testCase.title,
        isRequired: result.testCase.isRequired,
      })),
      bugs,
    });

    const gate = await this.prisma.releaseGate.create({
      data: {
        testRunId: input.testRunId,
        name: input.name,
        version: input.version,
        minPassRate: input.minPassRate ?? 90,
        status: calculated.status,
        createdByUserId: user.id,
        checks: {
          create: calculated.checks.map((check) => ({
            type: check.type,
            status: check.status,
            message: check.message,
            details: check.details as Prisma.InputJsonValue,
          })),
        },
      },
      select: releaseGateSelect,
    });
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'QA_RELEASE_GATE_CREATED',
      resourceType: 'ReleaseGate',
      resourceId: gate.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { status: gate.status, version: gate.version },
    });
    return gate;
  }

  private assertPermission(user: AuthenticatedUser, permission: string): void {
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }
}
