import { TokenEntity, WalletBalance } from '../../domain/entities/token_entity';
import { API_CONFIG, COMMON_TOKENS } from '../../core/config/api_config';
import { 
  MoralisNativeBalanceResponse, 
  MoralisTokenBalanceResponse, 
  MoralisPriceResponse 
} from '../types/moralis_types';

const MORALIS_API_KEY = API_CONFIG.MORALIS.API_KEY;
const MORALIS_BASE_URL = API_CONFIG.MORALIS.BASE_URL;

export class MoralisApiService {
  private readonly apiKey = MORALIS_API_KEY;
  private readonly baseUrl = MORALIS_BASE_URL;

  /**
   * Get ETH balance for a wallet address
   */
  async getETHBalance(walletAddress: string): Promise<{ balance: string; priceUSD: number }> {
    try {
      console.log(`Fetching ETH balance for: ${walletAddress}`);
      console.log(`API Key: ${this.apiKey.substring(0, 20)}...`);
      console.log(`Base URL: ${this.baseUrl}`);
      
      const nativeBalanceResponse = await fetch(
        `${this.baseUrl}/${walletAddress}/balance?chain=eth`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`Response status: ${nativeBalanceResponse.status}`);
      console.log(`Response statusText: ${nativeBalanceResponse.statusText}`);

      if (!nativeBalanceResponse.ok) {
        console.error(`Failed to fetch native balance: ${nativeBalanceResponse.statusText}`);
        throw new Error(`Failed to fetch native balance: ${nativeBalanceResponse.statusText}`);
      }

      const nativeBalanceData = await nativeBalanceResponse.json();
      console.log('Native balance data:', nativeBalanceData);

      // Get ETH price (using WETH as proxy)
      const ethPriceResponse = await fetch(
        `${this.baseUrl}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=eth`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      let ethPrice = 2500; // Fallback price
      if (ethPriceResponse.ok) {
        const ethPriceData: MoralisPriceResponse = await ethPriceResponse.json();
        ethPrice = ethPriceData.usdPrice || 2500;
        console.log('ETH price:', ethPrice);
      }

      // Process and format data
      const ethBalance = (parseFloat(nativeBalanceData.balance) / Math.pow(10, 18));
      if (ethBalance > 0.001) { // Only show if balance > 0.001 ETH
        return {
          balance: ethBalance.toFixed(6),
          priceUSD: ethPrice
        };
      } else {
        return {
          balance: '0',
          priceUSD: ethPrice
        };
      }
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      throw new Error('Không thể lấy số dư ETH');
    }
  }

  /**
   * Get ERC-20 token balances for a wallet address
   */
  async getWalletBalance(address: string): Promise<WalletBalance> {
    try {
      console.log(`Fetching wallet balance for address: ${address}`);
      console.log(`API Key: ${MORALIS_API_KEY.substring(0, 20)}...`);
      console.log(`Base URL: ${MORALIS_BASE_URL}`);
      
      const url = `${MORALIS_BASE_URL}/${address}/balance?chain=eth`;
      console.log(`Full URL: ${url}`);

      // Get native ETH balance
      const nativeBalanceResponse = await fetch(url, {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Response status: ${nativeBalanceResponse.status}`);
      console.log(`Response statusText: ${nativeBalanceResponse.statusText}`);

      if (!nativeBalanceResponse.ok) {
        const errorText = await nativeBalanceResponse.text();
        console.error(`Failed to fetch native balance:`);
        console.error(`Status: ${nativeBalanceResponse.status}`);
        console.error(`StatusText: ${nativeBalanceResponse.statusText}`);
        console.error(`Error body: ${errorText}`);
        throw new Error(`Failed to fetch native balance: ${nativeBalanceResponse.status} ${nativeBalanceResponse.statusText} - ${errorText}`);
      }

      const nativeBalanceData = await nativeBalanceResponse.json();
      console.log('Native balance data:', nativeBalanceData);

      // Get ERC-20 token balances
      const tokenBalancesResponse = await fetch(
        `${MORALIS_BASE_URL}/${address}/erc20?chain=eth`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!tokenBalancesResponse.ok) {
        console.error(`Failed to fetch token balances: ${tokenBalancesResponse.statusText}`);
        throw new Error(`Failed to fetch token balances: ${tokenBalancesResponse.statusText}`);
      }

      const tokenBalancesData = await tokenBalancesResponse.json() as MoralisTokenBalanceResponse;
      console.log('Token balances data:', tokenBalancesData);

      // Get ETH price (using WETH as proxy)
      const ethPriceResponse = await fetch(
        `${MORALIS_BASE_URL}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=eth`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      let ethPrice = 2500; // Fallback price
      if (ethPriceResponse.ok) {
        const ethPriceData = await ethPriceResponse.json() as MoralisPriceResponse;
        ethPrice = ethPriceData.usdPrice || 2500;
        console.log('ETH price:', ethPrice);
      }

      // Process and format data
      const tokens: TokenEntity[] = [];

      // Add ETH if balance > 0
      if (nativeBalanceData.balance && parseFloat(nativeBalanceData.balance) > 0) {
        const ethBalance = (parseFloat(nativeBalanceData.balance) / Math.pow(10, 18));
        if (ethBalance > 0.001) { // Only show if balance > 0.001 ETH
          tokens.push({
            name: 'Ethereum',
            symbol: 'ETH',
            address: '0x0000000000000000000000000000000000000000',
            logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
            balance: ethBalance.toFixed(6),
            priceUSD: ethPrice,
            chainId: '0x1'
          });
        }
      }

      // Add ERC-20 tokens with significant balances
      if (tokenBalancesData.result && Array.isArray(tokenBalancesData.result)) {
        for (const token of tokenBalancesData.result) {
          if (parseFloat(token.balance) > 0) {
            const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);

            // Only include tokens with meaningful balance (> $1 equivalent or common tokens)
            const isCommonToken = COMMON_TOKENS.some(ct => 
              ct.address.toLowerCase() === token.token_address.toLowerCase()
            );

            if (balance > 0.001 || isCommonToken) {
              // Try to get token price
              let tokenPrice = 0;
              try {
                const priceResponse = await fetch(
                  `${MORALIS_BASE_URL}/erc20/${token.token_address}/price?chain=eth`,
                  {
                    headers: {
                      'X-API-Key': MORALIS_API_KEY,
                      'Content-Type': 'application/json'
                    }
                  }
                );

                if (priceResponse.ok) {
                  const priceData = await priceResponse.json() as MoralisPriceResponse;
                  tokenPrice = priceData.usdPrice || 0;
                }
              } catch (error) {
                console.warn(`Failed to fetch price for ${token.symbol}:`, error);
              }

              // Find logo from common tokens or use default
              const commonToken = COMMON_TOKENS.find(ct => 
                ct.address.toLowerCase() === token.token_address.toLowerCase()
              );

              tokens.push({
                name: token.name || token.symbol,
                symbol: token.symbol,
                address: token.token_address,
                logoUri: commonToken?.logoUri || token.logo || 'https://via.placeholder.com/32',
                balance: balance.toFixed(6),
                priceUSD: tokenPrice,
                chainId: '0x1'
              });
            }
          }
        }
      }

      // Calculate total balance
      const totalBalance = tokens.reduce((sum, token) => {
        return sum + (parseFloat(token.balance) * token.priceUSD);
      }, 0);

      // Sort tokens by USD value (descending)
      const sortedTokens = tokens.sort((a, b) => 
        (parseFloat(b.balance) * b.priceUSD) - (parseFloat(a.balance) * a.priceUSD)
      );

      console.log(`Total balance: $${totalBalance.toFixed(2)}, Tokens: ${sortedTokens.length}`);

      return {
        address,
        totalBalanceUSD: totalBalance,
        tokens: sortedTokens
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);

      // Return fallback data on error
      return {
        address,
        totalBalanceUSD: 0,
        tokens: []
      };
    }
  }

  /**
   * Get token prices in USD
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }> {
    try {
      const prices: { [address: string]: number } = {};

      for (const address of tokenAddresses) {
        const priceResponse = await fetch(
          `${MORALIS_BASE_URL}/erc20/${address}/price?chain=eth`,
          {
            headers: {
              'X-API-Key': MORALIS_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );

        if (priceResponse.ok) {
          const priceData: MoralisPriceResponse = await priceResponse.json();
          prices[address] = priceData.usdPrice || 0;
        } else {
          prices[address] = 0;
        }
      }

      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw new Error('Không thể lấy giá token');
    }
  }

  /**
   * Get current ETH price in USD
   */
  async getETHPrice(): Promise<number> {
    try {
      const ethPriceResponse = await fetch(
        `${MORALIS_BASE_URL}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price?chain=eth`,
        {
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (ethPriceResponse.ok) {
        const ethPriceData: MoralisPriceResponse = await ethPriceResponse.json();
        return ethPriceData.usdPrice || 2500;
      } else {
        return 2500;
      }
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      throw new Error('Không thể lấy giá ETH');
    }
  }
}
