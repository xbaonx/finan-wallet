/**
 * Simple Moralis API Test
 * Test basic API connectivity and endpoints
 */

import { API_CONFIG } from '../../core/config/api_config';

const MORALIS_API_KEY = API_CONFIG.MORALIS.API_KEY;
const MORALIS_BASE_URL = API_CONFIG.MORALIS.BASE_URL;

export async function testMoralisAPI(walletAddress: string) {
  console.log('=== MORALIS API TEST ===');
  console.log(`API Key: ${MORALIS_API_KEY.substring(0, 20)}...`);
  console.log(`Base URL: ${MORALIS_BASE_URL}`);
  console.log(`Wallet Address: ${walletAddress}`);
  
  // Test 1: Simple native balance endpoint
  try {
    console.log('\n--- Test 1: Native Balance ---');
    const url1 = `${MORALIS_BASE_URL}/${walletAddress}/balance?chain=eth`;
    console.log(`URL: ${url1}`);
    
    const response1 = await fetch(url1, {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status: ${response1.status}`);
    console.log(`StatusText: ${response1.statusText}`);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Success:', data1);
    } else {
      const errorText1 = await response1.text();
      console.error('Error:', errorText1);
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
  
  // Test 2: Alternative endpoint format
  try {
    console.log('\n--- Test 2: Alternative Endpoint ---');
    const url2 = `${MORALIS_BASE_URL}/wallets/${walletAddress}/balance?chain=eth`;
    console.log(`URL: ${url2}`);
    
    const response2 = await fetch(url2, {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status: ${response2.status}`);
    console.log(`StatusText: ${response2.statusText}`);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('Success:', data2);
    } else {
      const errorText2 = await response2.text();
      console.error('Error:', errorText2);
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
  
  // Test 3: Token balances
  try {
    console.log('\n--- Test 3: Token Balances ---');
    const url3 = `${MORALIS_BASE_URL}/${walletAddress}/erc20?chain=eth`;
    console.log(`URL: ${url3}`);
    
    const response3 = await fetch(url3, {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status: ${response3.status}`);
    console.log(`StatusText: ${response3.statusText}`);
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('Success:', data3);
    } else {
      const errorText3 = await response3.text();
      console.error('Error:', errorText3);
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
  
  console.log('\n=== END TEST ===');
}
