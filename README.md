# TokenScribe: Decentralized E-Book Publishing Platform

A decentralized platform for transparent and fair e-book publishing using the Stacks blockchain.

## Project Overview

TokenScribe is a decentralized platform that aims to provide a transparent and fair ecosystem for e-book publishing. By leveraging the Stacks blockchain, the project addresses key issues in the traditional publishing industry, such as lack of transparency, unfair royalty distribution, and challenges with ownership and rights management.

Key features of the TokenScribe platform include:

- Book registration with metadata (title, author, ISBN, content hash, royalty percentage)
- Book ownership transfer
- Retrieval of book details
- Authorization checks to ensure only book owners can perform certain actions

## Contract Architecture

The main smart contract for the TokenScribe platform is `book_registry.clar`, which manages the digital book registry on the Stacks blockchain.

### Data Structures

The contract uses a map called `books` to store the book metadata, with the following fields:

- `title`: The title of the book (string, max 100 characters)
- `author`: The principal (address) of the book's author
- `isbn`: The ISBN of the book (string, 13 characters)
- `content-hash`: The hash of the book's content (32-byte buffer)
- `owner`: The principal (address) of the current book owner
- `royalty-percentage`: The royalty percentage for the book (unsigned integer, 0-100)

The contract also maintains a `next-book-id` variable to track the next available book ID.

### Public Functions

The contract provides the following public functions:

1. **`register-book`**: Allows users to register new books with the specified metadata. It ensures that a book with the same details does not already exist.
2. **`transfer-book-ownership`**: Allows the current owner of a book to transfer ownership to a new principal.
3. **`get-book-details`**: Allows users to retrieve the details of a registered book.
4. **`is-book-owner`**: Allows users to check if a given principal is the owner of a specific book.

### Error Handling

The contract defines several error constants to handle different error scenarios:

- `ERR_UNAUTHORIZED`: Returned when an unauthorized user attempts to perform an action.
- `ERR_BOOK_ALREADY_EXISTS`: Returned when a user attempts to register a book with details that already exist.
- `ERR_BOOK_NOT_FOUND`: Returned when a user attempts to retrieve details for a non-existent book.
- `ERR_INVALID_ROYALTY`: Returned when a user attempts to register a book with an invalid royalty percentage (outside the 0-100 range).

## Installation & Setup

Prerequisites:
- Clarinet (a Clarity smart contract development tool)

Installation steps:
1. Clone the repository: `git clone https://github.com/username/tokenscribe.git`
2. Install dependencies: `cd tokenscribe && npm install`
3. Run Clarinet: `clarinet check` (to run tests) or `clarinet deploy` (to deploy the contract)

## Usage Guide

### Book Registration
```clarity
(contract-call? 'book_registry register-book 'Test-Book '1234567890123 0x32627974657363 (+ u0 u10))
```

### Book Ownership Transfer
```clarity
(contract-call? 'book_registry transfer-book-ownership u1 'new-owner-principal)
```

### Book Details Retrieval
```clarity
(map-get? (contract-call? 'book_registry get-book-details u1))
```

### Book Ownership Check
```clarity
(contract-call? 'book_registry is-book-owner u1 'check-principal)
```

## Testing

The project includes a comprehensive test suite in `/tests/book_registry_test.ts` that covers the following scenarios:

- Book registration (successful, duplicate prevention, royalty validation)
- Ownership transfer (successful, unauthorized attempts)
- Book details retrieval (successful, non-existent book)
- Authorization (verifying book owner function)

To run the tests, use the Clarinet CLI: `clarinet check`

## Security Considerations

The TokenScribe contract includes several security checks and validations:

- Royalty percentage is validated to be between 0 and 100 (inclusive).
- Book registration checks if a book with the same details already exists.
- Ownership transfer checks if the caller is the current owner of the book.
- The contract uses `asserts!` to handle error conditions and return appropriate error codes.
- The contract does not implement any token operations (FT/NFT), reducing the attack surface.
- The contract uses Clarity's built-in authorization model, which relies on Stacks blockchain principals.
