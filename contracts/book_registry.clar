;; TokenScribe: Decentralized E-Book Publishing Platform
;; Book Registry Smart Contract
;;
;; A secure and transparent platform for registering and managing e-book ownership
;; with built-in royalty mechanisms and content hash uniqueness checks.

;; Error Constants
(define-constant ERR_UNAUTHORIZED u403)
(define-constant ERR_BOOK_ALREADY_EXISTS u409)
(define-constant ERR_BOOK_NOT_FOUND u404)
(define-constant ERR_INVALID_ROYALTY u422)
(define-constant ERR_INVALID_TITLE u400)
(define-constant ERR_INVALID_ISBN u401)
(define-constant ERR_CONTENT_HASH_EXISTS u402)
(define-constant ERR_NOT_CONTRACT_OWNER u403)

;; Contract Owner
(define-data-var contract-owner principal tx-sender)

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

;; Content Hash Tracking
(define-map content-hashes 
  {content-hash: (buff 32)}
  {book-id: uint}
)

;; Track the next available book ID
(define-data-var next-book-id uint u1)

;; Events
(define-event book-registered 
  (book-id uint)
  (title (string-utf8 100))
  (author principal)
)

(define-event book-ownership-transferred
  (book-id uint)
  (previous-owner principal)
  (new-owner principal)
)

(define-event book-metadata-updated
  (book-id uint)
  (updater principal)
)

;; Private Helper: Validate Royalty Percentage
(define-private (is-valid-royalty (percentage uint))
  (and (>= percentage u0) (<= percentage u100))
)

;; Private Helper: Validate Title
(define-private (is-valid-title (title (string-utf8 100)))
  (and 
    (> (len title) u0) 
    (<= (len title) u100)
  )
)

;; Private Helper: Validate ISBN
(define-private (is-valid-isbn (isbn (string-ascii 13)))
  (and 
    (>= (len isbn) u10) 
    (<= (len isbn) u13)
  )
)

;; Set or change contract owner (only callable by current owner)
(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR_NOT_CONTRACT_OWNER))
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; Register a new book
(define-public (register-book 
  (title (string-utf8 100))
  (isbn (string-ascii 13))
  (content-hash (buff 32))
  (royalty-percentage uint)
)
  (begin
    ;; Validate inputs
    (asserts! (is-valid-title title) (err ERR_INVALID_TITLE))
    (asserts! (is-valid-isbn isbn) (err ERR_INVALID_ISBN))
    (asserts! (is-valid-royalty royalty-percentage) (err ERR_INVALID_ROYALTY))
    
    ;; Check for unique content hash
    (asserts! 
      (is-none (map-get? content-hashes {content-hash: content-hash})) 
      (err ERR_CONTENT_HASH_EXISTS)
    )
    
    ;; Get current book ID and increment
    (let ((book-id (var-get next-book-id)))
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
      
      ;; Track content hash
      (map-set content-hashes 
        {content-hash: content-hash}
        {book-id: book-id}
      )
      
      ;; Increment book ID for next registration
      (var-set next-book-id (+ book-id u1))
      
      ;; Emit registration event
      (print (book-registered book-id title tx-sender))
      
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
    
    ;; Emit ownership transfer event
    (print (book-ownership-transferred 
      book-id 
      (get owner book) 
      new-owner
    ))
    
    (ok true)
  )
)

;; Update book metadata (only book owner or contract owner)
(define-public (update-book-metadata
  (book-id uint)
  (new-title (optional (string-utf8 100)))
  (new-isbn (optional (string-ascii 13)))
  (new-royalty-percentage (optional uint))
)
  (let ((book (unwrap! 
    (map-get? books {book-id: book-id}) 
    (err ERR_BOOK_NOT_FOUND)
  )))
    ;; Authorization check
    (asserts! 
      (or 
        (is-eq tx-sender (get owner book))
        (is-eq tx-sender (var-get contract-owner))
      )
      (err ERR_UNAUTHORIZED)
    )
    
    ;; Update book with optional fields, preserving existing values if not provided
    (map-set books 
      {book-id: book-id}
      (merge book 
        {
          title: (default-to (get title book) new-title),
          isbn: (default-to (get isbn book) new-isbn),
          royalty-percentage: (default-to (get royalty-percentage book) new-royalty-percentage)
        }
      )
    )
    
    ;; Emit metadata update event
    (print (book-metadata-updated book-id tx-sender))
    
    (ok true)
  )
)

;; Retrieve book details (read-only)
(define-read-only (get-book-details (book-id uint))
  (map-get? books {book-id: book-id})
)

;; Get book by content hash (read-only)
(define-read-only (get-book-by-content-hash (content-hash (buff 32)))
  (match (map-get? content-hashes {content-hash: content-hash})
    result (map-get? books {book-id: (get book-id result)})
    none
  )
)

;; Check if sender is book owner
(define-read-only (is-book-owner (book-id uint) (check-principal principal))
  (match (map-get? books {book-id: book-id})
    book (is-eq check-principal (get owner book))
    false
  )
)

;; Get contract owner
(define-read-only (get-contract-owner)
  (var-get contract-owner)
)