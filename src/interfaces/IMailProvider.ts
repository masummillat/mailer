import { EmailOptions, EmailResult } from '../types/email.types';

export interface IMailProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;
  
  /**
   * Provider priority for load balancing (higher = more preferred)
   */
  readonly priority: number;
  
  /**
   * Maximum emails per second this provider can handle
   */
  readonly rateLimit: number;
  
  /**
   * Initialize the provider with configuration
   */
  initialize(config: any): Promise<void>;
  
  /**
   * Send a single email
   */
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  
  /**
   * Send bulk emails (provider-optimized)
   */
  sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]>;
  
  /**
   * Verify provider connection and configuration
   */
  verifyConnection(): Promise<boolean>;
  
  /**
   * Get provider health status
   */
  getHealthStatus(): Promise<ProviderHealthStatus>;
  
  /**
   * Check if provider supports a specific feature
   */
  supportsFeature(feature: ProviderFeature): boolean;
  
  /**
   * Gracefully shutdown the provider
   */
  shutdown(): Promise<void>;
}

export interface ProviderHealthStatus {
  isHealthy: boolean;
  lastSuccessfulSend?: Date;
  lastError?: string;
  errorCount: number;
  successRate: number; // percentage
  averageResponseTime: number; // milliseconds
  metrics: {
    sentToday: number;
    sentThisHour: number;
    queueSize: number;
  };
}

export enum ProviderFeature {
  TEMPLATES = 'templates',
  ATTACHMENTS = 'attachments',
  BULK_SEND = 'bulk_send',
  WEBHOOKS = 'webhooks',
  ANALYTICS = 'analytics',
  SCHEDULING = 'scheduling',
  A_B_TESTING = 'ab_testing'
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  rateLimit: number;
  maxRetries: number;
  timeout: number;
  credentials: Record<string, any>;
  features: ProviderFeature[];
}