# Finan - Ví Tiền Mã Hóa

Ứng dụng ví tiền mã hóa an toàn dành cho người dùng Việt Nam, được xây dựng bằng React Native với Expo SDK.

## 🚀 Tính năng hiện tại

### Phần 1: Tạo và Khôi phục Ví
- ✅ Màn hình chào mừng với lựa chọn tạo ví mới hoặc khôi phục ví
- ✅ Tạo ví mới với cụm từ khôi phục BIP39 (12 từ)
- ✅ Khôi phục ví từ cụm từ khôi phục
- ✅ Lưu trữ an toàn private key bằng Expo SecureStore
- ✅ Kiểm tra ví tồn tại khi khởi động ứng dụng

## 🏗️ Kiến trúc

Ứng dụng được xây dựng theo Clean Architecture:

### Domain Layer
- **Entities**: `WalletEntity`, `WalletCredentials`
- **Use Cases**: `CreateWalletUseCase`, `ImportWalletUseCase`, `CheckWalletExistsUseCase`
- **Repository Interface**: `WalletRepository`

### Data Layer
- **Services**: `CryptoService`, `SecureStorageService`
- **Repository Implementation**: `WalletRepositoryImpl`

### Presentation Layer
- **BLoC Pattern**: `WalletOnboardingBloc` với Events và States
- **Screens**: `WelcomeScreen`, `CreateWalletScreen`, `ImportWalletScreen`
- **Navigation**: React Navigation với Stack Navigator

## 🛠️ Công nghệ sử dụng

- **React Native** với **Expo SDK 51**
- **TypeScript** cho type safety
- **React Navigation** cho điều hướng
- **Expo SecureStore** cho lưu trữ an toàn
- **BIP39** cho sinh cụm từ khôi phục
- **Ethers.js** cho tạo ví Ethereum
- **GetIt** cho Dependency Injection
- **NativeWind** cho styling (Tailwind CSS)

## 📱 Cách chạy ứng dụng

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Khởi động Expo:**
   ```bash
   npm start
   ```

3. **Chạy trên thiết bị:**
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Web: `npm run web`

## 🔒 Bảo mật

- Private key được mã hóa và lưu trữ trong Expo SecureStore
- Cụm từ khôi phục được tạo theo chuẩn BIP39
- Ví được tạo theo đường dẫn HD Wallet chuẩn (m/44'/60'/0'/0/0)
- Không lưu trữ thông tin nhạy cảm trong AsyncStorage thông thường

## 📁 Cấu trúc thư mục

```
src/
├── core/
│   └── di/                 # Dependency Injection
├── data/
│   ├── repositories/       # Repository implementations
│   └── services/          # Data services
├── domain/
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   └── usecases/         # Business logic
└── presentation/
    ├── blocs/            # BLoC pattern implementation
    ├── navigation/       # App navigation
    └── screens/          # UI screens
```

## 🎯 Roadmap

### Phần 2: Dashboard và Quản lý Tài sản (Sắp tới)
- [ ] Dashboard hiển thị số dư
- [ ] Danh sách token/coin
- [ ] Lịch sử giao dịch
- [ ] Gửi và nhận token

### Phần 3: Tính năng Nâng cao (Tương lai)
- [ ] Swap token
- [ ] Bảo mật sinh trắc học
- [ ] Backup đám mây
- [ ] Multi-wallet support
- [ ] DeFi integration

## 🌐 Ngôn ngữ

- Tiếng Việt (mặc định)
- Hỗ trợ đa ngôn ngữ sẽ được thêm trong tương lai

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 👥 Đóng góp

Dự án này đang trong giai đoạn phát triển. Mọi đóng góp và phản hồi đều được hoan nghênh!
