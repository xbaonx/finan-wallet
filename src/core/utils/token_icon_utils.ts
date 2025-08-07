// Token icon mapping for popular tokens
const TOKEN_ICONS: { [symbol: string]: string } = {
  ETH: '⟠',
  BTC: '₿',
  USDT: '₮',
  USDC: '◉',
  DAI: '◈',
  WETH: '⟠',
  UNI: '🦄',
  LINK: '🔗',
  AAVE: '👻',
  COMP: '🏛️',
  MKR: '🏭',
  SNX: '⚡',
  YFI: '💰',
  SUSHI: '🍣',
  CRV: '〰️',
  BAL: '⚖️',
  MATIC: '🟣',
  BNB: '🟨',
  ADA: '🔷',
  DOT: '⚫',
  AVAX: '🔺',
  SOL: '☀️',
  LUNA: '🌙',
  ATOM: '⚛️',
  FTT: '📊',
  NEAR: '🔮',
  ALGO: '🔺',
  VET: '✅',
  ICP: '∞',
  THETA: 'Θ',
  FIL: '📁',
  TRX: '🔴',
  EOS: '⬛',
  XTZ: '🔹',
  EGLD: '⚡',
  HBAR: '♦️',
  FLOW: '🌊',
  MANA: '🏠',
  SAND: '🏖️',
  AXS: '🎮',
  CHZ: '🌶️',
  ENJ: '🎮',
  BAT: '🦇',
  ZRX: '0️⃣',
  OMG: '😱',
  LRC: '⭕',
  GRT: '📊',
  SHIB: '🐕',
  DOGE: '🐶',
};

// Color mapping for token backgrounds
const TOKEN_COLORS: { [symbol: string]: string } = {
  ETH: '#627EEA',
  BTC: '#F7931A',
  USDT: '#26A17B',
  USDC: '#2775CA',
  DAI: '#F5AC37',
  WETH: '#627EEA',
  UNI: '#FF007A',
  LINK: '#375BD2',
  AAVE: '#B6509E',
  COMP: '#00D395',
  MKR: '#1AAB9B',
  SNX: '#5FCDF9',
  YFI: '#0074D9',
  SUSHI: '#FA52A0',
  CRV: '#40E0D0',
  BAL: '#1E1E1E',
  MATIC: '#8247E5',
  BNB: '#F3BA2F',
  ADA: '#0033AD',
  DOT: '#E6007A',
  AVAX: '#E84142',
  SOL: '#9945FF',
  LUNA: '#FFD83D',
  ATOM: '#2E3148',
  FTT: '#5FCDF9',
  NEAR: '#00C08B',
  ALGO: '#000000',
  VET: '#15BDFF',
  ICP: '#29ABE2',
  THETA: '#2AB8E6',
  FIL: '#0090FF',
  TRX: '#FF060A',
  EOS: '#443F54',
  XTZ: '#2C7DF7',
  EGLD: '#1B46C2',
  HBAR: '#000000',
  FLOW: '#00EF8B',
  MANA: '#FF2D55',
  SAND: '#00AEFF',
  AXS: '#0055D4',
  CHZ: '#CD212A',
  ENJ: '#624DBF',
  BAT: '#FF5000',
  ZRX: '#000000',
  OMG: '#1A53F0',
  LRC: '#1C60FF',
  GRT: '#6F4CFF',
  SHIB: '#FFA409',
  DOGE: '#C2A633',
};

export interface TokenIconInfo {
  icon: string;
  backgroundColor: string;
  textColor: string;
}

export const getTokenIcon = (symbol: string): TokenIconInfo => {
  const upperSymbol = symbol.toUpperCase();
  
  // Get icon, fallback to first letter if not found
  const icon = TOKEN_ICONS[upperSymbol] || upperSymbol.charAt(0);
  
  // Get background color, fallback to default
  const backgroundColor = TOKEN_COLORS[upperSymbol] || '#6B7280';
  
  // Determine text color based on background brightness
  const textColor = isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
  
  return {
    icon,
    backgroundColor,
    textColor,
  };
};

// Helper function to determine if a color is light or dark
const isLightColor = (hexColor: string): boolean => {
  // Remove # if present
  const color = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate brightness using YIQ formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128;
};

// Get token logo URI from 1inch API
export function getTokenLogoUri(tokenAddress: string, symbol: string): string | undefined {
  try {
    // Nếu có địa chỉ hợp lệ, sử dụng 1inch API
    if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
      return `https://tokens.1inch.io/${tokenAddress.toLowerCase()}.png`;
    }
    
    // Đối với một số token phổ biến không có địa chỉ
    if (symbol === 'ETH') {
      return 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png';
    } else if (symbol === 'BNB') {
      return 'https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png';
    }
  } catch (error) {
    console.warn('Error getting token logo URI:', error);
  }
  
  return undefined;
};

// Mapping of token symbols to CoinGecko IDs (partial list)
const getCoingeckoId = (symbol: string): string => {
  const mapping: { [symbol: string]: string } = {
    ETH: 'ethereum',
    BTC: 'bitcoin',
    USDT: 'tether',
    USDC: 'usd-coin',
    DAI: 'dai',
    UNI: 'uniswap',
    LINK: 'chainlink',
    AAVE: 'aave',
    COMP: 'compound-governance-token',
    MKR: 'maker',
    SNX: 'havven',
    YFI: 'yearn-finance',
    SUSHI: 'sushi',
    CRV: 'curve-dao-token',
    BAL: 'balancer',
    MATIC: 'matic-network',
    SHIB: 'shiba-inu',
    DOGE: 'dogecoin',
  };
  
  return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
};
