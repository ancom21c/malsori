#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote, urlsplit

from playwright.sync_api import Browser, BrowserContext, Error, Page, sync_playwright


@dataclass
class PageLoadResult:
    path: str
    status: int
    final_path: str
    root_text_length: int
    page_errors: list[str]
    console_errors: list[str]


def _rect_overlap(a: Dict[str, float], b: Dict[str, float]) -> bool:
    return not (
        a["x"] + a["width"] <= b["x"]
        or b["x"] + b["width"] <= a["x"]
        or a["y"] + a["height"] <= b["y"]
        or b["y"] + b["height"] <= a["y"]
    )


def _open_page(
    browser: Browser,
    base_url: str,
    path: str,
    *,
    mobile: bool = False,
) -> tuple[Page, PageLoadResult]:
    if mobile:
        context = browser.new_context(
            viewport={"width": 412, "height": 915},
            user_agent=(
                "Mozilla/5.0 (Linux; Android 14; Pixel 7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Mobile Safari/537.36"
            ),
        )
    else:
        context = browser.new_context(
            viewport={"width": 1366, "height": 900},
        )
    return _open_page_in_context(context, base_url, path)


def _open_page_in_context(
    context: BrowserContext,
    base_url: str,
    path: str,
) -> tuple[Page, PageLoadResult]:
    page = context.new_page()
    page_errors: list[str] = []
    console_errors: list[str] = []

    page.on("pageerror", lambda error: page_errors.append(str(error)))

    def on_console(msg: Any) -> None:
        if msg.type == "error":
            console_errors.append(msg.text)

    page.on("console", on_console)

    response = page.goto(f"{base_url}{path}", wait_until="networkidle", timeout=60_000)
    page.wait_for_timeout(900)
    root_text = page.locator("#root").inner_text().strip()

    result = PageLoadResult(
        path=path,
        status=response.status if response is not None else 0,
        final_path=urlsplit(page.url).path,
        root_text_length=len(root_text),
        page_errors=page_errors,
        console_errors=console_errors,
    )
    return page, result


def _assert_page_health(result: PageLoadResult, *, min_root_text_length: int = 40) -> None:
    if result.status != 200:
        raise RuntimeError(f"{result.path}: expected HTTP 200, got {result.status}")
    if result.root_text_length < min_root_text_length:
        raise RuntimeError(
            f"{result.path}: root text too short ({result.root_text_length}), possible blank screen"
        )
    if result.page_errors:
        raise RuntimeError(f"{result.path}: pageerror detected: {result.page_errors[0]}")
    if result.console_errors:
        raise RuntimeError(f"{result.path}: console error detected: {result.console_errors[0]}")


def _assert_detail_empty_state(page: Page, result: PageLoadResult) -> Dict[str, Any]:
    _assert_page_health(result, min_root_text_length=10)
    alert_count = page.locator('[role="alert"]').count()
    if alert_count < 1:
        raise RuntimeError(f"{result.path}: detail empty-state alert was not found")
    return {
        "mode": "empty",
        "status": result.status,
        "final_path": result.final_path,
        "root_text_length": result.root_text_length,
        "page_error_count": len(result.page_errors),
        "console_error_count": len(result.console_errors),
        "alert_count": alert_count,
    }


def _assert_detail_ready_state(
    page: Page,
    result: PageLoadResult,
    *,
    session_artifacts_mode: str = "hidden",
) -> Dict[str, Any]:
    _assert_page_health(result, min_root_text_length=80)
    card_count = page.locator(".MuiCard-root").count()
    if card_count < 3:
        raise RuntimeError(
            f"{result.path}: expected >=3 cards in detail workspace, got {card_count}"
        )
    root_text = page.locator("#root").inner_text()
    has_session_workspace = "Session Workspace" in root_text
    has_ask_transcript = "Ask transcript" in root_text

    if session_artifacts_mode == "visible":
        if not has_session_workspace:
            raise RuntimeError(
                f"{result.path}: expected session artifact rail to be visible, but 'Session Workspace' text was not found"
            )
        if not has_ask_transcript:
            raise RuntimeError(
                f"{result.path}: expected artifact shell to expose 'Ask transcript' prompt"
            )
    elif session_artifacts_mode == "hidden" and has_session_workspace:
        raise RuntimeError(
            f"{result.path}: expected session artifact rail to stay hidden, but 'Session Workspace' text was found"
        )

    return {
        "mode": "ready",
        "status": result.status,
        "final_path": result.final_path,
        "root_text_length": result.root_text_length,
        "page_error_count": len(result.page_errors),
        "console_error_count": len(result.console_errors),
        "card_count": card_count,
        "session_artifacts_mode": session_artifacts_mode,
        "has_session_workspace": has_session_workspace,
        "has_ask_transcript": has_ask_transcript,
    }


def _assert_translate_route(page: Page, result: PageLoadResult, mode: str) -> Dict[str, Any]:
    _assert_page_health(result, min_root_text_length=40)

    if mode == "redirect":
        if result.final_path != "/capture/realtime":
            raise RuntimeError(
                f"{result.path}: expected translate route redirect to /capture/realtime, got {result.final_path}"
            )
        return {
            "mode": "redirect",
            "status": result.status,
            "final_path": result.final_path,
            "root_text_length": result.root_text_length,
            "page_error_count": len(result.page_errors),
            "console_error_count": len(result.console_errors),
        }

    if mode == "enabled":
        heading_count = page.get_by_role("heading", name="Real-time Translate").count()
        if heading_count < 1:
            raise RuntimeError(f"{result.path}: translate heading was not found")
        return {
            "mode": "enabled",
            "status": result.status,
            "final_path": result.final_path,
            "root_text_length": result.root_text_length,
            "page_error_count": len(result.page_errors),
            "console_error_count": len(result.console_errors),
        }

    return {
        "mode": "skipped",
        "status": result.status,
        "final_path": result.final_path,
        "root_text_length": result.root_text_length,
        "page_error_count": len(result.page_errors),
        "console_error_count": len(result.console_errors),
    }


def _assert_route_redirect(
    result: PageLoadResult,
    *,
    expected_path: str,
    label: str,
) -> Dict[str, Any]:
    _assert_page_health(result, min_root_text_length=40)
    if result.final_path != expected_path:
        raise RuntimeError(
            f"{result.path}: expected {label} redirect to {expected_path}, got {result.final_path}"
        )
    return {
        "mode": "redirect",
        "status": result.status,
        "final_path": result.final_path,
        "root_text_length": result.root_text_length,
        "page_error_count": len(result.page_errors),
        "console_error_count": len(result.console_errors),
    }


def _seed_detail_ready_fixture(page: Page, transcription_id: str) -> None:
    payload = {
        "transcriptionId": transcription_id,
        "segmentId1": f"{transcription_id}-seg-1",
        "segmentId2": f"{transcription_id}-seg-2",
        "nowIso": "2026-03-05T00:00:00.000Z",
    }
    page.evaluate(
        """
        async (seed) => {
          const stores = [
            ["transcriptions", "id", ["createdAt", "kind", "status", "isCloudSynced"]],
            ["segments", "id", ["transcriptionId", "startMs"]],
            ["audioChunks", "id", ["transcriptionId", "chunkIndex"]],
            ["videoChunks", "id", ["transcriptionId", "chunkIndex"]],
            ["presets", "id", ["type", "isDefault"]],
            ["settings", "key", []],
            ["backendEndpoints", "id", ["deployment", "isDefault", "createdAt"]],
            ["searchIndexes", "transcriptionId", []],
          ];

          const openDb = () =>
            new Promise((resolve, reject) => {
              const request = window.indexedDB.open("rtzr-stt-webapp", 80);
              request.onupgradeneeded = () => {
                const db = request.result;
                for (const [name, keyPath, indexes] of stores) {
                  if (!db.objectStoreNames.contains(name)) {
                    const store = db.createObjectStore(name, { keyPath });
                    for (const indexName of indexes) {
                      store.createIndex(indexName, indexName, { unique: false });
                    }
                  }
                }
              };
              request.onsuccess = () => resolve(request.result);
              request.onerror = () =>
                reject(request.error || new Error("failed to open indexeddb"));
            });

          const db = await openDb();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(
              ["transcriptions", "segments", "searchIndexes"],
              "readwrite"
            );
            const transcriptions = tx.objectStore("transcriptions");
            const segments = tx.objectStore("segments");
            const searchIndexes = tx.objectStore("searchIndexes");

            transcriptions.delete(seed.transcriptionId);
            segments.delete(seed.segmentId1);
            segments.delete(seed.segmentId2);
            searchIndexes.delete(seed.transcriptionId);

            transcriptions.put({
              id: seed.transcriptionId,
              title: "Smoke Detail Ready Fixture",
              kind: "file",
              status: "completed",
              createdAt: seed.nowIso,
              updatedAt: seed.nowIso,
              transcriptText: "fixture transcript first line\\nfixture transcript second line",
              searchTitle: "smoke detail ready fixture",
              searchTranscript:
                "fixture transcript first line fixture transcript second line",
              modelName: "sommers",
              durationMs: 3200,
              isCloudSynced: false,
              downloadStatus: "not_downloaded",
            });

            segments.put({
              id: seed.segmentId1,
              transcriptionId: seed.transcriptionId,
              spk: "1",
              speaker_label: "Speaker 1",
              language: "ko",
              startMs: 0,
              endMs: 1700,
              text: "fixture transcript first line",
              correctedText: "fixture transcript first line",
              isFinal: true,
              hasTiming: true,
              words: [
                { text: "fixture", startMs: 0, endMs: 400, confidence: 0.99 },
                { text: "transcript", startMs: 420, endMs: 1100, confidence: 0.99 },
                { text: "first", startMs: 1120, endMs: 1350, confidence: 0.99 },
                { text: "line", startMs: 1360, endMs: 1700, confidence: 0.99 },
              ],
              createdAt: seed.nowIso,
            });

            segments.put({
              id: seed.segmentId2,
              transcriptionId: seed.transcriptionId,
              spk: "2",
              speaker_label: "Speaker 2",
              language: "ko",
              startMs: 1800,
              endMs: 3200,
              text: "fixture transcript second line",
              correctedText: "",
              isFinal: true,
              hasTiming: true,
              words: [
                { text: "fixture", startMs: 1800, endMs: 2100, confidence: 0.98 },
                { text: "transcript", startMs: 2120, endMs: 2600, confidence: 0.98 },
                { text: "second", startMs: 2620, endMs: 2920, confidence: 0.98 },
                { text: "line", startMs: 2940, endMs: 3200, confidence: 0.98 },
              ],
              createdAt: seed.nowIso,
            });

            searchIndexes.put({
              transcriptionId: seed.transcriptionId,
              normalizedTranscript:
                "fixture transcript first line fixture transcript second line",
              tokenSet: ["fixture", "transcript", "first", "line", "second"],
              ngramSet: ["fixture transcript", "transcript first", "transcript second"],
              updatedAt: seed.nowIso,
            });

            tx.oncomplete = () => resolve(null);
            tx.onerror = () =>
              reject(tx.error || new Error("failed to seed detail fixture"));
            tx.onabort = () =>
              reject(tx.error || new Error("seeding transaction aborted"));
          });
          db.close();
        }
        """,
        payload,
    )


def _check_mobile_overlap(page: Page) -> Dict[str, Any]:
    geometry = page.evaluate(
        """
        () => {
          const toRect = (rect) => ({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });

          const quickFab = document.querySelector('.MuiSpeedDial-fab');
          const quickFabRect = quickFab ? toRect(quickFab.getBoundingClientRect()) : null;

          let stickyRect = null;
          const nodes = Array.from(document.querySelectorAll('*'));
          for (const node of nodes) {
            const style = window.getComputedStyle(node);
            if (style.position !== 'sticky') continue;
            const rect = node.getBoundingClientRect();
            const buttonCount = node.querySelectorAll('button,a,[role="button"]').length;
            if (
              buttonCount >= 2 &&
              rect.width > 140 &&
              rect.height > 36 &&
              rect.bottom > window.innerHeight - 220
            ) {
              stickyRect = {
                ...toRect(rect),
                buttonCount,
              };
              break;
            }
          }

          return {
            quickFabRect,
            stickyRect,
          };
        }
        """
    )

    quick_fab_rect = geometry.get("quickFabRect")
    sticky_rect = geometry.get("stickyRect")
    result: Dict[str, Any] = {
        "quick_fab_found": quick_fab_rect is not None,
        "sticky_cta_found": sticky_rect is not None,
        "overlap": None,
    }
    if quick_fab_rect is None or sticky_rect is None:
        result["skipped_reason"] = "missing_quick_fab_or_sticky_cta"
        return result

    overlap = _rect_overlap(quick_fab_rect, sticky_rect)
    result["overlap"] = overlap
    return result


def run(
    base_url: str,
    screenshot_dir: Path,
    detail_id: str | None = None,
    translate_route_mode: str = "redirect",
    session_artifacts_mode: str = "hidden",
) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "base_url": base_url,
        "desktop_routes": {},
        "mobile": {},
        "checks": {},
    }
    detail_empty_path = "/transcriptions/smoke-detail-empty"
    detail_empty_session_path = "/sessions/smoke-detail-empty"
    detail_ready_id = detail_id or "smoke-detail-ready"
    detail_ready_path = f"/transcriptions/{quote(detail_ready_id, safe='')}"
    detail_ready_session_path = f"/sessions/{quote(detail_ready_id, safe='')}"
    summary["checks"]["detail_smoke_mode"] = (
        "empty+ready(external-id)" if detail_id else "empty+ready(seed-indexeddb)"
    )
    screenshot_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            desktop_context = browser.new_context(
                viewport={"width": 1366, "height": 900},
            )
            try:
                seed_page, seed_result = _open_page_in_context(desktop_context, base_url, "/")
                try:
                    _assert_page_health(seed_result, min_root_text_length=40)
                    _seed_detail_ready_fixture(seed_page, detail_ready_id)
                finally:
                    seed_page.close()

                desktop_paths = [
                    "/",
                    "/sessions",
                    "/settings",
                    "/realtime",
                    "/capture",
                    "/capture/realtime",
                    "/capture/file",
                    "/translate",
                    detail_empty_path,
                    detail_empty_session_path,
                    detail_ready_path,
                    detail_ready_session_path,
                ]
                for path in desktop_paths:
                    page, result = _open_page_in_context(desktop_context, base_url, path)
                    try:
                        if path == detail_empty_path:
                            summary["desktop_routes"][path] = _assert_detail_empty_state(
                                page, result
                            )
                        elif path == detail_empty_session_path:
                            summary["desktop_routes"][path] = _assert_detail_empty_state(
                                page, result
                            )
                        elif path == detail_ready_path:
                            summary["desktop_routes"][path] = _assert_detail_ready_state(
                                page,
                                result,
                                session_artifacts_mode=session_artifacts_mode,
                            )
                        elif path == detail_ready_session_path:
                            summary["desktop_routes"][path] = _assert_detail_ready_state(
                                page,
                                result,
                                session_artifacts_mode=session_artifacts_mode,
                            )
                        elif path == "/capture":
                            summary["desktop_routes"][path] = _assert_route_redirect(
                                result,
                                expected_path="/capture/realtime",
                                label="capture hub",
                            )
                        elif path == "/translate":
                            summary["desktop_routes"][path] = _assert_translate_route(
                                page, result, translate_route_mode
                            )
                        else:
                            _assert_page_health(result, min_root_text_length=40)
                            summary["desktop_routes"][path] = {
                                "status": result.status,
                                "final_path": result.final_path,
                                "root_text_length": result.root_text_length,
                                "page_error_count": len(result.page_errors),
                                "console_error_count": len(result.console_errors),
                            }
                        if path == "/realtime":
                            clicked = page.evaluate(
                                """
                                () => {
                                  const buttons = Array.from(
                                    document.querySelectorAll('button[aria-label]')
                                  );
                                  const candidate = buttons.find((button) => {
                                    const label = button.getAttribute('aria-label') || '';
                                    return /(open|열기|開く)/i.test(label) &&
                                           /(settings|설정|設定)/i.test(label);
                                  });
                                  if (!candidate) return false;
                                  candidate.click();
                                  return true;
                                }
                                """
                            )
                            page.wait_for_timeout(250)
                            summary["checks"]["realtime_settings_toggle"] = {
                                "clicked": bool(clicked),
                            }
                    finally:
                        shot = screenshot_dir / f"desktop-{path.strip('/').replace('/', '-') or 'root'}.png"
                        page.screenshot(path=str(shot), full_page=True)
                        page.close()
            finally:
                desktop_context.close()

            mobile_page, mobile_result = _open_page(browser, base_url, "/", mobile=True)
            try:
                _assert_page_health(mobile_result)
                overlap_result = _check_mobile_overlap(mobile_page)
                summary["mobile"] = {
                    "status": mobile_result.status,
                    "root_text_length": mobile_result.root_text_length,
                    "page_error_count": len(mobile_result.page_errors),
                    "console_error_count": len(mobile_result.console_errors),
                    **overlap_result,
                }
                if overlap_result.get("overlap") is True:
                    raise RuntimeError("mobile: sticky CTA overlaps Quick Action FAB")
            finally:
                shot = screenshot_dir / "mobile-root.png"
                mobile_page.screenshot(path=str(shot), full_page=True)
                mobile_page.context.close()
        finally:
            browser.close()

    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Post-deploy UI smoke checks for malsori.")
    parser.add_argument(
        "--base-url",
        default="https://malsori.ancom.duckdns.org",
        help="Base URL to verify",
    )
    parser.add_argument(
        "--screenshot-dir",
        default="/tmp/malsori-ui-smoke",
        help="Directory to write screenshots",
    )
    parser.add_argument(
        "--detail-id",
        default="",
        help="Optional transcription id for detail ready-state smoke.",
    )
    parser.add_argument(
        "--translate-route-mode",
        choices=["redirect", "enabled", "skip"],
        default="redirect",
        help="How the smoke should validate /translate.",
    )
    parser.add_argument(
        "--session-artifacts-mode",
        choices=["hidden", "visible", "skip"],
        default="hidden",
        help="How the smoke should validate the additive session artifact rail on detail routes.",
    )
    args = parser.parse_args()

    try:
        detail_id = args.detail_id.strip() or None
        summary = run(
            args.base_url.rstrip("/"),
            Path(args.screenshot_dir),
            detail_id,
            args.translate_route_mode,
            args.session_artifacts_mode,
        )
    except Error as exc:
        print(f"[FAIL] Playwright error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - defensive
        print(f"[FAIL] UI smoke failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"UI smoke checks passed for {args.base_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
