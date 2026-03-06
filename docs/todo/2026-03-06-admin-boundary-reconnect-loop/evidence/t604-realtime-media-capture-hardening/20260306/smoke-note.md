# T604 Smoke Note (2026-03-06)

## Scope

- camera preview/capture no longer re-requests microphone audio
- session video semantics clarified as supplementary

## Evidence

- `npm --prefix webapp run lint`
- `npm --prefix webapp run build`

## Code-path review

- camera activation now uses `getUserMedia({ video: { facingMode }, audio: false })`.
- transcription audio remains owned by `RecorderManager` microphone capture.
- session video MIME candidates were aligned to video-only recording.
- realtime/detail copy now states that session video is supplementary and transcription uses the dedicated microphone audio.

## Notes

- This turn verifies the contract in code and build gates.
- Browser/device-specific camera smoke should still be repeated after deployment on a real mobile browser.
