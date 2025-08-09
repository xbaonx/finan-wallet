/**
 * API Configuration
 * Contains API keys and endpoints for external services
 */

export const API_CONFIG = {
  // Moralis API Configuration
  MORALIS: {
    API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjQ0Y2U2N2UxLThlZDctNDI2Yi05YTgwLTVjNWRlMTZjMzgyYSIsIm9yZ0lkIjoiNDYxMzMyIiwidXNlcklkIjoiNDc0NjI0IiwidHlwZUlkIjoiNjdhMWM2ZjUtN2I4ZS00MjlhLWEwOWItYWM2ZmUyN2JjMjIwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTM0Mzc4NTUsImV4cCI6NDkwOTE5Nzg1NX0.6gmlx4A5XkGNAFLGKHiTdPGrFar0Q8cRfFYlWbgcV0U',
    BASE_URL: 'https://deep-index.moralis.io/api/v2.2',
    ENDPOINTS: {
      NATIVE_BALANCE: '/wallets/{address}/balance',
      TOKEN_BALANCES: '/{address}/bep20?chain=bsc',
      TOKEN_PRICES: '/erc20/{addresses}/prices?chain=bsc',
      BNB_PRICE: '/erc20/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/price?chain=bsc', // WBNB as BNB price proxy
    }
  },
  
  // 1inch API Configuration
  ONEINCH: {
    API_KEY: 'lfkI2Bca3G4qdGpiFx62yuoDS2hXetVu',
    BASE_URL: 'https://api.1inch.dev',
    CHAIN_ID: 56, // BSC mainnet
    ENDPOINTS: {
      TOKENS: '/swap/v6.0/{chainId}/tokens',
      QUOTE: '/swap/v6.0/{chainId}/quote',
      SWAP: '/swap/v6.0/{chainId}/swap',
      APPROVE: '/swap/v6.0/{chainId}/approve/transaction'
    },
    // Referrer Fee Configuration
    REFERRER: {
      ADDRESS: '0x62EC88A97156233cdB416024AC5011C5B9A6f361', // Binance BSC wallet để nhận fee
      FEE_PERCENTAGE: 0.7, // 0.7% fee (trong range 0-3% của 1inch)
    }
  },

  // Binance API Configuration (for price data)
  BINANCE: {
    BASE_URL: 'https://api.binance.com/api/v3',
    ENDPOINTS: {
      PRICE: '/ticker/price',
      PRICE_24HR: '/ticker/24hr',
      PRICES_BATCH: '/ticker/price'
    }
  },

  // Supported chains
  CHAINS: {
    BSC: {
      CHAIN_ID: '0x38', // BSC mainnet
      NAME: 'Binance Smart Chain',
      RPC_URL: 'https://bsc-dataseed.binance.org/',
      NATIVE_CURRENCY: {
        NAME: 'BNB',
        SYMBOL: 'BNB',
        DECIMALS: 18
      }
    }
  }
};

// Common BEP-20 tokens to track on BSC
export const COMMON_TOKENS = [
  {
    address: '0x55d398326f99059fF775485246999027B3197955', // USDT BSC
    symbol: 'USDT', 
    name: 'Tether USD',
    decimals: 18,
    logoUri: 'https://tokens.1inch.io/0x55d398326f99059ff775485246999027b3197955.png' // USDT BSC
  },
  {
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC BSC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    logoUri: 'https://tokens.1inch.io/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.png' // USDC BSC
  },
  {
    address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', // DAI BSC
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoUri: 'https://tokens.1inch.io/0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3.png' // DAI BSC
  },
  {
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    decimals: 18,
    logoUri: 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png' // BNB BSC
  },
  {
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    symbol: 'BUSD',
    name: 'Binance USD',
    decimals: 18,
    logoUri: 'https://tokens.1inch.io/0xe9e7cea3dedca5984780bafc599bd69add087d56.png' // BUSD BSC
  }
];
