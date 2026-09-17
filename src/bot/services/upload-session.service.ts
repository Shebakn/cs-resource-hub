import { Injectable } from '@nestjs/common';
import { ResourceType } from '@prisma/client';

export type UploadWorkflow = 'MATERIAL' | 'EXAM';

export interface UploadSession {
  userId: number;

  workflow: UploadWorkflow;

  courseOfferingId: number;
  type: ResourceType;

  telegramFileId?: string;
  pendingFileId?: string;
}

@Injectable()
export class UploadSessionService {
  private readonly sessions = new Map<number, UploadSession>();

  get(userId: number): UploadSession | undefined {
    return this.sessions.get(userId);
  }

  create(
    userId: number,
    data: {
      workflow: UploadWorkflow;
      courseOfferingId: number;
      type: ResourceType;
    },
  ): UploadSession {
    const session: UploadSession = {
      userId,
      workflow: data.workflow,
      courseOfferingId: data.courseOfferingId,
      type: data.type,
    };

    this.sessions.set(userId, session);

    return session;
  }

  setFile(userId: number, telegramFileId: string): boolean {
    const session = this.sessions.get(userId);

    if (!session) {
      return false;
    }

    session.telegramFileId = telegramFileId;

    return true;
  }

  setPendingFile(userId: number, telegramFileId: string): boolean {
    const session = this.sessions.get(userId);

    if (!session) {
      return false;
    }

    session.pendingFileId = telegramFileId;

    return true;
  }

  replaceWithPendingFile(userId: number): UploadSession | undefined {
    const session = this.sessions.get(userId);

    if (!session || !session.pendingFileId) {
      return undefined;
    }

    session.telegramFileId = session.pendingFileId;
    session.pendingFileId = undefined;

    return session;
  }

  restoreOldFile(userId: number): UploadSession | undefined {
    const session = this.sessions.get(userId);

    if (!session || !session.pendingFileId) {
      return undefined;
    }

    session.pendingFileId = undefined;

    return session;
  }

  delete(userId: number): void {
    this.sessions.delete(userId);
  }

  clear(): void {
    this.sessions.clear();
  }
}
