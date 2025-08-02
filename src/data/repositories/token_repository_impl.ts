import { TokenEntity, WalletBalance } from '../../domain/entities/token_entity';
import { TokenRepository } from '../../domain/repositories/token_repository';
import { MoralisApiService } from '../services/moralis_api_service';

export class TokenRepositoryImpl implements TokenRepository {
  constructor(private moralisApiService: MoralisApiService) {}

  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      // Use the new unified API call that gets all data at once
      const walletData = await this.moralisApiService.getWalletBalance(walletAddress);
      
      // Return the data directly from the API service
      return walletData;
    } catch (error) {
      throw new Error(`Không thể lấy số dư ví: ${error}`);
    }
  }

  // Legacy getETHBalance method removed - now handled by getWalletBalance
  async getETHBalance(walletAddress: string): Promise<TokenEntity> {
    try {
      // Use the unified getWalletBalance method
      const walletData = await this.moralisApiService.getWalletBalance(walletAddress);
      
      // Find ETH token from the results
      const ethToken = walletData.tokens.find(token => token.symbol === 'ETH');
      
      if (ethToken) {
        return ethToken;
      } else {
        // Return empty ETH token if not found
        return {
          name: 'Ethereum',
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
          balance: '0',
          priceUSD: 0,
          chainId: '0x1'
        };
      }
    } catch (error) {
      console.error('Error in getETHBalance:', error);
      // Return empty ETH token on error
      return {
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        balance: '0',
        priceUSD: 0,
        chainId: '0x1'
      };
    }
  }

  async getERC20Tokens(walletAddress: string): Promise<TokenEntity[]> {
    try {
      // Use the new getWalletBalance method instead of getERC20Tokens
      const walletData = await this.moralisApiService.getWalletBalance(walletAddress);
      return walletData.tokens;
    } catch (error) {
      console.error('Error fetching ERC-20 tokens:', error);
      return [];
    }
  }

  async getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }> {
    try {
      return await this.moralisApiService.getTokenPrices(tokenAddresses);
    } catch (error) {
      console.error('Error fetching token prices:', error);
      // Return empty prices object if price fetching fails
      const emptyPrices: { [address: string]: number } = {};
      tokenAddresses.forEach(address => {
        emptyPrices[address] = 0;
      });
      return emptyPrices;
    }
  }

  async getETHPrice(): Promise<number> {
    try {
      return await this.moralisApiService.getETHPrice();
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      return 0;
    }
  }
}
