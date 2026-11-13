# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Admin Authority**: Only a verified administrator (`isSignedIn() && request.auth.token.email_verified == true && (request.auth.token.email == 'chethiyabandara0001@gmail.com' || exists(/databases/$(database)/documents/admins/$(request.auth.uid)))`) can create, update, or delete records in `/site_images`, `/section_gallery_items`, `/site_texts`, or `/admins`.
3. **PII Isolation on `/admins/{adminUid}`**: Admin profiles contain `email` (PII). Reading `/admins/{adminUid}` is restricted strictly to the document owner (`request.auth.uid == adminUid`) or a verified admin (`isAdmin()`). Blanket `isSignedIn()` reads and `list` queries on `/admins` are forbidden.
4. **Query Enforcer & Validation on `/enquiries/{enquiryId}`**: Enquiries submitted via the Contact form are validated via `isValidEnquiry(incoming(), enquiryId)` enforcing strict key allowlists (`hasOnly` & `hasAll`), string length bounds (`firstName` 1..100, `lastName` 1..100, `email` 3..256, `whatsapp` 0..60, `park` 0..100, `adults` 1..20, `kids` 1..20, `safariDate` 0..60, `message` 1..4000, `sourcePage` 1..80), `status in ['new', 'read', 'replied']`, `adminScope == 'nisha-cms-admin'`, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`). Updates on `/enquiries/{enquiryId}` must pass `isValidEnquiry(incoming(), enquiryId)` and only mutate `['status', 'updatedAt']` via `incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAt'])`.
5. **Query Enforcer on Public Site Content**: `allow list` on `/site_images`, `/section_gallery_items`, and `/site_texts` never uses `if true` or blanket `if isSignedIn()`. Every `list` query must explicitly satisfy `resource.data.visibility == 'public' || isAdmin()`.
6. **Strict Blueprint, Key & R2 CDN Link Validation**: Every `create` and `update` operation on `/site_images`, `/section_gallery_items`, `/site_texts`, `/enquiries`, and `/admins` must pass its respective `isValid[Entity](incoming())` helper, enforcing exact key allowlists (`hasOnly`), required keys (`hasAll`), string/number/boolean types, regex patterns, and maximum length limits. Raw `data:` base64 image strings are strictly forbidden in Firestore (`!val.matches('^data:.*')`, `maxLength: 2048`); all images are stored in Cloudflare R2 and referenced via R2 CDN URLs (`src`, `lightboxHref`, and optional `r2Key`).
7. **Identity & Temporal Integrity**:
   - `authorId` must equal `request.auth.uid` (or authorized CMS author) on creation and remain immutable on update.
   - `createdAt` must equal `request.time` on creation and remain immutable (`incoming().createdAt == existing().createdAt`) on update.
   - `updatedAt` must equal `request.time` on both creation and update.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Unauthenticated Write to `site_images`)**: `auth = null`, attempting `create` on `/site_images/index_html__slot_0` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Admin Email Spoof)**: `auth = { uid: 'spoof1', token: { email: 'chethiyabandara0001@gmail.com', email_verified: false } }`, attempting `create` on `/site_images/index_html__slot_0` -> `PERMISSION_DENIED`.
3. **Payload 3 (Non-Admin Authenticated User Write)**: `auth = { uid: 'user2', token: { email: 'attacker@example.com', email_verified: true } }`, attempting `create` on `/site_texts/index_html__text_0` -> `PERMISSION_DENIED`.
4. **Payload 4 (Shadow Field Injection on `site_images` / `enquiries`)**: Attempting `create` with an undeclared field `isSuperAdmin: true` -> `PERMISSION_DENIED`.
5. **Payload 5 (Author UID Spoofing on `site_texts`)**: Verified admin (`uid: 'admin1'`) attempting `create` on `/site_texts/index_html__text_1` with `authorId: 'someone_else'` -> `PERMISSION_DENIED`.
6. **Payload 6 (Client Timestamp Forgery on `section_gallery_items` / `enquiries`)**: Attempting `create` with a forged past `createdAt` timestamp (`createdAt != request.time`) -> `PERMISSION_DENIED`.
7. **Payload 7 (Immutable Field Mutation on `site_images` / `enquiries` Update)**: Attempting `update` that mutates `createdAt`, `slotId`, or `enquiryId` -> `PERMISSION_DENIED`.
8. **Payload 8 (Value Poisoning on `site_texts` / `enquiries` Update)**: Attempting `update` with `content` as a number (`12345`) or invalid `status` (`'hacked'`) -> `PERMISSION_DENIED`.
9. **Payload 9 (ID Poisoning / Regex Violation)**: Attempting `create` on `/enquiries/invalid$id!@#` -> `PERMISSION_DENIED`.
10. **Payload 10 (PII Leak on `/admins/{adminUid}`)**: Non-owner authenticated user (`uid: 'user2'`) attempting `get` on `/admins/admin1` -> `PERMISSION_DENIED`.
11. **Payload 11 (Unfiltered Blanket List Query on `/site_images`)**: Unauthenticated client executing `list` on `/site_images` where `visibility != 'public'` -> `PERMISSION_DENIED`.
12. **Payload 12 (Self-Assigned Admin Privilege Escalation)**: Non-admin user (`uid: 'user2'`, `email: 'user2@example.com'`) attempting `create` on `/admins/user2` with `role: 'admin'` -> `PERMISSION_DENIED`.
