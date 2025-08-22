# Multi-Provider Mailer Service

A simple, scalable mail service. Supports multiple mail providers, HTML templates, and failover capabilities with direct configuration.

## Features

- **🚀 Simple Factory Pattern**: Single factory function handles all use cases
- **📧 Multiple Provider Support**: Nodemailer (SMTP), SendGrid with priority-based failover
- **🎨 Template System**: Handlebars-based HTML templates with file system loading
- **💪 Automatic Failover**: Switches between providers when one fails
- **🔧 Direct Configuration**: Pass configuration directly, no environment variables required
- **🧪 Testing Ready**: Simple initialization for tests and development

## Quick Start

### Installation

```bash
npm install @your-org/mailer
# or
yarn add @your-org/mailer
```

### Basic Usage

```typescript
import { createEmailService } from "@your-org/mailer";

// Initialize with direct configuration
const emailService = await createEmailService({
  serviceName: "your-service",
  nodemailer: {
    enabled: true,
    priority: 1,
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "your-email@gmail.com",
    password: "your-app-password",
    from: "Your Service <noreply@yourdomain.com>",
  },
});

// Send simple email
const result = await emailService.sendEmail({
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Hello World</h1>",
  text: "Hello World",
});

console.log("Email sent:", result.success);
```

## Configuration

### Direct Configuration (Recommended)

```typescript
const emailService = await createEmailService({
  serviceName: "your-service",
  nodemailer: {
    enabled: true,
    priority: 1,
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "your-email@gmail.com",
    password: "your-app-password",
    from: "Your App <noreply@yourapp.com>",
  },
  sendgrid: {
    enabled: true,
    priority: 2,
    apiKey: "sg.your-api-key",
    from: "Your App <noreply@yourapp.com>",
  },
  templates: {
    directory: "./templates",
  },
});
```

### Environment Variables (Alternative)

```bash
# Service Configuration
SERVICE_NAME=your-service
NODE_ENV=production

# Nodemailer Provider
YOUR_SERVICE_SMTP_HOST=smtp.gmail.com
YOUR_SERVICE_SMTP_PORT=587
YOUR_SERVICE_SMTP_SECURE=false
YOUR_SERVICE_SMTP_USER=your-email@gmail.com
YOUR_SERVICE_SMTP_PASS=your-app-password
YOUR_SERVICE_SMTP_FROM="Your App <noreply@yourapp.com>"

# SendGrid Provider (optional)
YOUR_SERVICE_SENDGRID_ENABLED=true
YOUR_SERVICE_SENDGRID_API_KEY=your-sendgrid-api-key
YOUR_SERVICE_SENDGRID_FROM="Your App <noreply@yourapp.com>"
```

## Templates

### Creating Templates

Create HTML templates in your service:

```
your-service/
├── templates/
│   ├── welcome.html
│   ├── password-reset.html
│   └── notification.html
```

#### Example Template: `templates/welcome.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Welcome</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"
  >
    <h1 style="color: #333;">Welcome to {{appName}}!</h1>
    <p>Dear {{userName}},</p>
    <p>Your account has been created successfully.</p>

    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
      <h3>Account Details:</h3>
      <p><strong>Email:</strong> {{userEmail}}</p>
      <p><strong>Registered:</strong> {{registrationDate}}</p>
    </div>

    <p>Best regards,<br />{{appName}} Team</p>
  </body>
</html>
```

### Using Templates

```typescript
// Send template email
const result = await emailService.sendTemplateEmail(
  "welcome",
  {
    userName: "John Doe",
    appName: "Your Application",
    userEmail: "john@example.com",
    registrationDate: new Date().toLocaleDateString(),
  },
  {
    to: "john@example.com",
  }
);
```

## Advanced Usage

### Provider Priority & Failover

```typescript
const emailService = await createEmailService({
  serviceName: "your-service",
  nodemailer: {
    enabled: true,
    priority: 1, // Primary provider
  },
  sendgrid: {
    enabled: true,
    priority: 2, // Fallback provider
  },
});
```

### Health Monitoring

```typescript
// Check available providers
const providers = emailService.getProviders();
console.log("Active providers:", providers);

// Health check endpoint
app.get("/health", async (req, res) => {
  const providers = emailService.getProviders();
  res.json({
    status: "healthy",
    mail: {
      healthy: providers.length > 0,
      providers: providers,
    },
  });
});
```

## Framework Integration

### Express.js

```typescript
import express from "express";
import { createEmailService } from "@your-org/mailer";

const app = express();
let emailService;

app.listen(3000, async () => {
  emailService = await createEmailService({
    serviceName: "your-service",
    // Configuration here
  });
  console.log("Server started with mail service");
});
```

### NestJS

```typescript
import { Injectable } from "@nestjs/common";
import { createEmailService, SimpleEmailService } from "@your-org/mailer";

@Injectable()
export class EmailService {
  private emailService: SimpleEmailService;

  async onModuleInit() {
    this.emailService = await createEmailService({
      serviceName: "your-service",
      // Configuration here
    });
  }

  async sendWelcomeEmail(user: any) {
    return this.emailService.sendTemplateEmail("welcome", user, {
      to: user.email,
    });
  }
}
```

## Testing

```typescript
import { createEmailService } from "@your-org/mailer";

describe("Email Service", () => {
  it("should send test email", async () => {
    const service = await createEmailService({
      serviceName: "test-service",
      nodemailer: {
        enabled: true,
        priority: 1,
        host: "smtp.ethereal.email", // Test SMTP
        port: 587,
        user: "test-user",
        password: "test-password",
        from: "test@example.com",
      },
    });

    const result = await service.sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result).toHaveProperty("success");
  });
});
```

## Troubleshooting

### Common Issues

1. **"No healthy providers available"**

   - Check environment variables with correct SERVICE_NAME prefix
   - Verify SMTP credentials and network connectivity

2. **Template not found**

   - Ensure template files exist in templates/ directory
   - Check template naming matches the ID used in code

3. **SMTP Authentication Failed**

   - Use App Passwords for Gmail (not regular password)
   - Enable 2-Factor Authentication

4. **SendGrid API Key Invalid**
   - Generate new API key with "Mail Send" permissions
   - Verify sender email is verified in SendGrid

### Debug Logging

```bash
LOG_LEVEL=debug
```

## License

MIT License
