# Studio Console v3 Plan (2026-03-03)

## Scope

Target screens:

- `/` transcription list
- `/realtime` realtime session
- `/settings` settings workspace

Design direction:

- Tier 1: page purpose + live status header
- Tier 2: primary work panel + secondary context panel
- Mobile: single column + sticky action strip

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| `--console-radius-lg` | `16px` | cards, HUD shells |
| `--console-radius-pill` | `999px` | status chips, sticky CTA |
| `--console-gap-1/2/3` | `8px / 12px / 16px` | vertical rhythm |
| `--console-elev-soft` | `0 6px 24px rgba(0,0,0,0.08)` | floating CTA/HUD |
| `--console-state-stable` | success palette | stable latency/status |
| `--console-state-delayed` | warning palette | reconnecting/delayed |
| `--console-state-critical` | error palette | failed/disconnected |

Typography:

- Page title: `h4/h5` with 700 weight
- Section title: `subtitle1` with 700 weight
- Meta text: `body2/caption` with secondary color

## IA Rules

### List

- Tier 1: search/filter summary + quick stats.
- Tier 2 primary: transcription list stream.
- Tier 2 secondary: empty-state action card (desktop), sticky CTA strip (mobile).

### Realtime

- Tier 1: connection HUD (status/latency/action) + session state.
- Tier 2 primary: transcript stream and controls.
- Tier 2 secondary: permission recovery and camera panel.

### Settings

- Tier 1: section navigation and environment status.
- Tier 2 primary: editable forms.
- Tier 2 secondary: operational guidance, admin constraints, import/export tools.

## Component Mapping

| Current file | v3 role | Action |
|---|---|---|
| `webapp/src/pages/TranscriptionListPage.tsx` | List Tier 1/2 shell | keep + restructure sections |
| `webapp/src/pages/RealtimeSessionPage.tsx` | Realtime Tier 1/2 shell | keep + add HUD + panel zoning |
| `webapp/src/pages/SettingsPage.tsx` | Settings Tier 1/2 shell | keep + strengthen admin context |
| `webapp/src/components/TranscriptionView.tsx` | Segment work panel | keep + a11y hardening |
| `webapp/src/components/SegmentWaveformTimeline.tsx` | Detail secondary panel | keep + semantic controls |
| `webapp/src/components/BackendEndpointReadonlyCard.tsx` | Secondary context card | new |

## Rollout Order

1. List page shell and empty-state CTA (low risk, high visibility)
2. Realtime connection HUD and action hierarchy (medium risk, highest value)
3. Settings information density tuning (medium risk, admin-only)

Risk notes:

- Realtime HUD must not duplicate snackbar semantics.
- Mobile sticky CTA must avoid overlap with existing FAB/safe-area.
- Backend admin controls stay internal-network + token gated.

## Wireframes

- Desktop: `docs/ui-proposed/2026-03-03-studio-console-v3/studio-console-v3-desktop.svg`
- Mobile: `docs/ui-proposed/2026-03-03-studio-console-v3/studio-console-v3-mobile.svg`

## Comparison vs Current Screens

| Screen | Current (2026-02 baseline) | v3 proposal | Expected gain | Primary risk |
|---|---|---|---|---|
| List | empty-state CTA is present but context is light | explicit CTA card + mobile sticky strip | faster first action | CTA/FAB overlap on small viewport |
| Realtime | status chips + warning banners are split | unified HUD card with state + action | quicker failure recovery | duplicate signaling with snackbar |
| Settings | dense forms and state info mixed together | tiered layout with explicit guidance blocks | lower cognitive load | vertical scroll growth on mobile |
