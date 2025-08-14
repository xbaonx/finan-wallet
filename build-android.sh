#!/bin/bash

# Đảm bảo đường dẫn Node.js được thêm vào PATH
export PATH="/usr/local/bin:$PATH"

# Di chuyển đến thư mục android
cd android

# Hiển thị đường dẫn Node.js để kiểm tra
echo "Node.js path: $(which node)"
echo "Node.js version: $(node -v)"

# Chạy lệnh build
./gradlew assembleRelease

# Hiển thị đường dẫn đến APK sau khi build
echo "APK được tạo tại: $(pwd)/app/build/outputs/apk/release/app-release.apk"
