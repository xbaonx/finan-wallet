import { finanBackendService } from './data/services/finan_backend_service';

/**
 * Test tích hợp Finan Backend
 * Chạy function này để kiểm tra kết nối và chức năng của backend APIs
 */
export async function testBackendIntegration() {
  console.log('🧪 Bắt đầu kiểm thử tích hợp Finan Backend...');
  
  try {
    // Test 1: Kiểm tra kết nối backend
    console.log('\n📡 Test 1: Kiểm tra kết nối backend...');
    const healthCheck = await finanBackendService.checkBackendHealth();
    console.log('✅ Kết nối backend:', healthCheck ? 'Thành công' : 'Thất bại');
    
    // Test 2: Lấy cấu hình swap
    console.log('\n📊 Test 2: Lấy cấu hình swap...');
    const swapConfig = await finanBackendService.getSwapConfig();
    console.log('✅ Cấu hình swap:', {
      platformFeePercentage: swapConfig.platformFeePercentage,
      supportedTokens: swapConfig.supportedTokens.length,
      minSwapAmount: swapConfig.minSwapAmount,
      maxSwapAmount: swapConfig.maxSwapAmount
    });
    
    // Test 3: Lấy tỷ giá
    console.log('\n💱 Test 3: Lấy tỷ giá USD/VND...');
    const exchangeRates = await finanBackendService.getExchangeRates();
    console.log('✅ Tỷ giá:', {
      usdToVnd: exchangeRates.usdToVnd,
      lastUpdated: exchangeRates.lastUpdated
    });
    
    // Test 4: Tính phí swap
    console.log('\n🧮 Test 4: Tính phí swap...');
    const swapFee = await finanBackendService.calculateSwapFee({
      fromToken: 'USDT',
      toToken: 'BNB',
      amount: '100',
      fromAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    });
    console.log('✅ Phí swap:', {
      platformFee: swapFee.platformFee,
      platformFeePercentage: swapFee.platformFeePercentage,
      estimatedOutput: swapFee.estimatedOutput,
      totalFee: swapFee.totalFee
    });
    
    // Test 5: Tạo đơn hàng nạp tiền thử nghiệm
    console.log('\n💰 Test 5: Tạo đơn hàng nạp tiền thử nghiệm...');
    const testDepositOrder = await finanBackendService.createDepositOrder({
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      usdtAmount: 100,
      vndAmount: 2400000,
      bankInfo: {
        bankName: 'Vietcombank',
        accountNumber: '1234567890',
        accountName: 'NGUYEN VAN TEST'
      },
      transactionInfo: 'Test deposit từ mobile app integration'
    });
    console.log('✅ Đơn hàng nạp tiền thử nghiệm:', {
      id: testDepositOrder.id,
      type: testDepositOrder.type,
      status: testDepositOrder.status,
      usdtAmount: testDepositOrder.usdtAmount,
      vndAmount: testDepositOrder.vndAmount
    });
    
    // Test 6: Lấy danh sách đơn hàng
    console.log('\n📋 Test 6: Lấy danh sách đơn hàng...');
    const orders = await finanBackendService.getOrders('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    console.log('✅ Danh sách đơn hàng:', {
      totalOrders: orders.length,
      depositOrders: orders.filter(o => o.type === 'deposit').length,
      withdrawOrders: orders.filter(o => o.type === 'withdraw').length,
      latestOrder: orders.length > 0 ? {
        id: orders[0].id,
        type: orders[0].type,
        status: orders[0].status,
        createdAt: orders[0].createdAt
      } : null
    });
    
    // Test 7: Lấy tokens được hỗ trợ
    console.log('\n🪙 Test 7: Lấy tokens được hỗ trợ...');
    const supportedTokens = await finanBackendService.getSupportedTokens();
    console.log('✅ Tokens được hỗ trợ:', supportedTokens);
    
    console.log('\n🎉 Tất cả test tích hợp backend đã hoàn thành thành công!');
    
    return { 
      success: true, 
      results: {
        healthCheck,
        swapConfig,
        exchangeRates,
        swapFee,
        testDepositOrder,
        ordersCount: orders.length,
        supportedTokens
      }
    };
    
  } catch (error) {
    console.error('\n❌ Test tích hợp backend thất bại:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test nhanh chỉ kiểm tra kết nối cơ bản
 */
export async function quickBackendTest() {
  console.log('⚡ Test nhanh kết nối backend...');
  
  try {
    const healthCheck = await finanBackendService.checkBackendHealth();
    const swapConfig = await finanBackendService.getSwapConfig();
    const exchangeRates = await finanBackendService.getExchangeRates();
    
    console.log('✅ Test nhanh thành công:', {
      backend: healthCheck ? 'Online' : 'Offline',
      platformFee: `${swapConfig.platformFeePercentage}%`,
      exchangeRate: `1 USD = ${exchangeRates.usdToVnd} VND`
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Test nhanh thất bại:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test chỉ phí nền tảng để debug
 */
export async function testPlatformFee() {
  console.log('🔍 Test phí nền tảng từ backend...');
  
  try {
    // Test raw API call
    console.log('📡 Raw API call...');
    const response = await fetch('https://finan-backend-vn.onrender.com/api/v1/swap/config');
    const rawData = await response.json();
    console.log('🔍 Raw API response:', rawData);
    
    // Test through service
    console.log('🛠️ Through service...');
    const config = await finanBackendService.getSwapConfig();
    console.log('🔍 Service response:', config);
    
    // Calculate display values
    const rawFee = rawData.config?.platformFeePercentage || 0;
    const feeDecimal = rawFee / 100;
    const displayPercentage = rawFee;
    
    console.log('📊 Fee calculations:');
    console.log(`   - Raw từ API: ${rawFee}`);
    console.log(`   - Decimal để tính toán: ${feeDecimal}`);
    console.log(`   - Hiển thị UI: ${displayPercentage}%`);
    
    return { 
      success: true, 
      rawFee, 
      feeDecimal, 
      displayPercentage,
      rawApiData: rawData,
      serviceData: config
    };
  } catch (error) {
    console.error('❌ Test phí nền tảng thất bại:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Export để có thể gọi từ console hoặc debug
if (typeof global !== 'undefined') {
  (global as any).testBackendIntegration = testBackendIntegration;
  (global as any).quickBackendTest = quickBackendTest;
}
