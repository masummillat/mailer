export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  password: string;
  from: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  headers?: Record<string, string>;
  priority?: EmailPriority;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  cid?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  duration: number;
  provider: string;
  retryCount?: number;
  deliveryStatus?: DeliveryStatus;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
  category?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateData {
  [key: string]: any;
}

export interface BulkEmailOptions {
  template: string;
  recipients: BulkRecipient[];
  globalData?: TemplateData;
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface BulkRecipient {
  email: string;
  data: TemplateData;
  metadata?: Record<string, any>;
}

export enum EmailPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed'
}

export interface EmailQueue {
  id: string;
  options: EmailOptions;
  priority: EmailPriority;
  maxRetries: number;
  retryCount: number;
  scheduledAt?: Date;
  createdAt: Date;
  status: QueueStatus;
}

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}