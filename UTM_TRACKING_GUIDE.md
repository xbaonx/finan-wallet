# 📊 UTM TRACKING GUIDE - FINAN WALLET

## 🚀 **ĐÃ SETUP XONG:**

✅ **UTM Tracking Service** - Track nguồn install và user behavior  
✅ **Firebase Analytics** - Real-time dashboard và reports  
✅ **Event Tracker Helpers** - Dễ dàng track các actions quan trọng  
✅ **Auto-initialization** - Tự động chạy khi app khởi động  

---

## 🔗 **CÁCH TẠO UTM LINKS:**

### **1. Facebook Ads:**
```
App Store: https://apps.apple.com/app/id123456789?pt=123456&ct=facebook_crypto_launch&mt=8

Play Store: https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=facebook&utm_medium=cpc&utm_campaign=crypto_launch&utm_content=video_ad
```

### **2. Telegram Channel:**
```
https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=telegram&utm_medium=social&utm_campaign=community_growth&utm_content=channel_post
```

### **3. TikTok Ads:**
```
https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=tiktok&utm_medium=cpc&utm_campaign=defi_promo&utm_content=crypto_video
```

### **4. Website/Blog:**
```
https://play.google.com/store/apps/details?id=com.finan.cryptowallet&utm_source=website&utm_medium=banner&utm_campaign=homepage_cta&utm_content=header_button
```

---

## 📱 **CÁCH SỬ DỤNG TRONG CODE:**

### **Track Events Quan Trọng:**

```typescript
import { UTMEventTracker } from '../core/services/utm_event_tracker';

// 💰 Khi user nạp tiền lần đầu
await UTMEventTracker.trackFirstDeposit(100, 'USDT');

// 🔄 Khi user swap token
await UTMEventTracker.trackTokenSwap('USDT', 'BNB', 100, 0.25);

// 👛 Khi user tạo wallet
await UTMEventTracker.trackWalletCreated('new');

// 📱 Khi user mở app
await UTMEventTracker.trackAppOpen();
```

### **Track Custom Events:**
```typescript
import { UTMTrackingService } from '../core/services/utm_tracking_service';

// Track bất kỳ event nào với UTM context
await UTMTrackingService.trackEventWithUTM('custom_event', {
  custom_param: 'value',
  amount: 50
});
```

---

## 📊 **XEM DỮ LIỆU Ở ĐÂU:**

### **1. 🔥 Firebase Analytics Console:**
- URL: https://console.firebase.google.com
- Real-time events và user behavior
- Custom events với UTM parameters
- User demographics và retention

### **2. 📱 App Store Connect (iOS):**
- URL: https://appstoreconnect.apple.com
- App downloads và campaign attribution
- Search terms và conversion rates

### **3. 🤖 Google Play Console (Android):**
- URL: https://play.google.com/console
- Install analytics và UTM tracking
- Store listing performance

---

## 🎯 **CÁC EVENTS ĐƯỢC TRACK TỰ ĐỘNG:**

### **Install Events:**
- `app_install_with_utm` - Khi user install app lần đầu
- `deep_link_click` - Khi user click deep link

### **User Behavior Events:**
- `app_open` - Mỗi lần mở app
- `wallet_created` - Tạo wallet mới
- `first_deposit` - Nạp tiền lần đầu
- `token_swap` - Swap token
- `high_value_action` - Actions > $100
- `retention_day_X` - Retention milestones

---

## 📈 **VÍ DỤ REPORTS SẼ THẤY:**

### **Firebase Analytics Dashboard:**
```
📊 EVENTS (Last 7 days):
• app_install_with_utm: 1,250 events
  - utm_source: facebook (450), telegram (380), organic (420)
  - utm_medium: cpc (450), social (380), app_store_search (420)

• first_deposit: 125 events  
  - Average value: $75.50
  - Top source: facebook (45%), telegram (35%)

• token_swap: 890 events
  - Top pairs: USDT→BNB (340), USDT→ETH (280)
```

### **Attribution Summary:**
```
📊 CAMPAIGN PERFORMANCE:
┌─────────────────┬─────────┬─────────┬─────────┐
│ Source          │ Installs│ Deposits│ Revenue │
├─────────────────┼─────────┼─────────┼─────────┤
│ Facebook CPC    │ 450     │ 45      │ $3,375  │
│ Telegram Social │ 380     │ 38      │ $2,850  │
│ TikTok CPC      │ 280     │ 22      │ $1,650  │
│ Organic         │ 420     │ 20      │ $1,500  │
└─────────────────┴─────────┴─────────┴─────────┘
```

---

## 🔧 **DEBUG & TESTING:**

### **Xem Attribution Data:**
```typescript
// Trong console hoặc debug
const summary = await UTMTrackingService.getAttributionSummary();
console.log(summary);

// Output:
// 📊 ATTRIBUTION SUMMARY:
// • Source: facebook
// • Medium: cpc
// • Campaign: crypto_launch
// • Install Date: 2024-01-15
// • Platform: android
// • Days Since Install: 5
```

### **Test UTM Links:**
1. Tạo test link với UTM parameters
2. Click link → install app
3. Mở app → check console logs
4. Verify data trong Firebase Analytics

---

## 🎯 **NEXT STEPS:**

1. **✅ HOÀN THÀNH:** UTM tracking cơ bản
2. **🔄 TIẾP THEO:** Tích hợp vào các screens quan trọng
3. **📊 SAU ĐÓ:** Setup conversion tracking cho Facebook/TikTok ads
4. **🚀 CUỐI CÙNG:** Optimize campaigns dựa trên data

---

## 💡 **TIPS:**

- **Consistent naming:** Dùng naming convention nhất quán cho UTM parameters
- **Track key events:** Focus vào events quan trọng (install, deposit, swap)
- **Monitor daily:** Check Firebase Analytics hàng ngày để optimize
- **A/B test:** Test different UTM campaigns để tìm hiệu quả nhất

**🎉 UTM Tracking đã sẵn sàng! Bắt đầu tạo campaigns và track performance ngay!**
