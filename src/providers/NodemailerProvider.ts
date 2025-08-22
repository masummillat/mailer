import nodemailer, { Transporter } from 'nodemailer';
import { IMailProvider, ProviderHealthStatus, ProviderFeature } from '../interfaces/IMailProvider';
import { EmailOptions, EmailResult, EmailPriority } from '../types/email.types';
import { Logger } from 'pino';

export class NodemailerProvider implements IMailProvider {
  public readonly name = 'nodemailer';
  public readonly priority = 1;
  public readonly rateLimit = 10; // emails per second

  private transporter?: Transporter;
  private config: any;
  private logger: Logger;
  private metrics = {
    sentToday: 0,
    sentThisHour: 0,
    errorCount: 0,
    successCount: 0,
    totalResponseTime: 0,
    lastSuccessfulSend: new Date(),
    lastError: ''
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(config: any): Promise<void> {
    this.config = config;
    
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.password,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: this.rateLimit,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    this.logger.info(`Nodemailer provider initialized for ${config.host}:${config.port}`);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    
    if (!this.transporter) {
      throw new Error('Nodemailer provider not initialized');
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc,
        bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
        headers: options.headers,
        priority: this.mapPriority(options.priority) as 'high' | 'normal' | 'low',
      };

      const info = await this.transporter.sendMail(mailOptions);
      const duration = Date.now() - startTime;
      
      this.updateMetrics(true, duration);
      
      return {
        success: true,
        messageId: info.messageId || '',
        response: info.response || '',
        duration,
        provider: this.name,
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.updateMetrics(false, duration, error.message);
      
      this.logger.error('Nodemailer send failed', { error: error.message, options });
      
      return {
        success: false,
        error: error.message,
        duration,
        provider: this.name,
      };
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push(result);
        
        // Small delay to respect rate limits
        await this.delay(100);
        
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          duration: 0,
          provider: this.name,
        });
      }
    }
    
    return results;
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.info('Nodemailer connection verified successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Nodemailer connection failed', { error: error.message });
      return false;
    }
  }

  async getHealthStatus(): Promise<ProviderHealthStatus> {
    const successRate = this.metrics.successCount + this.metrics.errorCount > 0
      ? (this.metrics.successCount / (this.metrics.successCount + this.metrics.errorCount)) * 100
      : 0;
    
    const averageResponseTime = this.metrics.successCount > 0
      ? this.metrics.totalResponseTime / this.metrics.successCount
      : 0;

    return {
      isHealthy: await this.verifyConnection() && successRate > 95,
      lastSuccessfulSend: this.metrics.lastSuccessfulSend,
      lastError: this.metrics.lastError,
      errorCount: this.metrics.errorCount,
      successRate,
      averageResponseTime,
      metrics: {
        sentToday: this.metrics.sentToday,
        sentThisHour: this.metrics.sentThisHour,
        queueSize: 0, // Nodemailer doesn't have built-in queue
      },
    };
  }

  supportsFeature(feature: ProviderFeature): boolean {
    const supportedFeatures = [
      ProviderFeature.ATTACHMENTS,
      ProviderFeature.BULK_SEND,
    ];
    
    return supportedFeatures.includes(feature);
  }

  async shutdown(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.logger.info('Nodemailer provider shutdown completed');
    }
  }

  private mapPriority(priority?: EmailPriority): string | undefined {
    if (!priority) return undefined;
    
    switch (priority) {
      case EmailPriority.LOW:
        return 'low';
      case EmailPriority.NORMAL:
        return 'normal';
      case EmailPriority.HIGH:
        return 'high';
      case EmailPriority.CRITICAL:
        return 'high';
      default:
        return 'normal';
    }
  }

  private updateMetrics(success: boolean, duration: number, error?: string): void {
    if (success) {
      this.metrics.successCount++;
      this.metrics.sentToday++;
      this.metrics.sentThisHour++;
      this.metrics.totalResponseTime += duration;
      this.metrics.lastSuccessfulSend = new Date();
    } else {
      this.metrics.errorCount++;
      this.metrics.lastError = error || 'Unknown error';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}