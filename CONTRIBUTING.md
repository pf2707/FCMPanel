# 🤝 Contributing to FCMPanel

Thank you for your interest in contributing to FCMPanel! We welcome contributions from developers of all skill levels and backgrounds. This guide will help you get started with contributing to our Firebase Cloud Messaging dashboard.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Ways to Contribute](#-ways-to-contribute)
- [Development Setup](#-development-setup)
- [Pull Request Process](#-pull-request-process)
- [Coding Standards](#-coding-standards)
- [Testing Guidelines](#-testing-guidelines)
- [Documentation](#-documentation)
- [Community](#-community)

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (v20.0.0 or higher)
- **npm** or **yarn**
- **Git** for version control
- A **GitHub account**
- **Firebase project** for testing (optional but recommended)

### First Steps

1. **⭐ Star the repository** (it helps!)
2. **🍴 Fork the repository** to your GitHub account
3. **📥 Clone your fork** locally
4. **🔧 Set up your development environment**

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/FCMPanel.git
cd FCMPanel

# Add upstream remote
git remote add upstream https://github.com/moonshadowrev/FCMPanel.git

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Set up database
npm run migrate
npm run seed
```

## 🎯 Ways to Contribute

We welcome various types of contributions:

### 🐛 Bug Reports
- Report bugs using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- Check existing issues to avoid duplicates
- Provide clear reproduction steps
- Include environment details

### 💡 Feature Requests
- Suggest new features using our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)
- Discuss the feature in issues before implementing
- Consider the project's scope and goals

### 🔧 Code Contributions
- **Bug fixes**: Fix existing issues
- **New features**: Implement approved feature requests
- **Performance improvements**: Optimize existing code
- **Security enhancements**: Improve security measures

### 📚 Documentation
- **API documentation**: Improve API reference
- **User guides**: Write tutorials and how-tos
- **Code comments**: Add clear code documentation
- **Wiki pages**: Contribute to our [wiki](wiki/)

### 🎨 Design & UI/UX
- **UI improvements**: Enhance user interface
- **UX optimization**: Improve user experience
- **Accessibility**: Make the app more accessible
- **Responsive design**: Improve mobile experience

### 🧪 Testing
- **Write tests**: Add unit, integration, or E2E tests
- **Test coverage**: Improve test coverage
- **Test automation**: Enhance CI/CD pipelines
- **Performance testing**: Add performance benchmarks

## 🛠️ Development Setup

### Environment Configuration

Create a `.env` file with the following:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Security (generate random strings)
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key

# Development API Key
DEVICE_REGISTRATION_API_KEY=dev-api-key

# Optional: Firebase Configuration for testing
# FIREBASE_PROJECT_ID=your-test-project
# FIREBASE_CLIENT_EMAIL=your-service-account
# FIREBASE_PRIVATE_KEY="your-private-key"
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Run database migrations
npm run migrate

# Seed database with test data
npm run seed

# Generate demo data for testing
npm run demo-data

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Development Workflow

1. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-number
   ```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly:
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes** with conventional commits:
   ```bash
   git add .
   git commit -m "feat: add new notification scheduling feature"
   ```

5. **Push to your fork** and create a pull request

## 📤 Pull Request Process

### Before Submitting

- [ ] **Check existing PRs** to avoid duplicates
- [ ] **Link to related issues** in your PR description
- [ ] **Write clear commit messages** using conventional commits
- [ ] **Test your changes** thoroughly
- [ ] **Update documentation** if needed
- [ ] **Follow our coding standards**

### PR Guidelines

#### Title Format
Use conventional commit format:
- `feat: add notification scheduling`
- `fix: resolve authentication timeout issue`
- `docs: update API documentation`
- `style: improve dashboard layout`
- `refactor: optimize database queries`
- `test: add unit tests for notifications`

#### Description Template

```markdown
## 📝 Description
Brief description of changes made.

## 🔗 Related Issues
Fixes #123
Related to #456

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passed
- [ ] Manual testing completed
- [ ] No breaking changes

## 📸 Screenshots (if applicable)
[Add screenshots for UI changes]

## ✅ Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No new lint warnings
```

### Review Process

1. **Automated Checks**: CI/CD will run tests and linting
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any review comments
4. **Approval**: Once approved, your PR will be merged

### Merge Requirements

- [ ] All CI checks passing
- [ ] At least one maintainer approval
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] All conversations resolved

## 📐 Coding Standards

### JavaScript/Node.js Style

We follow standard JavaScript conventions with some project-specific rules:

#### Code Formatting
```javascript
// Use 2 spaces for indentation
if (condition) {
  doSomething();
}

// Use single quotes for strings
const message = 'Hello, world!';

// Use template literals for string interpolation
const greeting = `Hello, ${name}!`;

// Use arrow functions for callbacks
const items = array.map(item => item.value);
```

#### Naming Conventions
```javascript
// Use camelCase for variables and functions
const userName = 'john_doe';
const getUserData = () => { /* ... */ };

// Use PascalCase for classes and constructors
class NotificationService {
  constructor() { /* ... */ }
}

// Use UPPER_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
```

#### Error Handling
```javascript
// Always handle errors appropriately
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error('API call failed:', error);
  throw new CustomError('Failed to fetch data');
}

// Use early returns to reduce nesting
function processUser(user) {
  if (!user) {
    return null;
  }
  
  if (!user.isActive) {
    return null;
  }
  
  return processActiveUser(user);
}
```

### Database & Models

```javascript
// Use descriptive model names
const NotificationHistory = sequelize.define('NotificationHistory', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  }
});

// Use proper associations
NotificationHistory.belongsTo(User);
User.hasMany(NotificationHistory);
```

### API Design

```javascript
// Use RESTful conventions
app.get('/api/notifications', getNotifications);      // GET collection
app.get('/api/notifications/:id', getNotification);   // GET single item
app.post('/api/notifications', createNotification);   // CREATE
app.put('/api/notifications/:id', updateNotification); // UPDATE
app.delete('/api/notifications/:id', deleteNotification); // DELETE

// Use consistent response format
const response = {
  success: true,
  data: result,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 100
  }
};
```

### Security Considerations

```javascript
// Validate all inputs
const { body, validationResult } = require('express-validator');

app.post('/api/notifications',
  [
    body('title').isLength({ min: 1, max: 100 }).escape(),
    body('body').isLength({ min: 1, max: 500 }).escape(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);

// Use parameterized queries (Sequelize handles this)
const user = await User.findOne({
  where: { id: userId }
});
```

## 🧪 Testing Guidelines

### Test Structure

We use Jest for testing. Organize tests as follows:

```
tests/
├── unit/
│   ├── models/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    └── scenarios/
```

### Writing Tests

#### Unit Tests
```javascript
// tests/unit/services/notificationService.test.js
const NotificationService = require('../../../services/notificationService');

describe('NotificationService', () => {
  describe('createNotification', () => {
    it('should create notification with valid data', async () => {
      const data = {
        title: 'Test Notification',
        body: 'Test message'
      };
      
      const result = await NotificationService.create(data);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(data.title);
    });
    
    it('should throw error with invalid data', async () => {
      const data = { title: '' }; // Invalid: empty title
      
      await expect(NotificationService.create(data))
        .rejects.toThrow('Title is required');
    });
  });
});
```

#### Integration Tests
```javascript
// tests/integration/api/notifications.test.js
const request = require('supertest');
const app = require('../../../server');

describe('Notifications API', () => {
  let authToken;
  
  beforeEach(async () => {
    // Set up test data
    authToken = await getTestAuthToken();
  });
  
  it('should create notification via API', async () => {
    const response = await request(app)
      .post('/api/notifications/send')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Notification',
        body: 'Test message',
        target: { type: 'topic', value: 'test' }
      });
      
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Test Coverage

Aim for:
- **Unit tests**: 80%+ coverage for business logic
- **Integration tests**: All API endpoints
- **E2E tests**: Critical user workflows

Run coverage reports:
```bash
npm run test:coverage
```

## 📚 Documentation

### Code Documentation

```javascript
/**
 * Sends a push notification to specified targets
 * @param {Object} notification - The notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.target - Target configuration
 * @param {string} notification.target.type - Target type (topic|device|devices)
 * @param {string|Array} notification.target.value - Target value(s)
 * @param {number} firebaseAccountId - Firebase account ID to use
 * @returns {Promise<Object>} Notification result with statistics
 * @throws {ValidationError} When notification data is invalid
 * @throws {FirebaseError} When Firebase operation fails
 */
async function sendNotification(notification, firebaseAccountId) {
  // Implementation
}
```

### API Documentation

Update API documentation when adding new endpoints:

```javascript
/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send push notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
```

### README Updates

Update README.md for:
- New features
- Changed installation steps
- Updated prerequisites
- New configuration options

## 🏷️ Issue Labels

We use labels to categorize issues and PRs:

### Type Labels
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `security` - Security-related issues
- `performance` - Performance improvements

### Priority Labels
- `priority-critical` - Urgent fixes needed
- `priority-high` - Important, should be addressed soon
- `priority-medium` - Moderate importance
- `priority-low` - Nice to have

### Status Labels
- `needs-triage` - Needs initial review
- `needs-discussion` - Requires community input
- `ready-to-implement` - Approved and ready for development
- `in-progress` - Currently being worked on
- `blocked` - Cannot proceed due to dependencies

### Difficulty Labels
- `good-first-issue` - Good for newcomers
- `beginner` - Easy difficulty
- `intermediate` - Moderate difficulty
- `advanced` - High difficulty

## 🌟 Recognition

We believe in recognizing our contributors:

### Contributor Types
- **Code Contributors**: Direct code contributions
- **Bug Reporters**: Quality bug reports
- **Feature Requesters**: Valuable feature suggestions
- **Documentation Contributors**: Documentation improvements
- **Community Helpers**: Helping others in discussions

### Recognition Methods
- **Contributors list**: Updated in README
- **Release notes**: Credit in changelog
- **GitHub profile**: Contributor badge
- **Social media**: Shout-outs on social platforms

## 🆘 Getting Help

### Where to Ask Questions

1. **GitHub Discussions**: For general questions and discussions
2. **Issues**: For bug reports and feature requests
3. **Documentation**: Check our comprehensive [wiki](wiki/)
4. **Direct Contact**: Email maintainers for urgent matters

### Response Times

- **Issues**: 2-3 business days
- **Pull Requests**: 3-5 business days
- **Discussions**: 1-2 business days
- **Security Issues**: 24-48 hours

### Mentorship

New contributors can request mentorship:
- Assign yourself to "good first issue" tickets
- Comment on issues asking for guidance
- Join our community discussions
- Pair programming sessions (by request)

## 🎯 Project Goals

Understanding our project goals helps align contributions:

### Primary Goals
1. **Simplicity**: Easy to install, configure, and use
2. **Security**: Enterprise-grade security features
3. **Scalability**: Handle high notification volumes
4. **Reliability**: Minimal downtime and data loss
5. **Extensibility**: Easy to extend and customize

### Non-Goals
- **Mobile app**: We focus on web dashboard
- **Email notifications**: FCM only
- **SMS integration**: Outside project scope
- **Complex analytics**: Basic analytics only

## 📅 Release Cycle

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **Major (x.0.0)**: Breaking changes
- **Minor (0.x.0)**: New features, backward compatible
- **Patch (0.0.x)**: Bug fixes, backward compatible

### Release Schedule
- **Major releases**: 6-12 months
- **Minor releases**: 1-3 months
- **Patch releases**: As needed
- **Security releases**: Immediate

### Release Process
1. **Feature freeze**: No new features
2. **Testing period**: Extensive testing
3. **Documentation update**: Update all docs
4. **Release**: Tag and publish
5. **Announcement**: Communicate changes

## 📞 Contact

**Maintainer**: [moonshadowrev](https://github.com/moonshadowrev)
**Project**: [FCMPanel](https://github.com/moonshadowrev/FCMPanel)
**Documentation**: [GitHub Pages](https://moonshadowrev.github.io/FCMPanel/)
**Discussions**: [GitHub Discussions](https://github.com/moonshadowrev/FCMPanel/discussions)

---

## ✅ Quick Checklist for Contributors

Before contributing, make sure you:

- [ ] Read the [Code of Conduct](CODE_OF_CONDUCT.md)
- [ ] Set up your development environment
- [ ] Familiarized yourself with the codebase
- [ ] Checked existing issues and PRs
- [ ] Created an issue for discussion (for features)
- [ ] Followed our coding standards
- [ ] Added/updated tests for your changes
- [ ] Updated documentation if needed
- [ ] Used conventional commit messages

---

**Thank you for contributing to FCMPanel! 🎉**

*Every contribution, no matter how small, makes a difference. We appreciate your time and effort in making FCMPanel better for everyone.* 