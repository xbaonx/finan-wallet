# Push Notification Setup cho Finan Wallet

## 1. Cài đặt Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

## 2. Cấu hình app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff",
      "androidMode": "default",
      "androidCollapsedTitle": "Finan Wallet"
    }
  }
}
```

## 3. Tạo NotificationService

```typescript
// src/data/services/notification_service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Cấu hình notification handler
  setupNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // Xin quyền và lấy push token
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications chỉ hoạt động trên thiết bị thật');
      return null;
    }

    // Kiểm tra quyền hiện tại
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Xin quyền nếu chưa có
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Không được cấp quyền push notification');
      return null;
    }

    // Lấy Expo push token
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      this.expoPushToken = token.data;
      console.log('✅ Expo Push Token:', token.data);
      
      // TODO: Gửi token lên server để lưu trữ
      await this.sendTokenToServer(token.data);
      
      return token.data;
    } catch (error) {
      console.error('Lỗi khi lấy push token:', error);
      return null;
    }
  }

  // Gửi token lên server (implement sau)
  private async sendTokenToServer(token: string) {
    try {
      // TODO: Gửi token lên backend để lưu trữ
      console.log('📤 Gửi token lên server:', token);
      
      // Ví dụ API call:
      // await fetch('https://your-backend.com/api/push-tokens', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, userId: 'current-user-id' })
      // });
    } catch (error) {
      console.error('Lỗi khi gửi token lên server:', error);
    }
  }

  // Gửi local notification (test)
  async sendLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Gửi ngay lập tức
    });
  }

  // Lắng nghe notification được tap
  setupNotificationListeners() {
    // Khi app đang mở và nhận notification
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Nhận notification:', notification);
    });

    // Khi user tap vào notification
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 User tap notification:', response);
      
      // TODO: Điều hướng đến màn hình tương ứng
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  }

  private handleNotificationTap(data: any) {
    // TODO: Implement navigation logic
    console.log('🔄 Handle notification tap:', data);
    
    // Ví dụ:
    // if (data.type === 'swap_success') {
    //   navigation.navigate('Dashboard');
    // } else if (data.type === 'deposit_confirmed') {
    //   navigation.navigate('DepositWithdraw');
    // }
  }

  // Lấy push token hiện tại
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}
```

## 4. Tích hợp vào App.tsx

```typescript
// App.tsx
import { NotificationService } from './src/data/services/notification_service';

export default function App() {
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    // Setup notification
    notificationService.setupNotificationHandler();
    notificationService.setupNotificationListeners();
    
    // Đăng ký push notification
    notificationService.registerForPushNotifications();
  }, []);

  // ... rest of your app
}
```

## 5. Sử dụng trong Components

```typescript
// Trong SwapScreen.tsx hoặc bất kỳ đâu
import { NotificationService } from '../../data/services/notification_service';

const notificationService = NotificationService.getInstance();

// Gửi notification khi swap thành công
const handleSwapSuccess = () => {
  notificationService.sendLocalNotification(
    'Giao dịch thành công! 🎉',
    'Swap token đã hoàn tất thành công',
    { type: 'swap_success', timestamp: Date.now() }
  );
};

// Gửi notification khi deposit được xác nhận
const handleDepositConfirmed = () => {
  notificationService.sendLocalNotification(
    'Nạp tiền thành công! 💰',
    'USDT đã được thêm vào ví của bạn',
    { type: 'deposit_confirmed', amount: '100 USDT' }
  );
};
```

## 6. Backend Integration (Optional)

Để gửi push notification từ server, bạn có thể:

### Option A: Sử dụng Expo Push API
```javascript
// Backend code (Node.js example)
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const sendPushNotification = async (pushToken, title, body, data) => {
  const messages = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  }];

  const chunks = expo.chunkPushNotifications(messages);
  
  for (let chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Push notification sent:', ticketChunk);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
};
```

### Option B: Sử dụng Firebase (nếu cần advanced features)

## 7. Use Cases cho Finan Wallet

```typescript
// Các tình huống gửi notification:

// 1. Giao dịch swap thành công/thất bại
notificationService.sendLocalNotification(
  'Swap hoàn tất',
  'Bạn đã mua 1.5 BNB thành công'
);

// 2. Deposit được xác nhận
notificationService.sendLocalNotification(
  'Nạp tiền thành công',
  '100 USDT đã được thêm vào ví'
);

// 3. Giá token thay đổi đáng kể
notificationService.sendLocalNotification(
  'Cảnh báo giá',
  'BNB tăng 15% trong 24h qua'
);

// 4. Bảo mật - đăng nhập từ thiết bị mới
notificationService.sendLocalNotification(
  'Cảnh báo bảo mật',
  'Phát hiện đăng nhập từ thiết bị mới'
);
```

## 8. Testing

```typescript
// Test notification trong development
const testNotification = () => {
  notificationService.sendLocalNotification(
    'Test Notification',
    'Đây là test push notification',
    { test: true }
  );
};
```

## Lưu ý:
- Push notification chỉ hoạt động trên thiết bị thật, không hoạt động trên simulator
- Cần build development hoặc production build để test đầy đủ
- Expo Go có thể có giới hạn về push notification
