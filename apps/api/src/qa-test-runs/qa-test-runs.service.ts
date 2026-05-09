import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { StartTestRunDto } from './dto/start-test-run.dto';
import type { UpdateTestResultDto } from './dto/update-test-result.dto';

export const testRunSelect = Prisma.validator<Prisma.TestRunSelect>()({
  id: true,
  suiteId: true,
  name: true,
  status: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  suite: { select: { id: true, name: true, featureArea: true } },
  results: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      actualResult: true,
      notes: true,
      executedAt: true,
      testCase: {
        select: {
          id: true,
          title: true,
          featureArea: true,
          priority: true,
          isRequired: true,
          expectedResult: true,
        },
      },
      bugReports: { select: { id: true, title: true, severity: true, status: true } },
    },
  },
});

export type TestRunRecord = Prisma.TestRunGetPayload<{ select: typeof testRunSelect }>;

@Injectable()
export class QaTestRunsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  list(user: AuthenticatedUser) {
    this.assertPermission(user, 'qa.read');
    return this.prisma.testRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: testRunSelect,
    });
  }

  async start(input: StartTestRunDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'qa.execute');
    const testCases = await this.prisma.testCase.findMany({
      where: { suiteId: input.suiteId, isActive: true },
      select: { id: true },
    });
    if (!testCases.length) {
      throw new BadRequestException('Test suite has no active test cases.');
    }

    const run = await this.prisma.testRun.create({
      data: {
        suiteId: input.suiteId,
        name: input.name,
        createdByUserId: user.id,
        results: {
          create: testCases.map((testCase) => ({ testCaseId: testCase.id })),
        },
      },
      select: testRunSelect,
    });
    await this.auditQaAction(user, 'QA_TEST_RUN_STARTED', 'TestRun', run.id, context);
    return run;
  }

  async getById(id: string, user: AuthenticatedUser) {
    this.assertPermission(user, 'qa.read');
    return this.findRunOrThrow(id);
  }

  async updateResult(
    resultId: string,
    input: UpdateTestResultDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    this.assertPermission(user, 'qa.execute');
    const result = await this.prisma.testRunResult.findUnique({
      where: { id: resultId },
      select: { id: true, testRunId: true },
    });
    if (!result) {
      throw new NotFoundException('Test result not found.');
    }

    await this.prisma.testRunResult.update({
      where: { id: resultId },
      data: {
        status: input.status,
        actualResult: input.actualResult ?? null,
        notes: input.notes ?? null,
        executedByUserId: user.id,
        executedAt: input.status === 'PENDING' ? null : new Date(),
      },
    });
    await this.recomputeRunCompletion(result.testRunId);
    await this.auditQaAction(user, 'QA_TEST_RESULT_UPDATED', 'TestRunResult', resultId, context);
    return this.findRunOrThrow(result.testRunId);
  }

  summary(run: TestRunRecord) {
    const total = run.results.length;
    const counts = run.results.reduce(
      (accumulator, result) => {
        accumulator[result.status] += 1;
        return accumulator;
      },
      { PENDING: 0, PASSED: 0, FAILED: 0, BLOCKED: 0, SKIPPED: 0 },
    );
    const executed = total - counts.PENDING - counts.SKIPPED;
    const passRate = executed > 0 ? Math.round((counts.PASSED / executed) * 100) : 0;

    return { total, counts, executed, passRate };
  }

  private async recomputeRunCompletion(testRunId: string): Promise<void> {
    const pending = await this.prisma.testRunResult.count({
      where: { testRunId, status: 'PENDING' },
    });
    await this.prisma.testRun.update({
      where: { id: testRunId },
      data:
        pending === 0
          ? { status: 'COMPLETED', completedAt: new Date() }
          : { status: 'IN_PROGRESS', completedAt: null },
    });
  }

  private async findRunOrThrow(id: string): Promise<TestRunRecord> {
    const run = await this.prisma.testRun.findUnique({ where: { id }, select: testRunSelect });
    if (!run) {
      throw new NotFoundException('Test run not found.');
    }
    return run;
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
