#!/bin/bash

# Tạo thư mục keystore nếu chưa tồn tại
mkdir -p android/app/keystore

# Tạo keystore mới
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/app/keystore/finan-wallet.keystore \
  -alias finan-wallet \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Finan Wallet, OU=Mobile, O=Finan, L=Unknown, S=Unknown, C=VN"

echo "Keystore đã được tạo tại android/app/keystore/finan-wallet.keystore"
echo "Lưu ý: Hãy nhớ mật khẩu keystore và alias của bạn!"
