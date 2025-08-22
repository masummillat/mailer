import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { IMailProvider, ProviderHealthStatus, ProviderFeature } from '../interfaces/IMailProvider';
import { EmailOptions, EmailResult, EmailPriority } from '../types/email.types';
import { Logger } from 'pino';

export class SendGridProvider implements IMailProvider {
  public readonly name = 'sendgrid';
  public readonly priority = 2;
  public readonly rateLimit = 100; // emails per second

  private config: any;
  private logger: Logger;
  private isInitialized = false;
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
    
    if (!config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    sgMail.setApiKey(config.apiKey);
    this.isInitialized = true;
    
    this.logger.info('SendGrid provider initialized');
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      throw new Error('SendGrid provider not initialized');
    }

    try {
      const mailData = {
        from: this.config.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        content: options.html ? [{
          type: 'text/html',
          value: options.html
        }] : [{
          type: 'text/plain',
          value: options.text || ''
        }],
        replyTo: options.replyTo,
        headers: options.headers,
        customArgs: options.metadata,
        categories: options.tags,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content?.toString('base64') || '',
          type: att.contentType,
          disposition: 'attachment',
          contentId: att.cid,
        })),
      };

      const [response] = await sgMail.send(mailData as any);
      const duration = Date.now() - startTime;
      
      this.updateMetrics(true, duration);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        response: `${response.statusCode}: ${response.body}`,
        duration,
        provider: this.name,
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.updateMetrics(false, duration, error.message);
      
      this.logger.error('SendGrid send failed', { 
        error: error.message, 
        response: error.response?.body,
        options 
      });
      
      return {
        success: false,
        error: error.message,
        duration,
        provider: this.name,
      };
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    if (!this.isInitialized) {
      throw new Error('SendGrid provider not initialized');
    }

    try {
      // SendGrid optimized bulk sending
      const mailData = emails.map(email => ({
        from: this.config.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        content: email.html ? [{
          type: 'text/html',
          value: email.html
        }] : [{
          type: 'text/plain',
          value: email.text || ''
        }],
        replyTo: email.replyTo,
        headers: email.headers,
        customArgs: email.metadata,
        categories: email.tags,
      }));

      const startTime = Date.now();
      const responses = await sgMail.send(mailData as any);
      const duration = Date.now() - startTime;

      return responses.map((response, index) => {
        this.updateMetrics(true, duration / responses.length);
        
        return {
          success: true,
          messageId: (response as any).headers?.['x-message-id'] || '',
          response: `${(response as any).statusCode}: ${(response as any).body}`,
          duration: duration / responses.length,
          provider: this.name,
        };
      });

    } catch (error: any) {
      this.logger.error('SendGrid bulk send failed', { error: error.message });
      
      // Return failed results for all emails
      return emails.map(() => ({
        success: false,
        error: error.message,
        duration: 0,
        provider: this.name,
      }));
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // SendGrid doesn't have a direct verify method, so we'll check API key validity
      // by making a simple request to get account info
      await sgMail.send({
        from: this.config.from,
        to: this.config.from, // Send to self for verification
        subject: 'SendGrid Connection Test',
        text: 'This is a connection test email',
      });
      
      this.logger.info('SendGrid connection verified successfully');
      return true;
    } catch (error: any) {
      this.logger.error('SendGrid connection failed', { error: error.message });
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
      isHealthy: this.isInitialized && successRate > 95,
      lastSuccessfulSend: this.metrics.lastSuccessfulSend,
      lastError: this.metrics.lastError,
      errorCount: this.metrics.errorCount,
      successRate,
      averageResponseTime,
      metrics: {
        sentToday: this.metrics.sentToday,
        sentThisHour: this.metrics.sentThisHour,
        queueSize: 0, // SendGrid handles queuing internally
      },
    };
  }

  supportsFeature(feature: ProviderFeature): boolean {
    const supportedFeatures = [
      ProviderFeature.TEMPLATES,
      ProviderFeature.ATTACHMENTS,
      ProviderFeature.BULK_SEND,
      ProviderFeature.WEBHOOKS,
      ProviderFeature.ANALYTICS,
      ProviderFeature.A_B_TESTING,
    ];
    
    return supportedFeatures.includes(feature);
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
    this.logger.info('SendGrid provider shutdown completed');
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
}