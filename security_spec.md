# Security Specification for SocialCart

## 1. Data Invariants
1. `users`: A user document ID must match the user's authenticated UID (`request.auth.uid`). Users cannot alter their verified status, rating, or other identity boundaries illegitimately.
2. `posts`: Every post must have a valid `userId` matching the authenticated author. Non-authors cannot delete or tamper with other authors' posts. Any user can view posts (`read`).
3. `products`: Marketplace items must have valid titles, categories, and positive prices. Only the seller/owner can modify or delete their product. Products are publicly readable.
4. `conversations`: Private communication threads. Reads and writes are strictly restricted to members of the `participants` list or authenticated users interacting with the thread.
5. `orders`: Financial transactions and records. Buyers can read and create their own orders. Only authorized parties can read and update order status.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Ghost Admin Elevation**: An unauthenticated or standard user writes `{ role: 'admin', isVerifiedSeller: true }` to `/users/{userId}`.
2. **Impersonated Post Author**: User A submits a post with `userId: 'user_B'` to impersonate another member.
3. **Orphaned Post Deletion**: User B sends a delete request to `/posts/post_owned_by_user_A`.
4. **Price Tampering**: A buyer tries to update a product price to `0.01` during checkout.
5. **Private Chat Eavesdropping**: User C queries `/conversations/conv_between_A_and_B` where `participants` does not include User C.
6. **Fake Review Injection**: Unauthenticated user injects review data directly without authenticating.
7. **Negative Order Price**: User submits an order with `totalAmount: -100`.
8. **Foreign Order Snoop**: User A attempts to list or read orders belonging to `buyerId: 'user_B'`.
9. **Unbounded Payload Flood**: User injects 2MB junk text into `description`.
10. **Shadow Field Injection**: User adds undocumented system fields into a post payload.
11. **Deleted Conversation Restoration**: Tampering with conversation participants to force injection into a thread.
12. **Null Auth Order Creation**: Unauthenticated client directly creates orders in `/orders/`.
