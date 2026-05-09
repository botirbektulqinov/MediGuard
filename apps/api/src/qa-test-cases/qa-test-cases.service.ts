import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTestCaseDto } from './dto/create-test-case.dto';
import type { CreateTestSuiteDto } from './dto/create-test-suite.dto';

export const testCaseSelect = Prisma.validator<Prisma.TestCaseSelect>()({
  id: true,
  suiteId: true,
  title: true,
  description: true,
  featureArea: true,
  preconditions: true,
  steps: true,
  expectedResult: true,
  priority: true,
  isRequired: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  suite: { select: { id: true, name: true } },
});

const testSuiteSelect = Prisma.validator<Prisma.TestSuiteSelect>()({
  id: true,
  name: true,
  description: true,
  featureArea: true,
  createdAt: true,
  updatedAt: true,
  testCases: {
    orderBy: { createdAt: 'asc' },
    select: testCaseSelect,
  },
});

@Injectable()
export class QaTestCasesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  listSuites(user: AuthenticatedUser) {
    this.assertPermission(user, 'qa.read');
    return this.prisma.testSuite.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: testSuiteSelect,
    });
  }

  async createSuite(input: CreateTestSuiteDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'qa.manage');
    const suite = await this.prisma.testSuite.create({
      data: {
        name: input.name,
        featureArea: input.featureArea,
        description: input.description ?? null,
        createdByUserId: user.id,
      },
      select: testSuiteSelect,
    });
    await this.auditQaAction(user, 'QA_TEST_SUITE_CREATED', 'TestSuite', suite.id, context);
    return suite;
  }

  listCases(user: AuthenticatedUser) {
    this.assertPermission(user, 'qa.read');
    return this.prisma.testCase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: testCaseSelect,
    });
  }

  async getCase(id: string, user: AuthenticatedUser) {
    this.assertPermission(user, 'qa.read');
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      select: testCaseSelect,
    });
    if (!testCase) {
      throw new NotFoundException('Test case not found.');
    }
    return testCase;
  }

  async createCase(input: CreateTestCaseDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'qa.manage');
    const suite = await this.prisma.testSuite.findUnique({
      where: { id: input.suiteId },
      select: { id: true },
    });
    if (!suite) {
      throw new NotFoundException('Test suite not found.');
    }

    const testCase = await this.prisma.testCase.create({
      data: {
        suiteId: input.suiteId,
        title: input.title,
        featureArea: input.featureArea,
        description: input.description ?? null,
        preconditions: input.preconditions ?? null,
        steps: input.steps,
        expectedResult: input.expectedResult,
        priority: input.priority ?? 'MEDIUM',
        isRequired: input.isRequired ?? false,
        createdByUserId: user.id,
      },
      select: testCaseSelect,
    });
    await this.auditQaAction(user, 'QA_TEST_CASE_CREATED', 'TestCase', testCase.id, context);
    return testCase;
  }

  private assertPermission(user: AuthenticatedUser, permission: string): void {
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private async auditQaAction(
    user: AuthenticatedUser,
    action: string,
    resourceType: string,
    resourceId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.auditLogService.create({
      actorUserId: user.id,
      action,
      resourceType,
      resourceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
