import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, resolve } from 'path';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadedMedicalFile } from './file-upload.types';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['text/plain', '.txt'],
]);

const attachmentSelect = Prisma.validator<Prisma.FileAttachmentSelect>()({
  id: true,
  clinicId: true,
  patientId: true,
  labResultId: true,
  originalName: true,
  storageName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  labResult: {
    select: {
      id: true,
      status: true,
      labOrder: { select: { doctor: { select: { staffProfile: { select: { userId: true } } } } } },
      patient: { select: { userId: true } },
    },
  },
});

type AttachmentRecord = Prisma.FileAttachmentGetPayload<{ select: typeof attachmentSelect }>;

@Injectable()
export class FilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async storeLabResultAttachment(input: {
    clinicId: string;
    patientId: string;
    labResultId: string;
    uploadedByUserId: string;
    file: UploadedMedicalFile;
  }) {
    this.assertAllowedUpload(input.file);
    const extension = ALLOWED_FILE_TYPES.get(input.file.mimetype);
    if (!extension) {
      throw new BadRequestException('Unsupported file type.');
    }

    const storageName = `${randomUUID()}${extension}`;
    const storageRoot = this.storageRoot();
    const storagePath = resolve(storageRoot, storageName);
    if (!storagePath.startsWith(storageRoot)) {
      throw new BadRequestException('Invalid file path.');
    }

    await mkdir(storageRoot, { recursive: true });
    await writeFile(storagePath, input.file.buffer);

    try {
      return await this.prisma.fileAttachment.create({
        data: {
          clinicId: input.clinicId,
          patientId: input.patientId,
          labResultId: input.labResultId,
          uploadedByUserId: input.uploadedByUserId,
          originalName: this.safeOriginalName(input.file.originalname),
          storageName,
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          storagePath,
        },
        select: attachmentSelect,
      });
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async getDownload(id: string, user: AuthenticatedUser, context: RequestContext) {
    const attachment = await this.prisma.fileAttachment.findUnique({
      where: { id },
      select: { ...attachmentSelect, storagePath: true },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
    }

    await this.assertCanDownload(user, attachment);
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'FILE_ATTACHMENT_DOWNLOADED',
      resourceType: 'FileAttachment',
      resourceId: attachment.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      stream: createReadStream(attachment.storagePath),
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  }

  private async assertCanDownload(user: AuthenticatedUser, attachment: AttachmentRecord) {
    if (
      attachment.labResult?.patient.userId === user.id &&
      attachment.labResult.status === 'READY'
    ) {
      return;
    }
    if (attachment.labResult?.labOrder.doctor.staffProfile.userId === user.id) {
      return;
    }
    if (user.permissions.includes('lab.read')) {
      await this.clinicAccessService.assertCanAccessClinic(user, attachment.clinicId);
      return;
    }
    throw new ForbiddenException('You cannot access this attachment.');
  }

  assertAllowedUpload(file: UploadedMedicalFile): void {
    if (!file) {
      throw new BadRequestException('File is required.');
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File size exceeds the allowed limit.');
    }
    const allowedExtension = ALLOWED_FILE_TYPES.get(file.mimetype);
    const actualExtension = extname(file.originalname).toLowerCase();
    if (!allowedExtension || actualExtension !== allowedExtension) {
      throw new BadRequestException('File type is not allowed.');
    }
  }

  private safeOriginalName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
  }

  private storageRoot(): string {
    return resolve(
      process.cwd(),
      this.configService.get<string>('FILE_STORAGE_DIR') ?? 'storage/uploads',
    );
  }
}
