# 🔒 Security Policy

## 🛡️ Supported Versions

We provide security updates for the following versions of FCMPanel:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.x.x   | ✅ Fully Supported | TBD           |
| 0.x.x   | ⚠️ Critical Only   | 2025-12-31    |

### Support Levels

- **✅ Fully Supported**: Regular security updates and patches
- **⚠️ Critical Only**: Only critical security vulnerabilities are addressed
- **❌ Not Supported**: No security updates provided

## 🚨 Reporting Security Vulnerabilities

We take security seriously and appreciate the security community's efforts to responsibly disclose vulnerabilities.

### 📧 How to Report

**please create public GitHub issues.**


#### GitHub Security Advisories (Preferred)
- Go to [Security Advisories](https://github.com/moonshadowrev/FCMPanel/security/advisories)
- Click "Report a vulnerability"
- Fill out the vulnerability report form

### 📋 What to Include

Please include the following information in your report:

#### Required Information
- **Vulnerability Type**: [e.g., SQL Injection, XSS, Authentication Bypass]
- **Affected Component**: [e.g., API endpoint, Web interface, Database]
- **Affected Versions**: [e.g., All versions, 1.0.0+]
- **Impact Assessment**: [Critical/High/Medium/Low]

#### Technical Details
- **Step-by-step reproduction**: Detailed steps to reproduce the vulnerability
- **Proof of Concept**: Code, screenshots, or video demonstration
- **Attack Vectors**: How this vulnerability could be exploited
- **Potential Impact**: What an attacker could achieve

#### System Information
- **Environment**: [e.g., Local, Docker, Production setup]
- **Operating System**: [e.g., Ubuntu 20.04, Windows 10]
- **Browser/Client**: [e.g., Chrome 96, API client]
- **Configuration**: Any relevant configuration details

### 🎯 Scope

#### In Scope
- **FCMPanel Application**: All components of the main application
- **Official Docker Images**: Security issues in our Docker configurations
- **Dependencies**: Critical vulnerabilities in our dependencies
- **API Endpoints**: All REST API endpoints
- **Authentication/Authorization**: Login, session management, access control
- **Data Handling**: Firebase credentials, user data, notification content

#### Out of Scope
- **Third-party Services**: Firebase, hosting providers, CDNs
- **Social Engineering**: Attacks targeting users rather than the application
- **Physical Security**: Access to servers, devices
- **DoS Attacks**: Simple denial of service (unless amplification)
- **Brute Force**: Standard brute force attacks on login endpoints
- **Previously Reported**: Issues already known and tracked

### ⏱️ Response Timeline

We are committed to responding quickly to security reports:

| Severity | Initial Response | Investigation | Fix Release |
|----------|------------------|---------------|-------------|
| **Critical** | 24 hours | 72 hours | 7 days |
| **High** | 48 hours | 1 week | 2 weeks |
| **Medium** | 72 hours | 2 weeks | 4 weeks |
| **Low** | 1 week | 4 weeks | Next release |

### 🏆 Recognition

We believe in recognizing security researchers who help make FCMPanel safer:

#### Security Hall of Fame
- Contributors who report valid vulnerabilities will be listed in our Security Hall of Fame
- Credit will be given in release notes and changelog
- Public acknowledgment on our GitHub page (unless you prefer to remain anonymous)

#### Bug Bounty (Future)
- We're planning to establish a bug bounty program
- Rewards will be based on severity and impact
- More details to be announced

## 🔐 Security Best Practices

### For Users

#### Deployment Security
- **Always use HTTPS** in production environments
- **Keep dependencies updated** regularly
- **Use strong passwords** for admin accounts
- **Enable rate limiting** and monitoring
- **Restrict network access** to necessary ports only

#### Configuration Security
```bash
# Use strong, unique secrets
SESSION_SECRET=64-character-random-string
JWT_SECRET=64-character-random-string
ENCRYPTION_KEY=32-character-random-string

# Enable security headers
NODE_ENV=production
TRUST_PROXY=true

# Restrict CORS origins
ALLOWED_ORIGINS=https://yourdomain.com
```

#### Firebase Security
- **Use service accounts** with minimal required permissions
- **Rotate service account keys** regularly
- **Monitor Firebase usage** for unusual activity
- **Enable Firebase security rules** appropriately

### For Developers

#### Secure Development
- **Input validation**: Validate all user inputs
- **Output encoding**: Encode all outputs properly
- **Parameterized queries**: Use ORM/prepared statements
- **Authentication checks**: Verify authentication on all endpoints
- **Authorization checks**: Implement proper access controls

#### Code Review Checklist
- [ ] All inputs are validated and sanitized
- [ ] Authentication is required where needed
- [ ] Authorization checks are implemented
- [ ] No hardcoded secrets or credentials
- [ ] Error messages don't leak sensitive information
- [ ] Security headers are properly configured

## 🚨 Known Security Considerations

### Current Security Measures

#### Authentication & Authorization
- JWT-based authentication with configurable expiration
- Role-based access control (Admin, Manager, User, Viewer)
- Password hashing using bcrypt with salt
- Session management with secure cookies
- Rate limiting on authentication endpoints

#### Data Protection
- AES-256-GCM encryption for Firebase credentials
- HTTPS/TLS for all communications
- Input validation using express-validator
- CSRF protection on form submissions
- SQL injection prevention via Sequelize ORM

#### Infrastructure Security
- Security headers via Helmet.js
- Rate limiting on API endpoints
- CORS configuration for cross-origin requests
- File upload restrictions and validation
- Error handling that doesn't leak information

### Areas of Ongoing Improvement

#### Planned Security Enhancements
- [ ] Enhanced audit logging and monitoring
- [ ] Two-factor authentication (2FA) support
- [ ] OAuth 2.0 integration
- [ ] Advanced rate limiting with IP whitelisting
- [ ] Automated security scanning in CI/CD
- [ ] Regular dependency vulnerability scanning

#### Known Limitations
- **Single-factor authentication**: Currently only password-based
- **Limited audit trail**: Basic logging without advanced analytics
- **Session storage**: SQLite-based session storage (consider Redis for scale)
- **File upload**: Basic file validation (consider advanced scanning)

## 📊 Security Monitoring

### Logging and Monitoring

We log security-relevant events including:
- Authentication attempts (success/failure)
- Authorization failures
- Unusual API usage patterns
- Configuration changes
- System errors and exceptions

### Recommended Monitoring

For production deployments, we recommend:

#### System Monitoring
- **Failed login attempts**: Alert on multiple failures
- **API abuse**: Monitor for unusual request patterns
- **Error rates**: Track application and security errors
- **Resource usage**: Monitor for DoS indicators

#### Security Tools
```bash
# Dependency scanning
npm audit
snyk test

# Security linting
npm install -g eslint-plugin-security
eslint --ext .js .

# Container scanning (if using Docker)
docker scout cves
```

## 🆘 Incident Response

### Security Incident Procedure

#### Immediate Response (0-4 hours)
1. **Acknowledge receipt** of the vulnerability report
2. **Assess severity** and potential impact
3. **Assemble response team** if critical/high severity
4. **Begin investigation** and evidence collection

#### Investigation Phase (4 hours - 1 week)
1. **Reproduce the vulnerability** in a safe environment
2. **Assess the impact** on users and data
3. **Develop a fix** and test thoroughly
4. **Prepare security advisory** and user notifications

#### Resolution Phase (1-4 weeks)
1. **Deploy the fix** to production systems
2. **Notify affected users** if necessary
3. **Publish security advisory** with details
4. **Update documentation** and security measures

#### Post-Incident (1-2 weeks after resolution)
1. **Conduct post-mortem** analysis
2. **Update security procedures** if needed
3. **Implement additional safeguards** to prevent recurrence
4. **Recognize the reporter** publicly (if desired)

### Communication

#### Internal Communication
- Security issues are handled by the core team
- Critical issues may involve external security experts
- All team members are briefed on security best practices

#### External Communication
- **Security advisories** are published for all resolved vulnerabilities
- **Release notes** include security fix information
- **User notifications** for critical issues requiring immediate action
- **Community updates** via GitHub discussions and documentation

## 📚 Security Resources

### Internal Resources
- [Security Guide](wiki/Security.md) - Detailed security implementation
- [API Security](wiki/API-Reference.md#security) - API security documentation
- [Deployment Security](wiki/Deployment.md#security) - Production security guidelines

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Firebase Security Documentation](https://firebase.google.com/docs/rules)

### Security Tools
- **Static Analysis**: ESLint Security Plugin, Semgrep
- **Dependency Scanning**: npm audit, Snyk, WhiteSource
- **Container Security**: Docker Scout, Trivy
- **Runtime Protection**: Helmet.js, express-rate-limit

## 🔄 Security Updates

### Staying Informed

To stay informed about security updates:
- **Watch this repository** for security advisories
- **Subscribe to releases** to get notified of security patches
- **Follow our documentation** for security best practices
- **Join our discussions** for security-related conversations

### Automatic Updates

For non-breaking security updates, consider:
```bash
# Enable automatic security updates
npm install -g npm-check-updates
ncu -u
npm audit fix
```

### Manual Review Required

Always manually review:
- Major version updates of dependencies
- Changes to authentication/authorization logic
- Modifications to security-related configurations
- Updates affecting data encryption or storage

---

**Last Updated**: 2025  
**Version**: 1.0  

*Thank you for helping keep FCMPanel and our users safe! 🛡️* 