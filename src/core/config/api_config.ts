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

  // Supported chains
  CHAINS: {
    ETHEREUM: {
      CHAIN_ID: '0x1',
      NAME: 'Ethereum',
      NATIVE_CURRENCY: {
        NAME: 'Ethereum',
        SYMBOL: 'ETH',
        DECIMALS: 18
      }
    }
  }
};

// Common ERC-20 tokens to track
export const COMMON_TOKENS = [
  {
    address: '0xA0b86a33E6441b8C0b8d8C5C5c5c5c5c5c5c5c5c', // USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    symbol: 'USDT', 
    name: 'Tether USD',
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  }
];
