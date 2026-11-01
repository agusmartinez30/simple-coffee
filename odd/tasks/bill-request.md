# bill-request

## Objective
Let guests ask for the bill from Mi mesa (`/table`) and choose how they will pay.

## Why
With ordering centralized on `/table`, closing the account is the last step of the simplified flow.

## Scope
- "Pedir la cuenta" button on `/table`, visible only when the table has at least one order (hidden in the error view).
- Tapping it opens payment options: Efectivo, Transferencia, Débito. Guest picks one and confirms.
- After confirming, the table shows the bill was requested with the chosen method (button replaced by a notice); the guest can change the method.
- State lives in the table session (`billRequest: { method, time } | null`), persisted; storage key bumped to v6. Placing a new order after requesting the bill keeps the request.
- Client-only mock (no api calls), like the rest of `web/`.

## Constraints
- All changes inside `web/`; admin and api untouched.
- UI copy in Spanish; code in English.
- Prior bill flow removed in `86aa8bc` can be used as reference for copy/visual patterns, not restored wholesale.

## Tasks
- [x] T1 Session `billRequest` state + payment method model with tests; bill request button, payment options sheet and requested notice on `/table` (route: delegated, writer trigger: 3+ non-trivial files)

## Checks
- `pnpm --dir web test`
- `pnpm --dir web exec tsc --noEmit`
- `pnpm --dir web lint`
- `pnpm --dir web build`

## Progress
- Branch `feat/bill-request` created.
- T1 done: `PaymentMethod` (`cash | transfer | debit`, labels Efectivo/Transferencia/Débito) in `table-session/payment-method.ts`; session `billRequest` with a `requestBill` action that also changes the method; `parseStoredSession` drops an invalid request and keeps the orders; storage key `v6`. On `/table`: "Pedir la cuenta" in the footer (secondary while "Enviar pedido" is shown, primary otherwise) when the table has orders, no request yet and not in the error view; `PaymentMethodSheet` (modal bottom sheet, Escape/backdrop close, focus moved in and trapped, confirm disabled until a method is chosen); `BillRequestNotice` with time, method and "Cambiar" (hidden offline) that reopens the sheet preselected.
- RED observed: reducer test file failed to import the missing `payment-method` module before implementation.

## Verification (T1)
- `pnpm --dir web test`: 14 files, 100 tests passed.
- `pnpm --dir web exec tsc --noEmit`: no errors.
- `pnpm --dir web lint`: no problems.
- `pnpm --dir web build`: succeeded, `/table` prerendered static.

## Next step
Native review assessment of the T1 commit; then push/PR at the user's decision.
