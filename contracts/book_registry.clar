;; TokenScribe: Decentralized E-Book Publishing Platform
;; Book Registry Smart Contract

;; Error Constants
(define-constant ERR_UNAUTHORIZED u403)
(define-constant ERR_BOOK_ALREADY_EXISTS u409)
(define-constant ERR_BOOK_NOT_FOUND u404)
(define-constant ERR_INVALID_ROYALTY u422)

;; Book Metadata Structure
(define-map books 
  {book-id: uint} 
  {
    title: (string-utf8 100),
    author: principal,
    isbn: (string-ascii 13),
    content-hash: (buff 32),
    owner: principal,
    royalty-percentage: uint
  }
)

;; Track the next available book ID
(define-data-var next-book-id uint u1)

;; Private Helper: Validate Royalty Percentage
(define-private (is-valid-royalty (percentage uint))
  (and (>= percentage u0) (<= percentage u100))
)

;; Register a new book
(define-public (register-book 
  (title (string-utf8 100))
  (isbn (string-ascii 13))
  (content-hash (buff 32))
  (royalty-percentage uint)
)
  (begin
    ;; Validate royalty percentage
    (asserts! (is-valid-royalty royalty-percentage) (err ERR_INVALID_ROYALTY))
    
    ;; Get current book ID and increment
    (let ((book-id (var-get next-book-id)))
      ;; Ensure book with this details doesn't already exist
      (asserts! 
        (is-none (map-get? books {book-id: book-id})) 
        (err ERR_BOOK_ALREADY_EXISTS)
      )
      
      ;; Register the book with the sender as initial owner
      (map-set books 
        {book-id: book-id} 
        {
          title: title,
          author: tx-sender,
          isbn: isbn,
          content-hash: content-hash,
          owner: tx-sender,
          royalty-percentage: royalty-percentage
        }
      )
      
      ;; Increment book ID for next registration
      (var-set next-book-id (+ book-id u1))
      
      ;; Return the newly created book ID
      (ok book-id)
    )
  )
)

;; Transfer book ownership
(define-public (transfer-book-ownership 
  (book-id uint) 
  (new-owner principal)
)
  (let ((book (unwrap! 
    (map-get? books {book-id: book-id}) 
    (err ERR_BOOK_NOT_FOUND)
  )))
    ;; Verify current owner is transferring
    (asserts! 
      (is-eq tx-sender (get owner book)) 
      (err ERR_UNAUTHORIZED)
    )
    
    ;; Update book ownership
    (map-set books 
      {book-id: book-id} 
      (merge book {owner: new-owner})
    )
    
    (ok true)
  )
)

;; Retrieve book details (read-only)
(define-read-only (get-book-details (book-id uint))
  (map-get? books {book-id: book-id})
)

;; Check if sender is book owner
(define-read-only (is-book-owner (book-id uint) (check-principal principal))
  (match (map-get? books {book-id: book-id})
    book (is-eq check-principal (get owner book))
    false
  )
)