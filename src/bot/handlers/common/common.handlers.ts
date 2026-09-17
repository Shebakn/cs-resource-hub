import { UploadDocumentHandler } from './upload-document.handler';
import { BotEventConflictHandler } from './bot-event-conflict.handler';
import { CentralTextHandler } from './text.handler';

export const CommonHandlers = [
  UploadDocumentHandler,
  BotEventConflictHandler,
  CentralTextHandler,
];
