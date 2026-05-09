import { Inject, Injectable } from '@nestjs/common';
import type { NotificationType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput) {
    const data: Prisma.NotificationUncheckedCreateInput = {
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    };

    return this.prisma.notification.create({ data });
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
