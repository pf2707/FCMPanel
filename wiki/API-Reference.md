# 🔌 API Reference

FCMPanel provides a comprehensive RESTful API for programmatic access to all functionality.

## 📱 Device Management

### Register Device

Register a new FCM device or update existing device information.

```http
POST /api/devices/register
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
API-Key: YOUR_DEVICE_API_KEY

{
  "token": "fcm_device_token_here",
  "platform": "android|ios|web",
  "appVersion": "1.0.0",
  "osVersion": "Android 12",
  "deviceModel": "Samsung Galaxy S21",
  "userId": "optional_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 123,
    "token": "fcm_device_token_here",
    "platform": "android",
    "isActive": true,
    "registeredAt": "2025-01-01T00:00:00.000Z",
    "lastActiveAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Get Device Status

Retrieve status and information for a specific device.

```http
GET /api/devices/status/:deviceId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 123,
    "token": "fcm_device_token_here",
    "platform": "android",
    "appVersion": "1.0.0",
    "isActive": true,
    "registeredAt": "2025-01-01T00:00:00.000Z",
    "lastActiveAt": "2025-01-01T00:00:00.000Z",
    "topicSubscriptions": ["news", "updates"]
  }
}
```

## 📝 SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class FCMPanelAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }


  async registerDevice(deviceData) {
    const response = await this.client.post('/api/devices/register', deviceData);
    return response.data;
  }
}

// Usage
const api = new FCMPanelAPI('http://localhost:3000', 'your_jwt_token');
```

*API Reference last updated: 2025* 