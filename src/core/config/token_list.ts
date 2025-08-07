import { TokenInfo } from '../../domain/entities/swap_entity';

/**
 * Danh sách token phổ biến với thông tin đầy đủ bao gồm logo
 * Được sử dụng bởi cả Dashboard và Swap để đảm bảo đồng nhất
 */
export const POPULAR_TOKENS: TokenInfo[] = [
  { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18, logoURI: 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png' },
  { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18, logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png' },
  { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png' },
  { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18, logoURI: 'https://tokens.1inch.io/0x4fabb145d64652a948d72533023f6e7a623c7c53.png' },
  { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', name: 'Bitcoin BEP2', decimals: 18, logoURI: 'https://tokens.1inch.io/0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c.png' },
  { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', name: 'Ethereum Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x2170ed0880ac9a755fd29b2688956bd959f933f8.png' },
  { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82.png' },
  { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP', name: 'XRP Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe.png' },
  { address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', symbol: 'ADA', name: 'Cardano Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x3ee2200efb3400fabb9aacf31297cbdd1d435d47.png' },
  { address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', symbol: 'LINK', name: 'Chainlink Token', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png' },
  { address: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', symbol: 'LTC', name: 'Litecoin Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x4338665cbb7b2485a8855a139b75d5e34ab0db94.png' },
  { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png' },
  { address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', symbol: 'DOT', name: 'Polkadot Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x7083609fce4d1d8dc0c979aab8c869ea2c873402.png' },
  { address: '0x1Ce0c2827e2eF14D5C4f29a091d735A204794041', symbol: 'AVAX', name: 'Avalanche Token', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/12559/thumb/coin-round-red.png' },
  { address: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', symbol: 'SOL', name: 'Solana Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0x570a5d26f7765ecb712c0924e4de545b89fd43df.png' },
  { address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', symbol: 'DOGE', name: 'Dogecoin Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0xba2ae424d960c26247dd6c32edc70b295c744c43.png' },
  { address: '0x0000000000000000000000000000000000000000', symbol: 'BNB', name: 'Binance Coin', decimals: 18, logoURI: 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png' }, // BNB native token uses WBNB logo
  { address: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD', symbol: 'MATIC', name: 'Polygon Token', decimals: 18, logoURI: 'https://tokens.1inch.io/0xcc42724c6683b7e57334c4e856f4c9965ed682bd.png' },
  { address: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1', symbol: 'UNI', name: 'Uniswap Token', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png' },
  { address: '0xfb6115445Bff7b52FeB98650C87f44907E58f802', symbol: 'AAVE', name: 'Aave Token', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png' },
];

/**
 * Lấy địa chỉ token từ danh sách POPULAR_TOKENS
 */
export function getPopularTokenAddresses(): string[] {
  return POPULAR_TOKENS.map(token => token.address);
}

/**
 * Tìm token info dựa trên địa chỉ
 */
export function findTokenByAddress(address: string): TokenInfo | undefined {
  return POPULAR_TOKENS.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Lấy logo URI cho token dựa trên địa chỉ
 * Trả về logo URI hoặc undefined nếu không tìm thấy
 */
export function getTokenLogoUri(address: string): string | undefined {
  const token = findTokenByAddress(address);
  return token?.logoURI;
}
