# 🚀 UTM TRACKING - BACKEND INTEGRATION

## ✅ **ĐÃ HOÀN THÀNH:**

### **📊 Analytics API Service:**
- **Backend URL**: `https://finan-backend-vn.onrender.com/api/v1`
- **Install tracking**: `/analytics/install`
- **Event tracking**: `/analytics/event`
- **UTM stats**: `/analytics/utm-stats`
- **Dashboard**: `/analytics/dashboard`

### **🔧 UTM Tracking Service:**
- **Backend integration** - Gửi data lên server thay vì chỉ console
- **Device info collection** - Platform, app version, device model
- **Error handling** - Fallback khi backend không available
- **Local storage** - Backup data trong AsyncStorage

---

## 📡 **DATA GỬI LÊN BACKEND:**

### **Install Event:**
```json
{
  "utm_source": "facebook",
  "utm_medium": "cpc", 
  "utm_campaign": "crypto_launch",
  "utm_content": "video_ad",
  "utm_term": "crypto_wallet",
  "referral_code": "USER123",
  "platform": "android",
  "install_date": "2024-01-15T10:30:00.000Z",
  "device_info": {
    "platform": "android",
    "app_version": "1.0.0",
    "device_model": "iPhone 15 Pro",
    "os_version": "17.2"
  },
  "tracked_at": "2024-01-15T10:30:00.000Z",
  "event_type": "app_install"
}
```

### **Custom Events:**
```json
{
  "event_name": "first_deposit",
  "event_params": {
    "deposit_amount": 100,
    "deposit_token": "USDT",
    "event_category": "monetization",
    "value": 100,
    "days_since_install": 3
  },
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "crypto_launch", 
  "timestamp": "2024-01-18T14:20:00.000Z",
  "platform": "android",
  "tracked_at": "2024-01-18T14:20:00.000Z"
}
```

---

## 🎯 **CÁC EVENTS ĐƯỢC TRACK:**

### **Install Events:**
- `app_install` - Khi user install app lần đầu
- `deep_link_click` - Khi user click deep link

### **User Behavior Events:**
- `app_open` - Mỗi lần mở app
- `wallet_created` - Tạo wallet mới
- `first_deposit` - Nạp tiền lần đầu
- `token_swap` - Swap token
- `high_value_action` - Actions > $100
- `retention_day_X` - Retention milestones

---

## 🔧 **BACKEND ENDPOINTS CẦN IMPLEMENT:**

### **1. POST /analytics/install**
```javascript
// Request body
{
  utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  referral_code, platform, install_date, device_info, 
  tracked_at, event_type
}

// Response
{
  "success": true,
  "install_id": "uuid",
  "message": "Install tracked successfully"
}
```

### **2. POST /analytics/event**
```javascript
// Request body
{
  event_name, event_params, utm_source, utm_medium, utm_campaign,
  timestamp, platform, tracked_at
}

// Response
{
  "success": true,
  "event_id": "uuid", 
  "message": "Event tracked successfully"
}
```

### **3. GET /analytics/utm-stats?range=30d**
```javascript
// Response
{
  "total_installs": 1250,
  "sources": {
    "facebook": { "installs": 450, "conversions": 45, "revenue": 3375 },
    "telegram": { "installs": 380, "conversions": 38, "revenue": 2850 },
    "organic": { "installs": 420, "conversions": 20, "revenue": 1500 }
  },
  "campaigns": {
    "crypto_launch": { "installs": 650, "cost": 1625, "roi": 2.1 },
    "defi_promo": { "installs": 400, "cost": 1200, "roi": 1.8 }
  },
  "time_range": "30d"
}
```

### **4. GET /analytics/dashboard**
```javascript
// Response
{
  "overview": {
    "total_users": 5420,
    "active_users_30d": 3240,
    "retention_rate": 0.65,
    "avg_revenue_per_user": 45.50
  },
  "top_sources": [...],
  "recent_events": [...],
  "conversion_funnel": {...}
}
```

---

## 📊 **CÁCH SỬ DỤNG:**

### **Track Events trong Code:**
```typescript
import { UTMEventTracker } from '../core/services/utm_event_tracker';

// Track deposit
await UTMEventTracker.trackFirstDeposit(100, 'USDT');

// Track swap  
await UTMEventTracker.trackTokenSwap('USDT', 'BNB', 100, 0.25);

// Track wallet creation
await UTMEventTracker.trackWalletCreated('new');
```

### **Xem UTM Stats:**
```typescript
import { AnalyticsApiService } from '../data/services/analytics_api_service';

// Lấy stats 30 ngày
const stats = await AnalyticsApiService.getUTMStats('30d');
console.log('UTM Stats:', stats);

// Lấy dashboard data
const dashboard = await AnalyticsApiService.getAnalyticsDashboard();
console.log('Dashboard:', dashboard);
```

---

## 🔗 **UTM LINKS ĐỂ TEST:**

### **Facebook Ads:**
```
https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=facebook&utm_medium=cpc&utm_campaign=crypto_launch&utm_content=video_ad
```

### **Telegram Channel:**
```
https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=telegram&utm_medium=social&utm_campaign=community_growth&utm_content=channel_post
```

### **TikTok Ads:**
```
https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=tiktok&utm_medium=cpc&utm_campaign=defi_promo&utm_content=crypto_video
```

---

## 🎯 **TESTING WORKFLOW:**

### **1. Test Install Tracking:**
1. Click UTM link → Install app
2. Mở app lần đầu
3. Check console logs: "✅ Install event sent to backend successfully"
4. Verify data trong backend database

### **2. Test Event Tracking:**
1. Perform actions trong app (deposit, swap, etc.)
2. Check console logs: "✅ Event 'first_deposit' sent to backend successfully"
3. Verify events trong backend

### **3. Test UTM Stats:**
1. Call `AnalyticsApiService.getUTMStats()`
2. Verify response data
3. Check dashboard metrics

---

## 📈 **EXPECTED BACKEND RESPONSE:**

### **Successful Install Tracking:**
```
📊 Sending install event to backend: {
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "crypto_launch",
  "platform": "android",
  "install_date": "2024-01-15T10:30:00.000Z",
  "device_info": {...}
}
✅ Install tracked to backend: { "success": true, "install_id": "abc123" }
✅ Install event sent to backend successfully
```

### **Successful Event Tracking:**
```
📊 Sending event 'first_deposit' to backend: {
  "event_name": "first_deposit",
  "event_params": { "deposit_amount": 100, "deposit_token": "USDT" },
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "timestamp": "2024-01-18T14:20:00.000Z"
}
✅ Event 'first_deposit' tracked to backend: { "success": true, "event_id": "def456" }
✅ Event 'first_deposit' sent to backend successfully
```

---

## 🚀 **NEXT STEPS:**

1. **✅ HOÀN THÀNH:** Frontend UTM tracking với backend integration
2. **🔄 TIẾP THEO:** Backend team implement analytics endpoints
3. **📊 SAU ĐÓ:** Test end-to-end tracking workflow
4. **🎯 CUỐI CÙNG:** Setup dashboard để xem UTM performance

**UTM tracking với backend integration đã sẵn sàng! Backend team có thể implement endpoints theo spec trên.** 🎉
