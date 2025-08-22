// Main exports
export { 
  createEmailService,
  SimpleEmailService,
  SimpleEmailConfig
} from './SimpleFactory';

// Type exports
export * from './types/email.types';

// Provider interfaces (for advanced usage)
export { IMailProvider, ProviderHealthStatus, ProviderFeature } from './interfaces/IMailProvider';