/**
 * Debug test cho Moralis Transaction API
 */

import { API_CONFIG } from '../../core/config/api_config';

const MORALIS_API_KEY = API_CONFIG.MORALIS.API_KEY;
const MORALIS_BASE_URL = API_CONFIG.MORALIS.BASE_URL;

export async function debugMoralisTransactionAPI(walletAddress: string) {
  console.log('=== MORALIS TRANSACTION API DEBUG ===');
  console.log(`API Key: ${MORALIS_API_KEY.substring(0, 20)}...`);
  console.log(`Base URL: ${MORALIS_BASE_URL}`);
  console.log(`Wallet Address: ${walletAddress}`);
  
  // Test các endpoint khác nhau cho token transfers
  const endpoints = [
    `${MORALIS_BASE_URL}/${walletAddress}/erc20/transfers?chain=eth&limit=10`,
    `${MORALIS_BASE_URL}/wallets/${walletAddress}/erc20/transfers?chain=eth&limit=10`,
    `${MORALIS_BASE_URL}/${walletAddress}/erc20?chain=eth&limit=10`, // Token balances endpoint
  ];
  
  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    console.log(`\n--- Test ${i + 1}: ${url} ---`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`StatusText: ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Success Response:', JSON.stringify(data, null, 2));
        
        // Kiểm tra structure của response
        if (data.result) {
          console.log(`Found ${data.result.length} items in result`);
          if (data.result.length > 0) {
            console.log('First item structure:', Object.keys(data.result[0]));
          }
        }
        
        if (data.cursor) {
          console.log('Has cursor for pagination:', data.cursor);
        }
      } else {
        const errorText = await response.text();
        console.error('Error Response:', errorText);
      }
    } catch (error) {
      console.error(`Network Error for endpoint ${i + 1}:`, error);
    }
  }
  
  console.log('\n=== DEBUG COMPLETE ===');
}

// Test với một địa chỉ ví mẫu có giao dịch
export async function testWithSampleWallet() {
  // Địa chỉ ví Ethereum có nhiều giao dịch để test
  const sampleWallet = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik's wallet
  console.log('Testing with Vitalik\'s wallet (should have many transactions)...');
  await debugMoralisTransactionAPI(sampleWallet);
}

// Test với ví khác có giao dịch ERC-20
export async function testWithActiveWallet() {
  // Ví khác có nhiều giao dịch ERC-20
  const activeWallet = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'; // Uniswap Universal Router
  console.log('Testing with active wallet (Uniswap router)...');
  await debugMoralisTransactionAPI(activeWallet);
}
