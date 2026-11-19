# Security Specification — SOUL Helium

## Data Invariants
1. User profiles (`/users/{userId}`) contain PII (`email`) and are strictly readable and writable only by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`).
2. Chat sessions (`/users/{userId}/chats/{chatId}`) belong exclusively to `userId` and must match `request.auth.uid` on both the path and `userId` field.
3. Messages (`/users/{userId}/chats/{chatId}/messages/{messageId}`) must belong to an existing parent `ChatSession` owned by the verified user, enforce immutable `id`, `userId`, `chatId`, `role`, `order`, and `createdAt`, and enforce server timestamps (`request.time`) on `createdAt`/`updatedAt`.
4. All document IDs (`userId`, `chatId`, `messageId`) must match `^[a-zA-Z0-9_-]+$` and be <= 128 chars.
5. `attachmentNames` is strictly bounded to `<= 5` entries and verified as strings when non-empty.

## Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write to `/users/u1/chats/c1` -> `PERMISSION_DENIED`
2. Cross-user read on `/users/otherUid` -> `PERMISSION_DENIED`
3. Unverified email (`email_verified: false`) writing to `/users/u1` -> `PERMISSION_DENIED`
4. Identity spoofing (`userId: "victim"` in `/users/attacker/chats/c1`) -> `PERMISSION_DENIED`
5. Shadow field injection (`isAdmin: true` on `/users/u1`) -> `PERMISSION_DENIED`
6. Forged client timestamp (`createdAt` != `request.time`) -> `PERMISSION_DENIED`
7. Immutable `createdAt` or `userId` mutation on update -> `PERMISSION_DENIED`
8. Orphaned message creation where parent chat `/users/u1/chats/missing` does not exist -> `PERMISSION_DENIED`
9. Oversized string DoS (`content` > 100,000 chars or `title` > 120 chars) -> `PERMISSION_DENIED`
10. Invalid document ID (`chatId` > 128 chars or containing `/..`) -> `PERMISSION_DENIED`
11. Unbounded array injection (`attachmentNames` with 20 elements or non-string element) -> `PERMISSION_DENIED`
12. Listing `/users` collection or listing another user's chats -> `PERMISSION_DENIED`
