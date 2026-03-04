#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote

from playwright.sync_api import Browser, Error, Page, sync_playwright


@dataclass
class PageLoadResult:
    path: str
    status: int
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
        "root_text_length": result.root_text_length,
        "page_error_count": len(result.page_errors),
        "console_error_count": len(result.console_errors),
        "alert_count": alert_count,
    }


def _assert_detail_ready_state(page: Page, result: PageLoadResult) -> Dict[str, Any]:
    _assert_page_health(result, min_root_text_length=80)
    alert_count = page.locator('[role="alert"]').count()
    if alert_count > 0:
        raise RuntimeError(f"{result.path}: unexpected alert detected in detail ready-state")
    card_count = page.locator(".MuiCard-root").count()
    if card_count < 3:
        raise RuntimeError(
            f"{result.path}: expected >=3 cards in detail workspace, got {card_count}"
        )
    return {
        "mode": "ready",
        "status": result.status,
        "root_text_length": result.root_text_length,
        "page_error_count": len(result.page_errors),
        "console_error_count": len(result.console_errors),
        "card_count": card_count,
    }


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


def run(base_url: str, screenshot_dir: Path, detail_id: str | None = None) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "base_url": base_url,
        "desktop_routes": {},
        "mobile": {},
        "checks": {},
    }
    detail_empty_path = "/transcriptions/smoke-detail-empty"
    detail_ready_path = (
        f"/transcriptions/{quote(detail_id, safe='')}" if detail_id else None
    )
    summary["checks"]["detail_smoke_mode"] = "empty+ready" if detail_ready_path else "empty-only"
    screenshot_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            desktop_paths = ["/", "/settings", "/realtime", detail_empty_path]
            if detail_ready_path:
                desktop_paths.append(detail_ready_path)
            for path in desktop_paths:
                page, result = _open_page(browser, base_url, path, mobile=False)
                try:
                    if path == detail_empty_path:
                        summary["desktop_routes"][path] = _assert_detail_empty_state(
                            page, result
                        )
                    elif detail_ready_path and path == detail_ready_path:
                        summary["desktop_routes"][path] = _assert_detail_ready_state(
                            page, result
                        )
                    else:
                        _assert_page_health(result, min_root_text_length=40)
                        summary["desktop_routes"][path] = {
                            "status": result.status,
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
                    page.context.close()

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
    args = parser.parse_args()

    try:
        detail_id = args.detail_id.strip() or None
        summary = run(args.base_url.rstrip("/"), Path(args.screenshot_dir), detail_id)
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
