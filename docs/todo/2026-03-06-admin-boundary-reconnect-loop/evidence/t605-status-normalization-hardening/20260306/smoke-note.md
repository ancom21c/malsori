# T605 Smoke Note (2026-03-06)

## Scope

- unknown upstream transcription status normalization
- raw status preservation
- list/detail failure surfacing

## Evidence

- `npm --prefix webapp run test -- rtzrApiClient`
- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`

## Regression coverage

- status polling response with unknown upstream status is promoted to `failed`
- submit response with unknown upstream status is promoted to `failed`
- raw upstream status is preserved in API result for UI/local metadata

## Notes

- This change intentionally prefers visible failure over silent infinite processing.
- Browser smoke is not required here because the contract is covered at API normalization and list/detail rendering layers.
