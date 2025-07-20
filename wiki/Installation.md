# 🚀 Installation Guide

This guide will walk you through installing FCMPanel on your system.

## 📋 Prerequisites

Before installing FCMPanel, ensure you have the following:

### System Requirements
- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 7.0.0 or higher (or **yarn** 1.22.0+)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Firebase Requirements
- Firebase project with Cloud Messaging enabled
- Firebase service account credentials (JSON file)
- Admin access to Firebase console

### Optional Requirements
- **SQLite**: For database (automatically handled by the application)
- **Git**: For cloning the repository
- **PM2**: For production deployment

## 🔽 Installation Methods

### Method 1: Clone from GitHub (Recommended)

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

### Method 2: Download ZIP

1. Download the latest release from [GitHub Releases](https://github.com/moonshadowrev/FCMPanel/releases)
2. Extract the ZIP file
3. Navigate to the extracted directory
4. Install dependencies:
   ```bash
   npm install
   ```

### Method 3: Using npm (Future Release)

```bash
# This will be available in future releases
npm install -g fcmpanel
```

## ⚙️ Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Security (Generate strong random strings)
SESSION_SECRET=your-super-secret-session-key-min-32-chars
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRE=1d
JWT_COOKIE_EXPIRE=1

# Encryption (MUST be exactly 32 characters for AES-256)
ENCRYPTION_KEY=your-32-character-encryption-key

# Device Registration API Security
DEVICE_REGISTRATION_API_KEY=your-secure-api-key-for-devices

# reCAPTCHA v2 (Optional - for additional security)
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# Optional: Default Firebase Configuration
# Only use if you have a single Firebase project
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Generate Secure Keys

Generate secure random keys for your environment:

```bash
# Generate 32-character encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Firebase Service Account Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Keep this file secure - you'll upload it through the dashboard

## 🗄️ Database Setup

FCMPanel uses SQLite by default, which requires no additional setup.

### Initialize Database

```bash
# Run database migrations
npm run migrate

# Seed with initial data (creates admin user)
npm run seed

# Optional: Generate demo data for testing
npm run demo-data
```

### Database Migration Options

```bash
# Standard migration
npm run migrate

# Reset database (WARNING: Deletes all data)
npm run migrate:reset

# Check migration status
npm run migrate:status
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

This starts the application with:
- Hot reloading enabled
- Detailed error messages
- Debug logging
- File watching

### Production Mode

```bash
npm start
```

This starts the application with:
- Optimized performance
- Minimal logging
- Security headers enabled
- Session persistence

### Using PM2 (Production Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server.js --name "fcmpanel"

# Configure auto-restart on boot
pm2 startup
pm2 save
```

## 🔐 First-Time Setup

1. **Access the dashboard**
   ```
   http://localhost:3000
   ```

2. **Login with default credentials**
   - Username: `admin`
   - Password: `Admin123!`

3. **Change default password immediately**
   - Go to Profile settings
   - Update password to something secure

4. **Add Firebase account**
   - Navigate to Accounts section
   - Upload your Firebase service account JSON
   - Set as default account

5. **Test notification**
   - Go to Notifications section
   - Send a test notification

## 🐳 Docker Installation (Alternative)

### Using Docker Compose

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     fcmpanel:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - PORT=3000
       volumes:
         - ./data:/app/data
         - ./.env:/app/.env
       restart: unless-stopped
   ```

2. **Run with Docker**
   ```bash
   docker-compose up -d
   ```

### Using Docker Directly

```bash
# Build the image
docker build -t fcmpanel .

# Run the container
docker run -d \
  --name fcmpanel \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  fcmpanel
```

## 🔧 Troubleshooting Installation

### Common Issues

#### Node.js Version Issues
```bash
# Check Node.js version
node --version

# Use nvm to install correct version
nvm install 16
nvm use 16
```

#### Permission Issues (Linux/macOS)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm start
```

#### SQLite Issues
```bash
# Rebuild sqlite3
npm rebuild sqlite3

# Or remove and reinstall
npm uninstall sqlite3
npm install sqlite3
```

### Verification Steps

1. **Check if all dependencies installed**
   ```bash
   npm list --depth=0
   ```

2. **Verify database connection**
   ```bash
   npm run migrate:status
   ```

3. **Test application startup**
   ```bash
   npm run dev
   ```

4. **Check logs for errors**
   ```bash
   tail -f logs/app.log
   ```


## 🎯 Next Steps

After successful installation:

1. [Learn about Security](Security.md)

## 🆘 Getting Help

If you encounter issues:

1. Search [existing issues](https://github.com/moonshadowrev/FCMPanel/issues)
2. [Create a new issue](https://github.com/moonshadowrev/FCMPanel/issues/new)

---

*Installation guide last updated: 2025* 