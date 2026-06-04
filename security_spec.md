# Security Specification - Stemma Genetic Analytics

## 1. Data Invariants
- A **User** profile must match the authenticated `uid`.
- A **User**'s `role` cannot be modified by the user themselves (must be handled by a privileged process or admin).
- A **Job** must belong to a valid `userId` (the creator).
- A **Job**'s `jobId` must be a valid sanitized string.
- A **Job**'s `status` must be one of: `pending`, `processing`, `completed`, `failed`.
- Timestamp fields `createdAt` and `updatedAt` must be server-generated.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing (Users)**: Attempt to create a user profile for a different `uid`.
2. **Privilege Escalation**: Attempt to set `role: "admin"` during user creation.
3. **Identity Spoofing (Jobs)**: Attempt to create a job with a `userId` that is not the current user.
4. **Status Shortcutting**: Attempt to create a job with `status: "completed"`.
5. **ID Poisoning**: Attempt to create a job with an extremely long or malicious `jobId`.
6. **Shadow Fields**: Attempt to add a field `isVerified: true` to a Job document.
7. **Timestamp Spoofing**: Attempt to set a custom `createdAt` date in the past.
8. **Malicious Update**: Attempt to change the `userId` of an existing Job.
9. **Role Modification**: User attempts to change their own `role` to "editor".
10. **PII Leak**: Non-admin user attempts to `get` another user's profile.
11. **Query Scraping**: Authenticated user attempts to `list` all jobs without a `where` clause filtering by `userId`.
12. **Denial of Wallet**: Attempt to list jobs with a 1MB string in a query filter (if applicable).

## 3. Test Runner Concept
The tests will verify that all the above unauthorized operations return `PERMISSION_DENIED`.
