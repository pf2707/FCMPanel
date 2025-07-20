# 🔒 Security Guide

FCMPanel implements enterprise-grade security features to protect your Firebase Cloud Messaging infrastructure and sensitive data.

## 🛡️ Security Architecture

### Multi-Layer Security Approach

1. **Authentication & Authorization**
2. **Data Encryption**
3. **Network Security**
4. **Input Validation & Sanitization**
5. **Rate Limiting & DDoS Protection**
6. **Audit Logging**
7. **Secure Configuration**

## 🔐 Authentication & Authorization

### JWT (JSON Web Tokens)

FCMPanel uses JWT for stateless authentication:

- **Token Expiration**: Configurable (default: 1 day)
- **Refresh Mechanism**: Automatic token refresh
- **Secure Storage**: HTTPOnly cookies
- **Algorithm**: HS256 with strong secrets

#### JWT Configuration

```bash
# .env configuration
JWT_SECRET=your-super-secure-jwt-secret-min-64-chars
JWT_EXPIRE=1d
JWT_COOKIE_EXPIRE=1
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, account management |
| **Manager** | Send notifications, manage devices, view analytics |
| **User** | Send notifications, view own data |
| **Viewer** | Read-only access to notifications and devices |

### Password Security

- **Hashing**: bcrypt with salt rounds (configurable)
- **Minimum Requirements**: 8 characters, mixed case, numbers
- **Password History**: Prevents reuse of last 5 passwords
- **Account Lockout**: Temporary lockout after failed attempts

```javascript
// Password requirements
const passwordSchema = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};
```

## 🔒 Data Encryption

### At Rest Encryption

#### Firebase Credentials
- **Algorithm**: AES-256-GCM
- **Key Management**: Environment-based encryption keys
- **Storage**: Encrypted JSON in database

```bash
# Required: Exactly 32 characters for AES-256
ENCRYPTION_KEY=your-32-character-encryption-key
```

#### Database Encryption
- **SQLite**: File-level encryption (optional)
- **Sensitive Fields**: Additional field-level encryption
- **Keys**: Separate encryption keys for different data types

### In Transit Encryption

#### HTTPS/TLS
- **Minimum Version**: TLS 1.2
- **Recommended**: TLS 1.3
- **Certificate**: Valid SSL certificate required for production
- **HSTS**: HTTP Strict Transport Security enabled

```javascript
// Express HTTPS configuration
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### API Communication
- **Firebase Admin SDK**: Encrypted communication
- **Client Connections**: HTTPS only
- **Webhooks**: TLS verification required

## 🌐 Network Security

### Security Headers

FCMPanel implements comprehensive security headers:

```javascript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));
```

### CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Rate Limiting

#### Global Rate Limits
- **General API**: 100 requests/minute per IP
- **Authentication**: 5 requests/minute per IP
- **Password Reset**: 3 requests/hour per IP

#### Endpoint-Specific Limits
- **Notification Sending**: 50 requests/minute
- **Device Registration**: 20 requests/minute
- **User Management**: 10 requests/minute

```javascript
const notificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  message: 'Too many notification requests'
});
```

## 🛡️ Input Validation & Sanitization

### Request Validation

FCMPanel uses `express-validator` for comprehensive input validation:

```javascript
// Example validation rules
const notificationValidation = [
  body('title')
    .isLength({ min: 1, max: 100 })
    .escape()
    .trim(),
  body('body')
    .isLength({ min: 1, max: 500 })
    .escape()
    .trim(),
  body('target.type')
    .isIn(['topic', 'device', 'devices'])
];
```

### CSRF Protection

- **Token-Based**: Unique tokens for each session
- **Double Submit**: Cookie and header validation
- **SameSite Cookies**: Strict SameSite policy

```javascript
app.use(csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));
```

### SQL Injection Prevention

- **ORM Usage**: Sequelize ORM with parameterized queries
- **Input Sanitization**: All inputs sanitized and validated
- **Type Checking**: Strict type validation

## 🔍 Audit Logging

### Security Events Logged

1. **Authentication Events**
   - Login attempts (success/failure)
   - Password changes
   - Account lockouts
   - Token generation/refresh

2. **Authorization Events**
   - Permission denials
   - Role changes
   - Privilege escalations

3. **Data Access**
   - Sensitive data access
   - Configuration changes
   - User management actions

4. **System Events**
   - Application starts/stops
   - Configuration changes
   - Error conditions

### Log Format

```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "level": "SECURITY",
  "event": "LOGIN_ATTEMPT",
  "userId": "admin",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "details": {
    "method": "password",
    "sessionId": "abc123"
  }
}
```

## 🔧 Secure Configuration

### Environment Variables

Critical security settings must be configured via environment variables:

```bash
# Security Settings
NODE_ENV=production
SESSION_SECRET=64-char-random-string
JWT_SECRET=64-char-random-string
ENCRYPTION_KEY=32-char-random-string

# Database Security
DB_ENCRYPT=true
DB_KEY=database-encryption-key

# Network Security
ALLOWED_ORIGINS=https://yourdomain.com
TRUST_PROXY=1

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# reCAPTCHA (Optional)
RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key
```

### File Permissions

```bash
# Secure file permissions
chmod 600 .env
chmod 600 data/sessions.sqlite
chmod -R 750 uploads/
chown -R app:app /path/to/fcmpanel
```

### Production Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Strong environment secrets configured
- [ ] File permissions properly set
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] CSRF protection active
- [ ] Input validation implemented
- [ ] Audit logging enabled
- [ ] Error handling doesn't leak information
- [ ] Dependencies regularly updated

## 🚨 Incident Response

### Security Incident Procedures

1. **Detection**
   - Monitor security logs
   - Set up alerts for suspicious activity
   - Regular security audits

2. **Response**
   - Immediate threat containment
   - Evidence preservation
   - Impact assessment

3. **Recovery**
   - System restoration
   - Security patch application
   - Monitoring enhancement

4. **Post-Incident**
   - Root cause analysis
   - Process improvement
   - Documentation update

### Security Monitoring

#### Key Metrics to Monitor

- Failed login attempts
- Unusual API usage patterns
- Privilege escalation attempts
- Database access anomalies
- Network connection patterns

#### Alerting Rules

```javascript
// Example alert configuration
const alerts = {
  failedLogins: {
    threshold: 5,
    window: '5m',
    action: 'lock_account'
  },
  apiAbuse: {
    threshold: 1000,
    window: '1h',
    action: 'rate_limit'
  }
};
```

## 🔐 API Security

### API Key Management

- **Device Registration**: Separate API key for device endpoints
- **Webhook Verification**: HMAC signature verification
- **Key Rotation**: Regular key rotation procedures

### OAuth 2.0 Integration (Future)

Planning for OAuth 2.0 support:
- Authorization code flow
- Client credentials flow
- Scope-based permissions

## 📱 Mobile Security

### Device Token Security

- **Token Validation**: Verify FCM token format
- **Token Refresh**: Handle token updates securely
- **Device Fingerprinting**: Additional device validation

### Push Notification Security

- **Message Encryption**: End-to-end encryption option
- **Content Filtering**: Sensitive data protection
- **Delivery Verification**: Secure delivery confirmation

## 🔍 Security Testing

### Automated Security Scanning

```bash
# Install security audit tools
npm install -g audit-ci
npm install -g snyk

# Run security audits
npm audit
snyk test
audit-ci --moderate
```

### Penetration Testing

Regular security assessments should include:
- Authentication bypass attempts
- SQL injection testing
- XSS vulnerability testing
- CSRF testing
- Rate limiting validation

## 📋 Compliance & Standards

### Security Standards

- **OWASP Top 10**: Address all top security risks
- **NIST Cybersecurity Framework**: Implement core functions
- **ISO 27001**: Information security management

### Data Protection

- **GDPR Compliance**: Data privacy and user rights
- **Data Minimization**: Collect only necessary data
- **Right to Deletion**: Secure data removal procedures

## 🛠️ Security Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review security logs weekly
- [ ] Rotate secrets quarterly
- [ ] Security training for team
- [ ] Vulnerability assessments

### Update Procedures

```bash
# Check for security updates
npm audit
npm update

# Update critical dependencies
npm install package@latest

# Verify application functionality
npm test
```

## 🆘 Reporting Security Issues

### Responsible Disclosure

**GitHub Security**: Use GitHub's security advisory feature

### What to Include

- Detailed description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested mitigation

---

*Security guide last updated: 2025*
*For security concerns, please follow our [Security Policy](../SECURITY.md)* 