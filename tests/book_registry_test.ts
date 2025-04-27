import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Enhanced Input Validation Tests
Clarinet.test({
  name: "Book Registry: Validate input parameters for book registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Test empty title
    const emptyTitleBlock = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8(''), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Test invalid ISBN (too short)
    const shortIsbnBlock = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Short ISBN Book'), 
          types.ascii('123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Verify input validation
    emptyTitleBlock.receipts[0].result.expectErr().expectUint(400); // ERR_INVALID_TITLE
    shortIsbnBlock.receipts[0].result.expectErr().expectUint(401); // ERR_INVALID_ISBN
  }
});

// Content Hash Uniqueness Tests
Clarinet.test({
  name: "Book Registry: Enforce unique content hash for book registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Register first book with a content hash
    const block1 = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('First Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('unique-content-hash-1', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Try to register second book with same content hash
    const block2 = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Duplicate Book'), 
          types.ascii('9876543210987'), 
          types.buff(Buffer.from('unique-content-hash-1', 'utf8')), 
          types.uint(15)
        ], 
        wallet1.address
      )
    ]);

    block1.receipts[0].result.expectOk().expectUint(1);
    block2.receipts[0].result.expectErr().expectUint(402); // ERR_CONTENT_HASH_EXISTS
  }
});

// Continuous block with the rest of the test cases...
[REST OF THE TEST FILE CONTENT FROM PREVIOUS SUBMISSION]