import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BugSeverity, BugStatus, UserStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { QaBugReportsService } from './qa-bug-reports.service';

const assignedUser: AuthenticatedUser = {
  id: 'user-assigned',
  email: 'developer@demo.com',
  status: 'ACTIVE',
  roles: ['DEVELOPER'],
  permissions: [],
};

const qaManager: AuthenticatedUser = {
  id: 'user-qa',
  email: 'qa@demo.com',
  status: 'ACTIVE',
  roles: ['QA_MANAGER'],
  permissions: ['qa.manage'],
};

const bugRecord = {
  id: 'bug-1',
  testRunResultId: null,
  title: 'Broken workflow',
  description: 'Expected behavior did not happen.',
  severity: BugSeverity.CRITICAL,
  status: BugStatus.OPEN,
  featureArea: 'QA Center',
  reporterUserId: qaManager.id,
  assignedToUserId: assignedUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  assignedTo: null,
  reporter: null,
  testRunResult: null,
};

function createService(overrides?: {
  bug?: unknown;
  assignedUser?: { id: string; status: UserStatus } | null;
}) {
  const assignedUserResult =
    overrides && 'assignedUser' in overrides
      ? overrides.assignedUser
      : { id: 'user-2', status: UserStatus.ACTIVE };
  const prisma = {
    bugReport: {
      findUnique: jest.fn().mockResolvedValue(overrides?.bug ?? bugRecord),
      update: jest.fn().mockResolvedValue({ ...bugRecord, status: BugStatus.CLOSED }),
      create: jest.fn().mockResolvedValue(bugRecord),
      findMany: jest.fn(),
    },
    testRunResult: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(assignedUserResult),
    },
  };
  const auditLogService = { create: jest.fn() };
  const service = new QaBugReportsService(prisma as never, auditLogService as never);

  return { auditLogService, prisma, service };
}

describe('QaBugReportsService', () => {
  it('prevents assigned non-QA users from closing bugs', async () => {
    const { prisma, service } = createService();

    await expect(
      service.updateStatus(bugRecord.id, { status: BugStatus.CLOSED }, assignedUser, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.bugReport.update).not.toHaveBeenCalled();
  });

  it('allows assigned users to move bugs to ready for QA', async () => {
    const { prisma, service } = createService();

    await service.updateStatus(bugRecord.id, { status: BugStatus.READY_FOR_QA }, assignedUser, {});

    expect(prisma.bugReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BugStatus.READY_FOR_QA }),
      }),
    );
  });

  it('allows QA managers to close bugs', async () => {
    const { prisma, service } = createService();

    await service.updateStatus(bugRecord.id, { status: BugStatus.CLOSED }, qaManager, {});

    expect(prisma.bugReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BugStatus.CLOSED, closedAt: expect.any(Date) }),
      }),
    );
  });

  it('returns not found when a bug assignee does not exist', async () => {
    const { service } = createService({ assignedUser: null });

    await expect(
      service.create(
        {
          title: 'Broken workflow',
          description: 'Expected behavior did not happen.',
          severity: BugSeverity.HIGH,
          featureArea: 'QA Center',
          assignedToUserId: 'missing-user',
        },
        qaManager,
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects disabled bug assignees', async () => {
    const { service } = createService({
      assignedUser: { id: 'disabled-user', status: UserStatus.DISABLED },
    });

    await expect(
      service.create(
        {
          title: 'Broken workflow',
          description: 'Expected behavior did not happen.',
          severity: BugSeverity.HIGH,
          featureArea: 'QA Center',
          assignedToUserId: 'disabled-user',
        },
        qaManager,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
