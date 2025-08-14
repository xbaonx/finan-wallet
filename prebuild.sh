#!/bin/bash

# Xóa thư mục android và ios cũ nếu có
rm -rf android
rm -rf ios

# Đặt biến môi trường để đảm bảo Node.js được tìm thấy
export PATH="/usr/local/bin:$PATH"

# Chạy lệnh prebuild với đường dẫn Node.js rõ ràng
/usr/local/bin/node /usr/local/bin/npx expo prebuild

echo "Prebuild hoàn tất. Kiểm tra thư mục android và ios."
