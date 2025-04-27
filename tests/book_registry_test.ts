import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Book Registration Tests
Clarinet.test({
  name: "Book Registry: Successfully register a book with valid data",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    const block = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Test Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
  }
});

Clarinet.test({
  name: "Book Registry: Prevent duplicate book registrations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register a book first
    const block1 = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Test Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Try to register the same book again
    const block2 = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Test Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    block1.receipts[0].result.expectOk().expectUint(1);
    block2.receipts[0].result.expectErr().expectUint(409); // ERR_BOOK_ALREADY_EXISTS
  }
});

Clarinet.test({
  name: "Book Registry: Validate royalty percentage constraints",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Test invalid high royalty
    const blockHigh = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('High Royalty Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(101)  // Over 100%
        ], 
        deployer.address
      )
    ]);

    // Test invalid negative royalty
    const blockNegative = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Negative Royalty Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(0-1)  // Negative value
        ], 
        deployer.address
      )
    ]);

    blockHigh.receipts[0].result.expectErr().expectUint(422); // ERR_INVALID_ROYALTY
    blockNegative.receipts[0].result.expectErr().expectUint(422); // ERR_INVALID_ROYALTY
  }
});

// Ownership Transfer Tests
Clarinet.test({
  name: "Book Registry: Successful ownership transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Register a book
    const blockRegister = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Transferable Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Transfer ownership
    const blockTransfer = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'transfer-book-ownership', 
        [
          types.uint(1),  // book-id
          types.principal(wallet1.address)
        ], 
        deployer.address
      )
    ]);

    // Verify new owner
    const bookDetails = chain.callReadOnlyFn(
      'book_registry', 
      'get-book-details', 
      [types.uint(1)], 
      deployer.address
    );

    blockRegister.receipts[0].result.expectOk().expectUint(1);
    blockTransfer.receipts[0].result.expectOk().expectBool(true);
    bookDetails.result.expectSome();
    
    const bookOwner = bookDetails.result.expectSome().expectTuple().owner;
    assertEquals(bookOwner.expectPrincipal(), wallet1.address);
  }
});

Clarinet.test({
  name: "Book Registry: Prevent unauthorized ownership transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Register a book
    const blockRegister = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Secure Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Unauthorized transfer attempt
    const blockTransfer = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'transfer-book-ownership', 
        [
          types.uint(1),  // book-id
          types.principal(wallet2.address)
        ], 
        wallet1.address  // Unauthorized sender
      )
    ]);

    blockRegister.receipts[0].result.expectOk().expectUint(1);
    blockTransfer.receipts[0].result.expectErr().expectUint(403); // ERR_UNAUTHORIZED
  }
});

// Book Details Retrieval Tests
Clarinet.test({
  name: "Book Registry: Successfully retrieve book metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Register a book
    const blockRegister = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Retrievable Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Retrieve book details
    const bookDetails = chain.callReadOnlyFn(
      'book_registry', 
      'get-book-details', 
      [types.uint(1)], 
      deployer.address
    );

    blockRegister.receipts[0].result.expectOk().expectUint(1);
    bookDetails.result.expectSome();
    
    const bookTuple = bookDetails.result.expectSome().expectTuple();
    assertEquals(bookTuple.title.expectUtf8(), 'Retrievable Book');
    assertEquals(bookTuple.isbn.expectAscii(), '1234567890123');
    assertEquals(bookTuple.author.expectPrincipal(), deployer.address);
  }
});

Clarinet.test({
  name: "Book Registry: Handle non-existent book queries",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Try to retrieve non-existent book
    const bookDetails = chain.callReadOnlyFn(
      'book_registry', 
      'get-book-details', 
      [types.uint(999)], 
      deployer.address
    );

    bookDetails.result.expectNone();
  }
});

// Authorization Tests
Clarinet.test({
  name: "Book Registry: Verify book owner function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Register a book
    const blockRegister = chain.mineBlock([
      Tx.contractCall(
        'book_registry', 
        'register-book', 
        [
          types.utf8('Owner Verification Book'), 
          types.ascii('1234567890123'), 
          types.buff(Buffer.from('32bytescontenthashabcdefg', 'utf8')), 
          types.uint(10)
        ], 
        deployer.address
      )
    ]);

    // Check ownership
    const ownerCheck1 = chain.callReadOnlyFn(
      'book_registry', 
      'is-book-owner', 
      [types.uint(1), types.principal(deployer.address)], 
      deployer.address
    );

    const ownerCheck2 = chain.callReadOnlyFn(
      'book_registry', 
      'is-book-owner', 
      [types.uint(1), types.principal(wallet1.address)], 
      deployer.address
    );

    blockRegister.receipts[0].result.expectOk().expectUint(1);
    ownerCheck1.result.expectBool(true);
    ownerCheck2.result.expectBool(false);
  }
});