import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BugStatus, Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBugReportDto } from './dto/create-bug-report.dto';
import type { UpdateBugStatusDto } from './dto/update-bug-status.dto';

const bugReportSelect = Prisma.validator<Prisma.BugReportSelect>()({
  id: true,
  testRunResultId: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  featureArea: true,
  reporterUserId: true,
  assignedToUserId: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
  reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
  testRunResult: {
    select: {
      id: true,
      status: true,
      testCase: { select: { id: true, title: true, featureArea: true } },
      testRun: { select: { id: true, name: true } },
    },
  },
});

type BugReportRecord = Prisma.BugReportGetPayload<{ select: typeof bugReportSelect }>;

const ASSIGNED_USER_ALLOWED_STATUSES: BugStatus[] = [BugStatus.IN_PROGRESS, BugStatus.READY_FOR_QA];

@Injectable()
export class QaBugReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  list(user: AuthenticatedUser, assignedToMe?: boolean) {
    if (!user.permissions.includes('qa.read')) {
      return this.prisma.bugReport.findMany({
        where: { assignedToUserId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: bugReportSelect,
      });
    }

    return this.prisma.bugReport.findMany({
      where: assignedToMe ? { assignedToUserId: user.id } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: bugReportSelect,
    });
  }

  async create(input: CreateBugReportDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'qa.manage');
    if (input.testRunResultId) {
      const result = await this.prisma.testRunResult.findUnique({
        where: { id: input.testRunResultId },
        select: { status: true },
      });
      if (!result) {
        throw new NotFoundException('Test result not found.');
      }
      if (result.status !== 'FAILED') {
        throw new BadRequestException('Bug reports can only be linked from failed test results.');
      }
    }
    if (input.assignedToUserId) {
      const assignedUser = await this.prisma.user.findUnique({
        where: { id: input.assignedToUserId },
        select: { id: true, status: true },
      });
      if (!assignedUser) {
        throw new NotFoundException('Assigned user not found.');
      }
      if (assignedUser.status !== 'ACTIVE') {
        throw new BadRequestException('Bugs can only be assigned to active users.');
      }
    }

    const bug = await this.prisma.bugReport.create({
      data: {
        testRunResultId: input.testRunResultId ?? null,
        title: input.title,
        description: input.description,
        severity: input.severity,
        featureArea: input.featureArea,
        reporterUserId: user.id,
        assignedToUserId: input.assignedToUserId ?? null,
      },
      select: bugReportSelect,
    });
    await this.auditQaAction(user, 'QA_BUG_CREATED', bug.id, context);
    return bug;
  }

  async updateStatus(
    id: string,
    input: UpdateBugStatusDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const bug = await this.findBugOrThrow(id);
    const canManageQa = user.permissions.includes('qa.manage');
    if (!canManageQa && bug.assignedToUserId !== user.id) {
      throw new ForbiddenException('Only QA managers or assigned users can update this bug.');
    }
    if (!canManageQa && !ASSIGNED_USER_ALLOWED_STATUSES.includes(input.status)) {
      throw new ForbiddenException(
        'Assigned users can only move bugs to in-progress or ready for QA.',
      );
    }

    const updated = await this.prisma.bugReport.update({
      where: { id },
      data: {
        status: input.status,
        closedAt: input.status === BugStatus.CLOSED ? new Date() : null,
      },
      select: bugReportSelect,
    });
    await this.auditQaAction(user, 'QA_BUG_STATUS_UPDATED', id, context);
    return updated;
  }

  private async findBugOrThrow(id: string): Promise<BugReportRecord> {
    const bug = await this.prisma.bugReport.findUnique({ where: { id }, select: bugReportSelect });
    if (!bug) {
      throw new NotFoundException('Bug report not found.');
    }
    return bug;
  }

  private assertPermission(user: AuthenticatedUser, permission: string): void {
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private async auditQaAction(
    user: AuthenticatedUser,
    action: string,
    resourceId: string,
    context: RequestContext,
  ): Promise<void> {
    await this.auditLogService.create({
      actorUserId: user.id,
      action,
      resourceType: 'BugReport',
      resourceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
