// Script để research top expensive coins từ 1inch API
const axios = require('axios');

const ONEINCH_API_KEY = 'lfkI2Bca3G4qdGpiFx62yuoDS2hXetVu';
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjMzOGY3NzY2LWM3YzQtNGVlMC1iZGJjLWNlMjQ5YzNkNDEzMCIsIm9yZ0lkIjoiNDE2NzQ2IiwidXNlcklkIjoiNDI4MzE5IiwidHlwZUlkIjoiNzJmYWM2YzMtYWE0Ni00ZGY3LWJhZDItNzJkMjc5ZjU5ZGE5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MzU4Nzg1MzksImV4cCI6NDg5MTYzODUzOX0.Ej9eFhYLJNJ4FKXwPPQqQqJGLkKkJqxhLhJJaJJJJJJJ';

async function research1inchTopCoins() {
  try {
    console.log('🔍 Fetching all tokens from 1inch API...');
    
    // Lấy tất cả tokens từ 1inch
    const response = await axios.get('https://api.1inch.dev/swap/v6.0/1/tokens', {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'accept': 'application/json'
      }
    });
    
    const tokens = Object.values(response.data.tokens);
    console.log(`📊 Found ${tokens.length} tokens from 1inch`);
    
    // Lấy sample 30 tokens đầu để test (giới hạn API calls)
    const sampleTokens = tokens.slice(0, 30);
    console.log(`🧪 Testing with first ${sampleTokens.length} tokens...`);
    
    // Prepare addresses for Moralis
    const tokenAddresses = sampleTokens.map(token => {
      // Convert ETH placeholder to WETH
      if (token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
      }
      return token.address;
    });
    
    console.log('💰 Fetching prices from Moralis...');
    
    // Fetch prices từ Moralis cho từng token (vì không có batch endpoint)
    const pricePromises = tokenAddresses.map(async (address) => {
      try {
        const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/erc20/${address}/price`, {
          params: {
            chain: 'eth'
          },
          headers: {
            'X-API-Key': MORALIS_API_KEY
          }
        });
        return {
          tokenAddress: address,
          usdPrice: response.data.usdPrice
        };
      } catch (error) {
        console.log(`Failed to get price for ${address}:`, error.response?.status);
        return {
          tokenAddress: address,
          usdPrice: 0
        };
      }
    });
    
    const priceResults = await Promise.all(pricePromises);
    console.log(`Got prices for ${priceResults.length} tokens`);
    
    // Convert to array format
    const priceResponse = { data: priceResults };
    
    // Combine token data với prices
    const tokensWithPrices = sampleTokens.map(token => {
      const priceAddress = token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
        ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' 
        : token.address;
      
      const priceData = priceResponse.data.find(p => 
        p.tokenAddress.toLowerCase() === priceAddress.toLowerCase()
      );
      
      return {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        logoURI: token.logoURI,
        decimals: token.decimals,
        priceUSD: priceData ? parseFloat(priceData.usdPrice) : 0
      };
    });
    
    // Sắp xếp theo giá từ cao đến thấp
    const sortedTokens = tokensWithPrices
      .filter(token => token.priceUSD > 0) // Chỉ lấy tokens có giá
      .sort((a, b) => b.priceUSD - a.priceUSD);
    
    console.log('\n🏆 TOP 20 MOST EXPENSIVE COINS:');
    console.log('=====================================');
    
    const top20 = sortedTokens.slice(0, 20);
    top20.forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol} (${token.name})`);
      console.log(`   Price: $${token.priceUSD.toLocaleString()}`);
      console.log(`   Address: ${token.address}`);
      console.log('');
    });
    
    // Generate hardcoded array
    console.log('\n📝 HARDCODED ARRAY FOR IMPLEMENTATION:');
    console.log('=====================================');
    console.log('const TOP_EXPENSIVE_TOKENS = [');
    top20.forEach(token => {
      console.log(`  {`);
      console.log(`    symbol: '${token.symbol}',`);
      console.log(`    name: '${token.name}',`);
      console.log(`    address: '${token.address}',`);
      console.log(`    logoURI: '${token.logoURI || ''}',`);
      console.log(`    decimals: ${token.decimals}`);
      console.log(`  },`);
    });
    console.log('];');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the research
research1inchTopCoins();
