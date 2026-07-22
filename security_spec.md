# Security Specification - KaraokePro

## Data Invariants
1. A `SongRequest` must belong to a valid and active `Table`.
2. A `SongRequest` creator (public user) can only create requests for their own `tableId` (as identified by the URL/QR, though for Firebase we might use anonymous auth or just strict ID validation if we don't have per-table auth).
3. Only the DJ (Admin) can mark songs as 'sung' or 'removed'.
4. Tables can only be modified by the DJ (Admin).

## The Dirty Dozen Payloads (Attack Vectors)

1. **Identity Spoofing**: Attempt to create a `SongRequest` with `tableId: 'mesa-999'` which doesn't exist.
2. **Privilege Escalation**: Attempt to mark a song as `status: 'sung'` from a public client.
3. **Ghost Fields**: Attempt to add `isVIP: true` to a `SongRequest` creation.
4. **ID Poisoning**: Attempt to create a request with an ID that is a 2MB string of junk characters.
5. **Modification of Constants**: Attempt to `update` a request's `createdAt` timestamp.
6. **Self-Assigned Admin**: Attempt to write to `/admins/{uid}`.
7. **Negative History**: Attempt to set `songsSungCount` to `-100` on a table.
8. **Malicious Table Deactivation**: A public user attempts to set `isActive: false` on another table.
9. **Large Payload Attack**: Sending 1MB of text in `singerName`.
10. **Bypassing Fair Queue**: Creating multiple requests simultaneously for the same table to clog the queue.
11. **Impersonating Table Name**: Public user tries to rename a table via the `/tables` collection.
12. **Unauthorized List Access**: Public user tries to list all tables with a broad query to find active ones without scanning a QR.

## Test Runner Plan
- Verify that `create` on `/songRequests` is allowed but restricted by `isValidSongRequest`.
- Verify that `update` on `/songRequests` is only allowed for status changes by DJ.
- Verify that `/tables` is read-only for public, write-able by DJ.
