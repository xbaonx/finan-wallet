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
      TOKEN_BALANCES: '/{address}/erc20',
      TOKEN_PRICES: '/erc20/{addresses}/prices',
      ETH_PRICE: '/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price', // WETH as ETH price proxy
    }
  },
  
  // 1inch API Configuration
  ONEINCH: {
    API_KEY: 'lfkI2Bca3G4qdGpiFx62yuoDS2hXetVu',
    BASE_URL: 'https://api.1inch.dev',
    CHAIN_ID: 56, // BSC mainnet
    USE_FUSION: true, // Enable gasless swaps
    ENDPOINTS: {
      TOKENS: '/swap/v6.0/{chainId}/tokens',
      QUOTE: '/swap/v6.0/{chainId}/quote',
      SWAP: '/swap/v6.0/{chainId}/swap',
      APPROVE: '/swap/v6.0/{chainId}/approve/transaction',
      FUSION: '/fusion/v1.0/{chainId}'
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
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC BSC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    address: '0x55d398326f99059fF775485246999027B3197955', // USDT BSC
    symbol: 'USDT', 
    name: 'Tether USD',
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
  },
  {
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    symbol: 'BUSD',
    name: 'Binance USD',
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/binance-usd-busd-logo.png'
  }
];
