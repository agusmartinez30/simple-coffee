# Central Perk API

Backend shared by `admin/` and `web/`. NestJS 12 (ESM), Prisma 7 with PostgreSQL, Zod 4, Vitest.

## Setup

Requires Node 22+ and Docker.

```bash
cd api
cp .env.example .env
docker compose up -d          # PostgreSQL 17 on localhost:5432 (or POSTGRES_PORT)
npm ci                        # also runs `prisma generate`
npm run db:migrate            # apply migrations to the local database
npm run db:seed               # create the venue and the first owner (needs SEED_OWNER_* in .env)
npm run dev                   # http://localhost:3001/health
```

If port 5432 is already taken (for example by a local Postgres), set `POSTGRES_PORT=5434` in `.env` and use the same port in `DATABASE_URL`; Docker Compose reads `.env` for the port mapping.

The app validates its environment at boot (`src/shared/config/env.ts`) and exits with a list of invalid keys when something is missing.

## Scripts

| Script                       | What it does                                        |
| ---------------------------- | --------------------------------------------------- |
| `dev`                        | Nest in watch mode                                  |
| `build` / `start`            | Compile to `dist/` and run it                       |
| `lint` / `typecheck`         | ESLint (type-aware) and `tsc --noEmit`              |
| `test`                       | Vitest: unit specs in `src/`, e2e specs in `test/`  |
| `db:generate`                | Generate the Prisma client into `src/generated/`    |
| `db:migrate` / `db:deploy`   | Create/apply migrations (dev) or apply them (prod)  |
| `db:seed`                    | Create the venue, tables and menu if missing; upsert the owner from `SEED_OWNER_*` env |
| `db:studio`                  | Prisma Studio                                       |

## Architecture rules

- Screaming + hexagonal: business code lives in `src/modules/<module>/{domain,application,infrastructure,http}`. See [`src/modules/README.md`](src/modules/README.md).
- Cross-cutting code lives in `src/shared/` (config, HTTP helpers, Prisma).
- `domain/` has no Nest, Prisma, or Zod imports.
- Zod validates input only at the HTTP boundary, through `ZodValidationPipe` (`src/shared/http/zod-validation.pipe.ts`), which answers `400` with flattened issues.
- Prisma models are added to `prisma/schema.prisma` by the module that owns them. The connection URL is read from `prisma.config.ts`.
- `GET /health` is a database-free liveness probe, so the e2e test runs without PostgreSQL.

## Auth (staff sessions)

Own session auth, no JWT. `src/modules/auth` stores sessions in PostgreSQL and hands the browser an opaque token in the `cp_session` cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production, path `/`). Only SHA-256 hashes of session and reset tokens are stored; passwords use argon2id.

| Endpoint                     | Body                              | Response                                                                 |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| `POST /auth/login`           | `{ email, password, remember? }`  | `200 { status: "authenticated", staff }` or `200 { status: "mfa_required" }`; `401 invalid_credentials` |
| `POST /auth/mfa/verify`      | `{ code }` (6 digits, TOTP)       | `200 { status: "authenticated", staff }`; `401 invalid_mfa_code \| invalid_session` |
| `POST /auth/logout`          | —                                 | `204`, clears the cookie                                                 |
| `GET /auth/me`               | —                                 | `200 { staff }`; `401 invalid_session`                                   |
| `POST /auth/password/forgot` | `{ email }`                       | always `202` (no account probing)                                        |
| `POST /auth/password/reset`  | `{ token, password }`             | `204`, revokes every session; `400 invalid_reset_token \| weak_password` (`requirements`) |

- `staff` is `{ id, email, name, role }`, with `role` one of `OWNER`, `MANAGER`, `STAFF`.
- MFA is TOTP (authenticator app). Users with `mfaSecret` get a 10-minute `mfa_pending` session from login; verifying rotates it into a new authenticated session. Seed with `SEED_OWNER_MFA=true` to enroll the owner and print the `otpauth://` URI.
- `remember: true` makes the cookie persistent (`Max-Age` = `SESSION_TTL_HOURS`); otherwise it is a browser-session cookie. The server expires sessions after `SESSION_TTL_HOURS` either way.
- Reset links point to `<ADMIN_URL>/reset-password?token=…` and expire after 15 minutes. In development the `ConsoleMailer` prints them to the API log; replace it with a real mail adapter before production.
- Password rules mirror the admin reset screen: 6+ characters, no other strength rules (`src/modules/auth/domain/password-policy.ts`).
- Login, verify, forgot and reset are rate limited per IP with `@nestjs/throttler`.
- Other modules protect routes with `@UseGuards(SessionGuard)` and read the user with `@CurrentStaff()` (import `AuthModule`).

## Venue (profile and payment settings)

`src/modules/venue` holds the single café: one `venues` row with id `main`, created by the seed (both clients model one café). Admin routes use `SessionGuard`; any signed-in staff role may edit, because the admin has no role restriction on these screens.

| Endpoint                       | Auth  | Body → response |
| ------------------------------ | ----- | --------------- |
| `GET /venue`                   | —     | `200 VenueProfile & { openStatus }`; `404 venue_not_configured` before seeding |
| `PUT /venue`                   | staff | `VenueProfile` → `200` as `GET`; `400 invalid_venue_profile` with `issues: [{ path, code }]` |
| `GET /venue/payment-options`   | —     | `200 { requestModes }`, the enabled modes in display order |
| `GET /venue/payment-settings`  | staff | `200 { settings, version, updatedAt }` |
| `PUT /venue/payment-settings`  | staff | `settings` → `200 { settings, version, updatedAt }`; `400 invalid_payment_settings` with `issues` and `bankAccount` field codes |

- `VenueProfile` mirrors the web `CafeDetail`: `{ name, description, coverImageUrl, address: { street, city, mapsUrl } | null, contact: { whatsapp, phone }, links: [{ network, handle, url }], timezone, openingHours: [{ weekday, opensAt, closesAt }] }`. `network` is `instagram`, `facebook` or `website`; `weekday` is `monday`…`sunday`; times are `"HH:MM"`. Missing weekdays are closed; ranges past midnight are not supported. Link and map URLs must be http(s).
- `openStatus` is computed in the venue `timezone`: `{ open: true, closesAt }`, `{ open: false, reopensOn, reopensAt }`, or `null` without hours. Clients format the copy ("Abierto hasta 20:00", "mañana a las 08:00").
- `settings` mirrors the admin `PaymentSettings`: `{ methods: { cash, card, transfer, other }, requestModes: { table, register, transfer }, bankAccount: { holder, bank, alias, cbu, staffInstructions } }`, with a boolean per method and mode. The web app calls `register` "cashier".
- Rules mirror `admin/src/features/payments/payment-settings.ts`: at least one method; the transfer request mode needs the transfer method; the bank account is always validated (holder and bank required, alias of 6–20 `[A-Za-z0-9.-]`, CBU/CVU of 22 digits with both check digits, staff instructions up to 120 characters). Saving an unchanged draft keeps the version.
- Bank details are never public: the web bill screen only lets customers pick a request mode, and staff share the transfer data.

## Tables (configuration and QR credentials)

`src/modules/tables` holds the table configuration the admin edits on `/tables/management` and `/tables/qr`: spaces, tables, their floor-plan box and their QR credentials. Live service (table sessions, orders, bills) is not here yet. Admin routes use `SessionGuard` (any staff role); every admin mutation answers the full updated configuration.

| Endpoint                               | Auth  | Body → response |
| -------------------------------------- | ----- | --------------- |
| `GET /tables/qr?number=07&token=…`     | —     | `200 { number, label, spaceName }`; `404 table_not_found` unless the table is enabled and the token is its active credential (no reason given) |
| `GET /tables/config`                   | staff | `200 Configuration` |
| `POST /tables/spaces`                  | staff | `{ name, icon?, tone? }` → `201 Configuration`; `400 invalid_space` |
| `PATCH /tables/spaces/:spaceId`        | staff | `{ name, icon?, tone? }` → `200`; `400 invalid_space`, `404 space_not_found` |
| `POST /tables/spaces/:spaceId/move`    | staff | `{ direction: "up" \| "down" }` → `200` (no change at either end) |
| `DELETE /tables/spaces/:spaceId`       | staff | `200`; `409 space_not_removable` with `reason: "space_has_tables" \| "last_space"` and `tableCount` |
| `POST /tables`                         | staff | `{ label, spaceId, capacity, description, enabled, shape? }` → `201`; `400 invalid_table` |
| `PATCH /tables/:tableId`               | staff | `{ label, spaceId, capacity, description, enabled }` → `200`; `400 invalid_table`, `409 table_has_open_session` when disabling |
| `POST /tables/:tableId/enable` · `/disable` | staff | `200`; disable: `409 table_has_open_session` |
| `DELETE /tables/:tableId`              | staff | `200`; `409 table_has_open_session \| table_has_history` |
| `PUT /tables/:tableId/position`        | staff | `{ x, y }` → `200`; `409 table_overlap` with `conflict: { id, number, label }` |
| `PUT /tables/:tableId/size`            | staff | `{ x, y, width, height }` (integers) → `200`; `409 table_overlap` |
| `PUT /tables/:tableId/shape`           | staff | `{ shape: "rect" \| "round" }` → `200` |
| `POST /tables/:tableId/qr/regenerate`  | staff | `200`; the old token stops resolving |

- `Configuration` is `{ spaces: Space[], tables: Table[] }`: spaces in display order, tables by number. `Space` is `{ id, name, icon, tone }` with `icon` one of `store`, `sun`, `trees`, `map-pin` and `tone` one of `brand`, `warning`, `success`, `neutral`. `Table` is `{ id, number, label, spaceId, capacity, description, enabled, version, layout: { x, y, width, height, shape }, qr, revokedQrs }`, where `qr` is `{ token, issuedAt, issuedBy: { id, name } }` or `null` and `revokedQrs` (newest first) add `revokedAt` and `auditNumber`.
- Unknown space or table ids answer `404 space_not_found` / `table_not_found`. `400` errors carry `issues: [{ path, code }]` with `code` one of `required`, `too_long`, `duplicate`, `unknown_space`, `out_of_range`; `409` means the current configuration forbids the change.
- Rules mirror `admin/src/features/venue/{space-config,table-config,table-removal,table-layout}.ts`: space names up to 24 characters, labels up to 30, both unique ignoring case, spaces and accents; capacity an integer from 1 to 20; description up to 60 characters. A space is deleted only without tables and when it is not the last one. Disabling or deleting a table is refused while a session is open; a table that ever had a session can only be disabled. Sessions do not exist yet, so the `TableActivity` adapter reports none.
- Floor plan: each space has a 780×620 plan. A move snaps to the 8px grid and is clamped inside the plan; a resize is clamped to the plan and to the minimum box the table's seats need. Overlapping another table of the same space is refused. A new table, or one moved to another space, takes the first free spot of the 4-column grid.
- Ids are internal (`tbl_07`, space slugs such as `barra-alta`); the public identity is the table `number`, assigned as the highest number ever used plus one, so deleted numbers are never reused.
- QR tokens are 10 random alphanumeric characters (`node:crypto`), unique across every credential ever issued. Regenerating revokes the active credential with the next audit number (`QR-119` after `QR-118`); disabling keeps the credential (paused); deleting the table revokes it and keeps the row, so its token and number never come back. `issuedBy` is the signed-in staff member.
- `version` is display and audit only (no optimistic concurrency): editing the form always bumps it; enable/disable, layout and regenerate bump it when something changes.
- The seed creates the admin mock configuration (3 spaces, 12 tables with their fixed QR tokens, Mesa 07's audited rotation) only when there is no table configuration yet; its credentials are issued by the seeded owner.
- The seed also creates the admin mock menu (9 categories, 13 products, the coffees' "Tamaño" and "Extras" option groups) only when the catalog has no categories or products, so it never overwrites admin edits; ids are deterministic (`prd_cappuccino`, `opg_cappuccino_tamano`, `opt_cappuccino_tamano_mediano`).

## Orders (staff orders board)

`src/modules/orders` holds orders and their lifecycle for the admin orders board and "Cargar pedido". Every route uses `SessionGuard` (any staff role) and answers `Order` (or a list of them). Lines are priced through the catalog's exported `ResolveOrderableProducts`; tables are checked through the tables module's exported `FindTableByNumber`.

| Endpoint                         | Auth  | Body → response |
| -------------------------------- | ----- | --------------- |
| `POST /orders`                   | staff | `{ tableNumber, customerName?, note?, lines: [{ productId, quantity, optionIds?, note? }] }` → `201 Order`; `400 invalid_order`, `409 table_disabled \| product_not_orderable` |
| `GET /orders?date=YYYY-MM-DD&status=` | staff | `200 Order[]` of the service day (today by default), oldest first |
| `GET /orders/:orderId`           | staff | `200 Order`; `404 order_not_found` |
| `POST /orders/:orderId/advance`  | staff | `200 Order` one step forward; `409 invalid_transition` |
| `POST /orders/:orderId/cancel`   | staff | `{ reason: "product_unavailable" \| "customer_request" \| "order_error" }` → `200 Order`; `409 invalid_transition` |

- `Order` is `{ id, number, tableNumber, tableLabel, spaceName, customerName, note, status, cancellationReason, source, createdBy, total, items, events, createdAt, updatedAt }`; `status` is `received`, `preparing`, `delivered` or `cancelled`, `source` is `staff` or `table`; items are `{ id, productId, productName, sku, quantity, unitPrice, subtotal, note, options: [{ groupTitle, optionName, priceDelta }] }` and events `{ kind, at, actor: { id, name } | null }`, oldest first.
- Pricing: only published, available, non-archived products (`409 product_not_orderable` with `productId` and `reason: archived | draft | unavailable`). Chosen options must belong to the product; a required group without a choice takes its default option, or fails; single groups take one option, multiple groups up to their `max`. `unitPrice` = price + option deltas; `total` = Σ unitPrice × quantity.
- Limits: 1 to 50 lines, integer quantities 1 to 99, customer name up to 40 characters (`Mesa 07` when blank), order and item notes up to 140; item notes only for products with `allowCustomerNotes`. `400` issues are `{ path, code, groupId? }` (`unknown_table`, `unknown_product`, `unknown_option`, `duplicate_option`, `missing_required_group`, `too_many_options`, `not_allowed`, `too_long`, `out_of_range`, `required`, `too_many`). An unknown table is a `400` issue; a disabled one is `409 table_disabled`.
- Lifecycle: `received → preparing → delivered`, one step at a time; cancel only from `received` or `preparing`. Each transition appends an event with the staff member and time; transitions are conditional on the stored status, so concurrent clicks cannot both win.
- Orders keep a snapshot of the table, products, options and prices: `productId` is not a foreign key, so catalog changes never alter history. Visible numbers start at 1001 (the migration restarts the sequence).
- The service day runs from local midnight to midnight in `America/Argentina/Buenos_Aires` (`SERVICE_TIME_ZONE` in `orders/domain/service-day.ts`). The venue profile has a `timezone`, but the venue module exports no service yet; switch to it once it does.

## Notes

- The project is ESM (`"type": "module"`, `nodenext`): relative imports use the `.js` extension.
- Tests compile with SWC (`unplugin-swc`) because Nest dependency injection needs decorator metadata.
- `overrides.multer` pins a patched multer until `@nestjs/platform-express` ships it.
