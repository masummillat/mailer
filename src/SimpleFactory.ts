import pino from 'pino';
import { NodemailerProvider } from './providers/NodemailerProvider';
import { SendGridProvider } from './providers/SendGridProvider';
import { EmailOptions, EmailResult } from './types/email.types';
import { IMailProvider } from './interfaces/IMailProvider';

/**
 * Simplified Email Service Configuration
 */
export interface SimpleEmailConfig {
  serviceName: string;
  nodemailer?: {
    enabled?: boolean;
    priority?: number;
    rateLimit?: number;
    maxRetries?: number;
    timeout?: number;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string;
    from?: string;
  };
  sendgrid?: {
    enabled?: boolean;
    priority?: number;
    rateLimit?: number;
    maxRetries?: number;
    timeout?: number;
    apiKey?: string;
    from?: string;
  };
  templates?: {
    directory?: string;
    cacheEnabled?: boolean;
    cacheTTL?: number;
  };
}

/**
 * Simple Email Service without DI complexity
 */
export class SimpleEmailService {
  private providers: IMailProvider[] = [];
  private logger: any;
  private initialized = false;
  private config: SimpleEmailConfig;

  constructor(config: SimpleEmailConfig) {
    this.config = config;
    this.logger = pino({ 
      name: `mail-service-${config.serviceName}`,
      level: process.env.LOG_LEVEL || 'info'
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize Nodemailer if configured
    if (this.config.nodemailer?.enabled) {
      try {
        const provider = new NodemailerProvider(this.logger);
        await provider.initialize({
          host: this.config.nodemailer.host,
          port: this.config.nodemailer.port,
          secure: this.config.nodemailer.secure,
          user: this.config.nodemailer.user,
          password: this.config.nodemailer.password,
          from: this.config.nodemailer.from
        });

        // Verify connection
        const isConnected = await provider.verifyConnection();
        if (isConnected) {
          this.providers.push(provider);
          this.logger.info('Nodemailer provider initialized');
        } else {
          this.logger.warn('Nodemailer connection failed');
        }
      } catch (error) {
        this.logger.error('Failed to initialize Nodemailer:', error);
      }
    }

    // Initialize SendGrid if configured
    if (this.config.sendgrid?.enabled) {
      try {
        const provider = new SendGridProvider(this.logger);
        await provider.initialize({
          apiKey: this.config.sendgrid.apiKey,
          from: this.config.sendgrid.from
        });

        // Verify connection
        const isConnected = await provider.verifyConnection();
        if (isConnected) {
          this.providers.push(provider);
          this.logger.info('SendGrid provider initialized');
        } else {
          this.logger.warn('SendGrid connection failed');
        }
      } catch (error) {
        this.logger.error('Failed to initialize SendGrid:', error);
      }
    }

    if (this.providers.length === 0) {
      throw new Error('No mail providers could be initialized');
    }

    // Sort by priority (higher priority first)
    this.providers.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    
    this.initialized = true;
    this.logger.info(`Email service initialized with ${this.providers.length} provider(s)`);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try providers in priority order
    for (const provider of this.providers) {
      try {
        const result = await provider.sendEmail(options);
        if (result.success) {
          return result;
        }
      } catch (error) {
        this.logger.warn(`Provider ${provider.name} failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'All mail providers failed',
      duration: 0,
      provider: 'none'
    };
  }

  async sendTemplateEmail(
    templateName: string, 
    templateData: Record<string, any>, 
    options: Omit<EmailOptions, 'html' | 'text' | 'subject'>
  ): Promise<EmailResult> {
    // Simple template loading (can be enhanced later)
    const templatePath = `${this.config.templates?.directory || './templates'}/${templateName}.html`;
    
    try {
      const fs = require('fs');
      const handlebars = require('handlebars');
      
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateSource);
      const html = template(templateData);
      
      // Extract subject from template (look for <!-- SUBJECT: ... --> comment)
      const subjectMatch = templateSource.match(/<!--\s*SUBJECT:\s*(.+?)\s*-->/i);
      const subject = subjectMatch ? handlebars.compile(subjectMatch[1])(templateData) : 'Email Notification';

      return this.sendEmail({
        ...options,
        subject,
        html
      });
    } catch (error) {
      this.logger.error(`Template loading failed for ${templateName}:`, error);
      return {
        success: false,
        error: `Template loading failed: ${(error as Error).message}`,
        duration: 0,
        provider: 'template-loader'
      };
    }
  }

  getProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}

/**
 * Simple factory function - no DI, no ConfigurationManager, no complexity
 */
export async function createEmailService(config: SimpleEmailConfig): Promise<SimpleEmailService> {
  const service = new SimpleEmailService(config);
  await service.initialize();
  return service;
}