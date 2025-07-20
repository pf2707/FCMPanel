<div align="center">

# 🔔 FCMPanel

**A Modern Firebase Cloud Messaging Dashboard**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/moonshadowrev/FCMPanel?style=social)](https://github.com/moonshadowrev/FCMPanel/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/moonshadowrev/FCMPanel)](https://github.com/moonshadowrev/FCMPanel/issues)
[![GitHub Forks](https://img.shields.io/github/forks/moonshadowrev/FCMPanel?style=social)](https://github.com/moonshadowrev/FCMPanel/network/members)

*Secure, scalable, and user-friendly Firebase Cloud Messaging management platform with multi-account support*

[🚀 Quick Start](#-quick-start) • 
[📖 Documentation](https://moonshadowrev.github.io/FCMPanel/) • 
[🐛 Report Bug](https://github.com/moonshadowrev/FCMPanel/issues) • 
[💡 Request Feature](https://github.com/moonshadowrev/FCMPanel/issues) • 
[🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

FCMPanel is a comprehensive web-based dashboard designed to simplify Firebase Cloud Messaging (FCM) management. Whether you're managing a single app or multiple projects, FCMPanel provides an intuitive interface to send notifications, manage devices, and track messaging history across multiple Firebase accounts.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Secure Authentication** | JWT-based authentication with role-based access control |
| 🏢 **Multi-Account Support** | Manage multiple Firebase projects from a single dashboard |
| 📱 **Device Management** | Register, track, and manage FCM-enabled devices |
| 📢 **Topic Broadcasting** | Send notifications to topic-subscribed devices |
| 🎯 **Targeted Messaging** | Send direct notifications to specific devices |
| 📊 **Analytics & History** | Comprehensive notification tracking and statistics |
| 🔒 **Enterprise Security** | Encrypted credential storage with multiple security layers |
| 🌐 **RESTful API** | Full API access for programmatic integration |

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v20.0.0 or higher)
- **npm** or **yarn**
- **Firebase Project** with FCM enabled
- **Firebase Service Account** credentials

### ⚡ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/moonshadowrev/FCMPanel.git
   cd FCMPanel
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

6. **Access the dashboard**
   ```
   http://localhost:3000
   ```

### 🔑 Default Credentials

After seeding, use these credentials for initial access:
- **Username:** `admin`
- **Password:** `Admin123!`

> ⚠️ **Security Note:** Change these credentials immediately after first login!

## 📋 Environment Configuration

Create a `.env` file with the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=1d
JWT_COOKIE_EXPIRE=1

# Encryption (32 characters for AES-256)
ENCRYPTION_KEY=your-32-character-encryption-key

# Device Registration API
DEVICE_REGISTRATION_API_KEY=your-device-api-key

# reCAPTCHA v2 (optional)
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# Optional: Default Firebase Config
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=your-service-account-email
# FIREBASE_PRIVATE_KEY="your-private-key"
```

## 🏗️ Architecture

```
FCMPanel/
├── 📁 config/          # Configuration files
├── 📁 middleware/      # Express middleware
├── 📁 models/          # Database models
├── 📁 routes/          # API routes
├── 📁 views/           # EJS templates
├── 📁 public/          # Static assets
├── 📁 scripts/         # Utility scripts
└── 📁 docs/            # Documentation
```

## 🚀 API Reference

### Device Management
- `POST /api/devices/register` - Register a new device

## 🛡️ Security Features

FCMPanel implements enterprise-grade security:

- 🔐 **JWT Authentication** with refresh tokens
- 🔒 **AES-256 Encryption** for sensitive data
- 🛡️ **CSRF Protection** on all forms
- ⏱️ **Rate Limiting** to prevent abuse
- 🔧 **Helmet.js** for HTTP headers security
- 🍪 **Secure Cookies** with HttpOnly flags
- 🔑 **bcrypt** password hashing

## 🧪 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm run migrate` | Run database migrations |
| `npm run migrate:reset` | Reset database (⚠️ destroys data) |
| `npm run seed` | Seed database with initial data |
| `npm run demo-data` | Generate demo data for testing |

### 🔧 Development Setup

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes and test**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push and create a Pull Request**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### 📋 How to Contribute

1. 🍴 Fork the repository
2. 🌟 Star the project (it helps!)
3. 📝 Create an issue for bugs or features
4. 🔧 Submit a pull request

### 🎯 Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🧪 Test coverage expansion
- 🌐 Internationalization (i18n)

## 📚 Documentation

- 📖 [Full Documentation](https://moonshadowrev.github.io/FCMPanel/)
- 🗃️ [Wiki Pages](wiki/)
- 🔒 [Security Guide](wiki/Security.md)

## 🗺️ Roadmap

- [ ] 📊 Advanced analytics dashboard
- [ ] 🌐 Multi-language support
- [ ] 🔗 Webhook integrations
- [ ] 📱 Progressive Web App (PWA)

## 🙏 Acknowledgments

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- All our amazing [contributors](https://github.com/moonshadowrev/FCMPanel/contributors)

## 🛟 Support

- 📝 [Create an Issue](https://github.com/moonshadowrev/FCMPanel/issues/new/choose)
- 💬 [Discussions](https://github.com/moonshadowrev/FCMPanel/discussions)

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ If FCMPanel helped you, please consider giving it a star! ⭐**

Made with ❤️ by [moonshadowrev](https://github.com/moonshadowrev)

[🔝 Back to Top](#-fcmpanel)

</div> 