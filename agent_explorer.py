#!/usr/bin/env python3
"""Autonomous Arbor UI explorer.

Attaches to (or starts) the Vite CAD editor at http://localhost:1420,
walks every major page, tab, menu, and toolbar, captures a screenshot at
each step under test_screenshots/, and writes a JSON + Markdown findings
report. Run with:

    .venv-explorer/bin/python agent_explorer.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import (
    Locator,
    Page,
    TimeoutError as PlaywrightTimeout,
    sync_playwright,
)

ROOT = Path(__file__).resolve().parent
SCREENSHOT_DIR = ROOT / "test_screenshots"
REPORT_JSON = SCREENSHOT_DIR / "report.json"
REPORT_MD = SCREENSHOT_DIR / "REPORT.md"
BASE_URL = "http://localhost:1420"
VIEWPORT = {"width": 1440, "height": 900}

SAMPLE_DOCUMENTS = [
    ("Bracket Plate", "part"),
    ("Drive Assembly", "assembly"),
    ("Housing A Drawing", "drawing"),
    ("Shaft Collar", "part"),
    ("PCB Frame", "part"),
    ("Bracket CAM Studio", "cam"),
    ("Bracket Simulation Studio", "simulation"),
    ("Bracket Render Studio", "render"),
    ("Main Board PCB Studio", "pcb"),
]

SIDEBAR_SECTIONS = ["Folders", "Labels", "Filters", "Trash", "Integrations"]

CREATE_ITEMS = [
    "Part Studio",
    "Assembly",
    "Drawing",
    "CAM Studio",
    "Simulation Studio",
    "Render Studio",
    "PCB Studio",
    "Folder",
]

DOCUMENT_MENU_SAFE = [
    "New Part Studio",
    "New Assembly",
    "New Drawing",
    "New CAM Studio",
    "New Simulation Studio",
    "New Render Studio",
    "New PCB Studio",
    "Load sample data",
    "Open…",
    "Save",
    "Save As…",
    "Export STEP…",
    "Document properties",
    "Preferences…",
]

CAMERA_MENU_ITEMS = [
    "Isometric",
    "Dimetric",
    "Trimetric",
    "Perspective",
    "Orient Normal to Sketch Plane",
    "Fit to Model",
]

RENDER_MENU_ITEMS = [
    "Shaded",
    "Unshaded",
    "Translucent",
    "Visible",
    "Removed",
    "Phantom",
    "View in High Quality",
    "Highlight Boundary Edges",
]

DISPLAY_MENU_ITEMS = [
    "Hide / Show",
    "Isolate",
    "Make Transparent",
    "Section View",
]

SKIP_GENERIC = {
    "×",
    "Close",
    "Close document",
    "Documents",
    "Workspaces",
    "← Workspaces",
    "Close preferences",
    "Close menus",
    "Close analysis panel",
    "Close AR panel",
}


@dataclass
class Finding:
    severity: str  # P0 P1 P2 P3
    category: str
    title: str
    detail: str
    step: str
    screenshot: str | None = None


@dataclass
class StepRecord:
    index: int
    name: str
    screenshot: str
    url: str
    notes: list[str] = field(default_factory=list)


class Explorer:
    def __init__(self, page: Page) -> None:
        self.page = page
        self.step_index = 0
        self.steps: list[StepRecord] = []
        self.findings: list[Finding] = []
        self.console_errors: list[dict[str, Any]] = []
        self.page_errors: list[str] = []
        self.failed_requests: list[str] = []
        self.clicked: set[str] = set()
        self._kinds_fully_toured: set[str] = set()
        self._logged_state_loss = False
        self._sample_ever_loaded = False

        page.on("console", self._on_console)
        page.on("pageerror", self._on_pageerror)
        page.on("requestfailed", self._on_requestfailed)
        page.set_default_timeout(5000)
        page.set_default_navigation_timeout(15000)

    def _on_console(self, msg: Any) -> None:
        if msg.type in {"error", "warning"}:
            text = msg.text
            # Vite HMR noise is not a product defect.
            if "vite" in text.lower() and "hmr" in text.lower():
                return
            self.console_errors.append({"type": msg.type, "text": text[:500]})
            if msg.type == "error":
                self.finding(
                    "P1",
                    "runtime",
                    "Console error",
                    text[:400],
                )

    def _on_pageerror(self, err: Any) -> None:
        text = str(err)
        self.page_errors.append(text[:500])
        self.finding("P0", "crash", "Uncaught page exception", text[:400])

    def _on_requestfailed(self, req: Any) -> None:
        url = req.url
        if any(skip in url for skip in ("fonts.googleapis", "fonts.gstatic")):
            return
        failure = ""
        try:
            failure = req.failure or ""
        except Exception:
            pass
        self.failed_requests.append(f"{req.method} {url} {failure}"[:300])

    def finding(
        self,
        severity: str,
        category: str,
        title: str,
        detail: str,
        screenshot: str | None = None,
    ) -> None:
        step = self.steps[-1].name if self.steps else "pre-start"
        shot = screenshot or (self.steps[-1].screenshot if self.steps else None)
        # Dedup identical titles at the same step.
        key = (severity, title, step)
        if any((f.severity, f.title, f.step) == key for f in self.findings):
            return
        self.findings.append(
            Finding(severity, category, title, detail, step, shot)
        )

    def slug(self, name: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()
        return cleaned[:80] or "step"

    def shot(self, name: str, notes: list[str] | None = None) -> Path:
        self.step_index += 1
        filename = f"{self.step_index:03d}_{self.slug(name)}.png"
        path = SCREENSHOT_DIR / filename
        self.page.screenshot(path=str(path), full_page=False)
        record = StepRecord(
            index=self.step_index,
            name=name,
            screenshot=filename,
            url=self.page.url,
            notes=notes or [],
        )
        self.steps.append(record)
        self.audit_visual(name)
        return path

    def wait(self, ms: int = 250) -> None:
        self.page.wait_for_timeout(ms)

    def escape(self) -> None:
        self.page.keyboard.press("Escape")
        self.wait(80)

    def visible(self, locator: Locator, timeout: int = 2500) -> bool:
        try:
            locator.first.wait_for(state="visible", timeout=timeout)
            return True
        except PlaywrightTimeout:
            return False

    def click_first(
        self,
        locator: Locator,
        label: str,
        *,
        timeout: int = 2500,
        force: bool = False,
        optional: bool = False,
    ) -> bool:
        if not self.visible(locator, timeout=timeout):
            if not optional:
                self.finding(
                    "P2",
                    "navigation",
                    f"Missing control: {label}",
                    "Expected a visible control but Playwright could not find it.",
                )
            return False
        try:
            locator.first.click(timeout=timeout, force=force)
            self.clicked.add(label)
            self.wait(180)
            return True
        except Exception as exc:
            if not optional:
                self.finding(
                    "P1",
                    "interaction",
                    f"Click failed: {label}",
                    str(exc)[:300],
                )
            return False

    def click_role(
        self,
        role: str,
        name: str,
        *,
        exact: bool = True,
        timeout: int = 2500,
    ) -> bool:
        return self.click_first(
            self.page.get_by_role(role, name=name, exact=exact),
            f"{role}:{name}",
            timeout=timeout,
        )

    def click_text_button(
        self,
        name: str | re.Pattern[str],
        *,
        exact: bool = True,
        optional: bool = False,
    ) -> bool:
        loc = self.page.get_by_role("button", name=name, exact=exact)
        label = name if isinstance(name, str) else name.pattern
        if optional and not loc.count():
            return False
        return self.click_first(
            loc,
            f"button:{label}",
            optional=optional,
        )

    def surface(self) -> str:
        if self.page.locator("[data-explorer='workspaces-page']").count():
            return "workspaces"
        if self.page.locator("[data-explorer='documents-page']").count():
            return "documents"
        if self.page.locator("[data-explorer='workspace']").count():
            return "workspace"
        if self.page.get_by_text("Versions", exact=True).count():
            return "pdm"
        return "unknown"

    def audit_visual(self, step_name: str) -> None:
        try:
            result = self.page.evaluate(
                """() => {
                  const issues = [];
                  const vw = window.innerWidth;
                  const vh = window.innerHeight;
                  const toolbar = document.querySelector('[data-explorer="toolbar"]');
                  if (toolbar) {
                    const r = toolbar.getBoundingClientRect();
                    if (r.height > 88) {
                      issues.push({
                        type: 'toolbar-wrap',
                        detail: `Toolbar height ${Math.round(r.height)}px at ${vw}x${vh}`
                      });
                    }
                    if (toolbar.scrollWidth > toolbar.clientWidth + 8) {
                      issues.push({
                        type: 'toolbar-overflow',
                        detail: `scrollWidth ${toolbar.scrollWidth} > clientWidth ${toolbar.clientWidth}`
                      });
                    }
                    const disabled = [...toolbar.querySelectorAll('button[disabled], button[aria-disabled="true"]')];
                    if (disabled.length) {
                      issues.push({
                        type: 'disabled-tools',
                        detail: disabled.map(b => (b.getAttribute('title') || b.textContent || '').trim()).filter(Boolean).slice(0, 40).join(', ')
                      });
                    }
                  }
                  const root = document.getElementById('root');
                  if (root && (root.scrollWidth > vw + 4)) {
                    issues.push({
                      type: 'horizontal-overflow',
                      detail: `root.scrollWidth ${root.scrollWidth} vs viewport ${vw}`
                    });
                  }
                  const canvases = [...document.querySelectorAll('canvas')].map(c => ({
                    w: Math.round(c.getBoundingClientRect().width),
                    h: Math.round(c.getBoundingClientRect().height)
                  }));
                  const tree = document.querySelector('[data-explorer="tree-panel"]');
                  const originListed = !!(tree && /Origin/.test(tree.textContent || ''));
                  const planesListed = !!(tree && /Planes/.test(tree.textContent || ''));
                  const bodyText = document.body.innerText || '';
                  if (/Something went wrong|is not defined|Cannot read|ChunkLoadError/i.test(bodyText)) {
                    issues.push({ type: 'crash-copy', detail: bodyText.slice(0, 240) });
                  }
                  return {
                    issues,
                    canvases,
                    originListed,
                    planesListed,
                    toolbarHeight: toolbar ? Math.round(toolbar.getBoundingClientRect().height) : 0,
                    surface: document.querySelector('[data-explorer="documents-page"]')
                      ? 'documents'
                      : document.querySelector('[data-explorer="workspace"]')
                        ? 'workspace'
                        : 'other',
                    title: document.title,
                    h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null
                  };
                }"""
            )
        except Exception as exc:
            self.finding("P2", "layout", "Visual audit failed", str(exc)[:200])
            return

        for issue in result.get("issues") or []:
            kind = issue.get("type")
            detail = issue.get("detail") or ""
            if kind == "toolbar-wrap":
                self.finding(
                    "P1",
                    "layout",
                    "Toolbar wraps into multiple rows",
                    detail,
                )
            elif kind == "toolbar-overflow":
                self.finding(
                    "P1",
                    "layout",
                    "Toolbar overflows its strip",
                    detail,
                )
            elif kind == "disabled-tools":
                self.finding(
                    "P2",
                    "tools",
                    "Visible toolbar tools are disabled / unimplemented",
                    detail,
                )
            elif kind == "horizontal-overflow":
                self.finding(
                    "P1",
                    "layout",
                    "Horizontal page overflow",
                    detail,
                )
            elif kind == "crash-copy":
                self.finding("P0", "crash", "Crash or error copy on screen", detail)

    def go_home(self) -> None:
        if self.surface() == "documents":
            return
        if self.click_text_button("Documents", optional=True):
            self.wait(250)
            if self.surface() == "documents":
                return
        if self.click_text_button("← Workspaces", optional=True):
            self.wait(250)
        if self.surface() in {"documents", "workspaces"}:
            return
        self.page.goto(BASE_URL, wait_until="domcontentloaded")
        self.wait(300)

    def show_all_folders(self) -> None:
        self.click_text_button("Folders", optional=True)
        self.wait(80)
        root = self.page.get_by_role("button", name=re.compile(r"Workspace"))
        if root.count():
            self.click_first(root, "folder:Workspace", optional=True, force=True)

    def clear_listing_filters(self) -> None:
        search = self.page.get_by_placeholder("Search…")
        if search.count():
            try:
                search.fill("")
            except Exception:
                pass
        clear = self.page.get_by_role("button", name=re.compile(r"^Clear all$"))
        if clear.count():
            self.click_first(clear, "Clear all", optional=True, force=True)
            self.wait(120)
        # Deselect leftover sidebar labels/filters if Clear all was hidden.
        if self.click_text_button("Labels", optional=True):
            for label in ("WIP", "Released", "Critical", "Aluminum", "Plastic"):
                chip = self.page.get_by_role("button", name=label, exact=True)
                if chip.count() and "●" in (chip.first.inner_text() or ""):
                    self.click_first(chip, f"label-off:{label}", optional=True)
        if self.click_text_button("Filters", optional=True):
            for name in (
                "Owned by me",
                "Modified this week",
                "Parts only",
                "Assemblies only",
            ):
                loc = self.page.get_by_role("button", name=name, exact=True)
                if loc.count():
                    cls = loc.first.get_attribute("class") or ""
                    if "bg-active" in cls:
                        self.click_first(loc, f"filter-off:{name}", optional=True)
        self.show_all_folders()

    def ensure_sample(self) -> bool:
        """Load sample workspaces, then open Drive System documents."""
        if self.surface() == "workspace":
            self.go_home()
        self.wait(150)

        if self.surface() == "workspaces":
            cards = self.page.locator("[data-explorer-workspace]")
            if cards.count() == 0:
                load = self.page.locator("[data-explorer='load-sample']")
                if not load.count():
                    load = self.page.get_by_role(
                        "button", name="Load sample workspaces"
                    )
                if load.count():
                    self.click_first(load, "Load sample workspaces")
                    self.wait(350)
            drive = self.page.locator("[data-explorer-workspace='ws-drive']")
            card = drive if drive.count() else self.page.locator(
                "[data-explorer-workspace]"
            )
            if card.count():
                self.click_first(card, "Open Drive System workspace")
                self.wait(300)

        self.clear_listing_filters()
        if self.page.locator("[data-explorer-doc]").count() > 0:
            self._sample_ever_loaded = True
            self.show_all_folders()
            return True

        body = self.page.inner_text("body")
        truly_empty = "No documents yet" in body
        previously_loaded = self._sample_ever_loaded

        if not truly_empty and "· sample" in body:
            self.clear_listing_filters()
            self.show_all_folders()
            if self.page.locator("[data-explorer-doc]").count() > 0:
                self._sample_ever_loaded = True
                return True

        if truly_empty and previously_loaded and not self._logged_state_loss:
            self._logged_state_loss = True
            self.finding(
                "P0",
                "ia",
                "Documents state is discarded on navigation",
                "Opening a studio, Versions, or Releases unmounts DocumentsPage. "
                "Sample files, created documents, and folder selection reset to empty. "
                "A workspace must own this catalog, not a page that disappears.",
            )

        empty = self.page.get_by_role("button", name="Load sample workspace")
        if empty.count():
            self.click_first(empty, "Load sample workspace (empty state)")
            self.wait(350)
        else:
            more = self.page.locator("[data-explorer='more-menu']")
            if self.click_first(more, "More menu"):
                item = self.page.get_by_role(
                    "menuitem", name="Load sample workspace"
                )
                if item.count():
                    self.click_first(item, "Load sample workspace")
                    self.wait(350)
                else:
                    self.escape()

        if self.page.locator("[data-explorer-doc]").count() > 0:
            self._sample_ever_loaded = True
            self.show_all_folders()
            return True
        self.finding(
            "P0",
            "navigation",
            "Failed to load sample workspace",
            "No data-explorer-doc rows after Load sample workspaces.",
        )
        return False

    def open_create_menu(self) -> None:
        loc = self.page.locator("[data-explorer='create-menu']")
        if loc.count():
            self.click_first(loc, "Create menu")
        else:
            self.click_text_button("Create")

    def tour_empty_dashboard(self) -> None:
        self.page.goto(BASE_URL, wait_until="networkidle")
        self.wait(400)
        self.shot("01 empty workspaces dashboard")

        body = self.page.inner_text("body")
        if self.surface() != "workspaces":
            self.finding(
                "P1",
                "ia",
                "Home is not a workspaces dashboard",
                "Expected data-explorer=workspaces-page with workspace cards.",
            )
        if "No documents yet" in body and self.surface() == "documents":
            self.finding(
                "P2",
                "ia",
                "Empty home is a document list, not a workspace dashboard",
                "Onshape-style IA would show workspaces as cards; "
                "Arbor currently starts on an empty Documents table.",
            )

        load = self.page.locator("[data-explorer='load-sample']")
        if load.count():
            self.click_first(load, "Load sample workspaces")
            self.wait(300)
            self.shot("01b sample workspace cards")

        drive = self.page.locator("[data-explorer-workspace='ws-drive']")
        if drive.count():
            self.click_first(drive, "Open Drive System")
            self.wait(300)
            self.shot("01c drive system documents")

        self.open_create_menu()
        self.shot("02 create menu open")
        self.escape()

        for section in SIDEBAR_SECTIONS:
            if self.click_text_button(section):
                self.shot(f"03 sidebar {section}")

        if self.click_text_button("Folders"):
            self.wait(80)

        units = self.page.get_by_role("button", name="Default units", exact=False)
        if self.click_first(units, "Default units"):
            self.shot("04 units panel")
            for unit in ("in", "m", "ft", "mm"):
                if not self.page.get_by_role("button", name=unit, exact=True).count():
                    self.click_first(units, "Default units reopen", optional=True)
                self.click_text_button(unit, optional=True)
            self.shot("05 units mm restored")

        prefs = self.page.get_by_role("button", name="Open preferences")
        if self.click_first(prefs, "Open preferences"):
            self.shot("06 preferences dark")
            dialog = self.page.get_by_role("dialog")
            if dialog.get_by_role("button", name=re.compile(r"Light")).count():
                dialog.get_by_role("button", name=re.compile(r"Light")).click()
                self.wait(250)
                self.shot("07 preferences light")
            if dialog.get_by_role("button", name=re.compile(r"System")).count():
                dialog.get_by_role("button", name=re.compile(r"System")).click()
                self.wait(150)
            if dialog.get_by_role("button", name=re.compile(r"Dark")).count():
                dialog.get_by_role("button", name=re.compile(r"Dark")).click()
                self.wait(250)
                self.shot("08 preferences dark restored")
            self.click_first(
                self.page.get_by_role("button", name="Close preferences"),
                "Close preferences",
            )

        more = self.page.locator("[data-explorer='more-menu']")
        if self.click_first(more, "More menu"):
            self.shot("09 more menu")
            # Peek Versions / Releases without leaving yet.
            self.escape()

    def load_sample_workspace(self) -> None:
        self.ensure_sample()
        self.wait(200)
        self.shot("10 sample workspace loaded")

        for section in SIDEBAR_SECTIONS:
            if self.click_text_button(section):
                self.shot(f"11 sample sidebar {section}")
        self.click_text_button("Folders")

        # Folder tree nodes
        for folder in (
            "Workspace",
            "Mechanical",
            "Electronics Enclosures",
            "Prototypes",
            "Release Candidates",
        ):
            loc = self.page.get_by_role("button", name=folder, exact=True)
            if loc.count():
                self.click_first(loc, f"folder:{folder}")
                self.shot(f"12 folder {folder}")

        more = self.page.locator("[data-explorer='more-menu']")
        if self.click_first(more, "More menu"):
            if self.page.get_by_role(
                "menuitem", name="Switch to structure view"
            ).count():
                self.click_first(
                    self.page.get_by_role(
                        "menuitem", name="Switch to structure view"
                    ),
                    "Switch to structure view",
                )
                self.shot("13 structure view")
            else:
                self.escape()

        if self.click_first(more, "More menu"):
            if self.page.get_by_role("menuitem", name="Switch to list view").count():
                self.click_first(
                    self.page.get_by_role("menuitem", name="Switch to list view"),
                    "Switch to list view",
                )
                self.shot("14 list view")
            else:
                self.escape()

        if self.click_first(more, "More menu"):
            if self.page.get_by_role("menuitem", name="Advanced search").count():
                self.click_first(
                    self.page.get_by_role("menuitem", name="Advanced search"),
                    "Advanced search",
                )
                self.shot("15 advanced search")
                self.page.get_by_placeholder("Search…").fill("Bracket")
                self.wait(150)
                self.shot("16 search bracket")
                self.page.get_by_placeholder("Search…").fill("")
                if self.click_text_button("Clear all"):
                    self.wait(80)
            else:
                self.escape()

        if self.click_text_button("Labels"):
            for label in ("WIP", "Released", "Critical"):
                loc = self.page.get_by_role("button", name=label, exact=True)
                if loc.count():
                    self.click_first(loc, f"label:{label}")
                    self.shot(f"17 label {label}")
                    if loc.count():
                        loc.first.click(timeout=1500)
                        self.wait(80)
        self.click_text_button("Folders", optional=True)
        self.show_all_folders()
        self.shot("19 all documents in workspace root")

    def tour_create_items(self) -> None:
        """Open Create and screenshot each item without committing to a studio."""
        self.go_home()
        self.open_create_menu()
        self.shot("18 create menu with sample loaded")
        self.escape()

    def open_document(self, title: str) -> bool:
        if not self.ensure_sample():
            return False
        self.wait(150)
        row = self.page.locator("[data-explorer-doc]").filter(has_text=title)
        if not row.count():
            row = self.page.get_by_role(
                "button", name=re.compile(rf"Open {re.escape(title)}")
            )
        if not row.count():
            row = self.page.get_by_role("button", name=title, exact=True)
        if not row.count():
            self.finding(
                "P1",
                "navigation",
                f"Could not open document {title}",
                "No row or button matched this sample document after reloading sample.",
            )
            return False
        ok = self.click_first(row, f"open:{title}", timeout=4000)
        self.wait(450)
        return ok

    def click_toolbar_all(self, studio: str) -> None:
        toolbar = self.page.locator("[data-explorer='toolbar']")
        if not toolbar.count():
            self.finding(
                "P1",
                "tools",
                f"No toolbar in {studio}",
                "data-explorer=toolbar was not in the DOM.",
            )
            return
        snapshot = toolbar.locator("button").evaluate_all(
            """els => els.map(b => ({
                name: (b.innerText || b.getAttribute('title') || '').replace(/\\s+/g,' ').trim(),
                disabled: !!(b.disabled || b.getAttribute('aria-disabled') === 'true')
            }))"""
        )
        disabled_names = [
            i["name"] for i in snapshot if i.get("disabled") and i.get("name")
        ]
        for item in snapshot:
            name = item.get("name") or ""
            if not name or name.startswith("Active") or item.get("disabled"):
                continue
            btn = toolbar.get_by_role("button", name=name, exact=True)
            if not btn.count():
                btn = toolbar.get_by_text(name, exact=True)
            try:
                btn.first.click(timeout=2000)
                self.wait(180)
                self.shot(f"{studio} tool {name}")
                closer = self.page.get_by_role("button", name=re.compile(r"^Close"))
                if closer.count() and closer.first.is_visible():
                    label = closer.first.get_attribute("aria-label") or "Close"
                    if "preferences" not in label.lower():
                        try:
                            closer.first.click(timeout=600)
                        except Exception:
                            self.escape()
            except Exception as exc:
                self.finding(
                    "P2",
                    "tools",
                    f"{studio} tool click failed: {name}",
                    str(exc)[:240],
                )
        if disabled_names:
            self.finding(
                "P2",
                "tools",
                f"{studio}: unimplemented tools shown disabled",
                ", ".join(disabled_names),
            )
        self.shot(f"{studio} toolbar complete")

    def tour_document_menu(self, studio: str) -> None:
        menu_btn = self.page.locator("[data-explorer='document-menu']")
        if not menu_btn.count():
            return
        for item in DOCUMENT_MENU_SAFE:
            if not self.click_first(menu_btn, "Document menu"):
                break
            loc = self.page.get_by_role("menuitem", name=item, exact=True)
            if not loc.count():
                self.escape()
                self.finding(
                    "P2",
                    "ia",
                    f"Document menu missing {item}",
                    f"While touring {studio}.",
                )
                continue
            self.click_first(loc, f"menuitem:{item}")
            self.wait(200)
            self.shot(f"{studio} document menu {item}")
            if item == "Preferences…":
                self.click_first(
                    self.page.get_by_role("button", name="Close preferences"),
                    "Close preferences",
                )
            else:
                self.escape()

    def tour_viewport_menus(self, studio: str) -> None:
        if not self.page.get_by_role("button", name="Camera", exact=True).count():
            return
        for item in CAMERA_MENU_ITEMS:
            if not self.click_text_button("Camera"):
                break
            loc = self.page.get_by_role("menuitem", name=item, exact=True)
            if loc.count():
                self.click_first(loc, f"camera:{item}")
                self.wait(200)
                self.shot(f"{studio} camera {item}")
            else:
                self.escape()

        if self.click_text_button("Render"):
            self.shot(f"{studio} render menu")
            # Click first unique items; duplicates (Visible/Removed) exist per section.
            for item in ("Shaded", "Unshaded", "Translucent", "View in High Quality"):
                loc = self.page.get_by_role("menuitem", name=item, exact=True)
                if loc.count():
                    self.click_first(loc, f"render:{item}")
                    self.wait(80)
            self.escape()
            if self.click_text_button("Render"):
                visibles = self.page.get_by_role("menuitem", name="Visible")
                if visibles.count():
                    visibles.first.click()
                    self.wait(80)
                self.escape()

        if self.click_text_button("Display"):
            self.shot(f"{studio} display menu")
            for item in DISPLAY_MENU_ITEMS:
                loc = self.page.get_by_role("menuitem", name=item, exact=False)
                if loc.count():
                    self.click_first(loc, f"display:{item}")
                    self.wait(120)
                    if not self.page.get_by_role(
                        "button", name="Display", exact=True
                    ).count():
                        break
                    self.click_text_button("Display")
            self.escape()

        cube = self.page.locator("canvas").last
        if cube.count():
            box = cube.bounding_box()
            if box and box["width"] <= 160:
                self.page.mouse.click(
                    box["x"] + box["width"] * 0.5,
                    box["y"] + box["height"] * 0.2,
                )
                self.wait(250)
                self.shot(f"{studio} viewcube top")

    def tour_tree(self, studio: str) -> None:
        tree = self.page.locator("[data-explorer='tree-panel']")
        if not tree.count():
            return
        collapse = tree.get_by_role("button", name="Collapse panel")
        if collapse.count():
            self.click_first(collapse, "Collapse panel")
            self.shot(f"{studio} tree collapsed")
            expand = self.page.get_by_role("button", name="Expand panel")
            self.click_first(expand, "Expand panel")
            self.shot(f"{studio} tree expanded")

        for label in ("↻ Regen", "+ Extrude", "+ Fillet", "+ Boolean", "+ Sculpt"):
            loc = tree.get_by_role("button", name=label, exact=True)
            if loc.count():
                self.click_first(loc, f"tree:{label}")
                self.wait(200)
                self.shot(f"{studio} tree {label}")
                closer = self.page.get_by_role("button", name="Close")
                if closer.count() and closer.first.is_visible():
                    try:
                        closer.first.click(timeout=600)
                    except Exception:
                        pass

        # Click first several tree rows / feature names.
        rows = tree.locator("button")
        limit = min(rows.count(), 12)
        for i in range(limit):
            btn = rows.nth(i)
            text = (btn.inner_text() or "").strip()[:40]
            if not text or text in {"«", "»", "↻ Regen"}:
                continue
            try:
                btn.click(timeout=800)
                self.wait(120)
            except Exception:
                continue
        self.shot(f"{studio} tree nodes")

    def tour_sketch_if_present(self, studio: str) -> None:
        canvas = self.page.locator("[data-testid='sketch-canvas']")
        if not canvas.count():
            # Try activating a sketch from the tree.
            sketch = self.page.get_by_role("button", name=re.compile(r"Sketch"))
            if sketch.count():
                try:
                    sketch.first.click(timeout=1000)
                    self.wait(250)
                except Exception:
                    pass
        canvas = self.page.locator("[data-testid='sketch-canvas']")
        if not canvas.count():
            return
        self.shot(f"{studio} sketch canvas")
        for tool in (
            "Line",
            "Center Point Circle",
            "Corner Rectangle",
            "3 Point Arc",
            "Sketch Fillet",
            "Dimension",
            "Coincident",
            "Horizontal",
            "Vertical",
        ):
            loc = self.page.get_by_role("button", name=tool, exact=True)
            if loc.count() and loc.first.is_enabled():
                self.click_first(loc, f"sketch:{tool}")
                self.wait(80)
        self.shot(f"{studio} sketch tools")

        box = canvas.bounding_box()
        if box:
            x0 = box["x"] + box["width"] * 0.35
            y0 = box["y"] + box["height"] * 0.35
            x1 = box["x"] + box["width"] * 0.55
            y1 = box["y"] + box["height"] * 0.55
            self.page.mouse.click(x0, y0)
            self.wait(80)
            self.page.mouse.move(x1, y1)
            self.wait(80)
            self.page.mouse.click(x1, y1)
            self.wait(200)
            self.shot(f"{studio} sketch inference stroke")

    def tour_studio(self, title: str, kind: str) -> None:
        if not self.open_document(title):
            return
        self.shot(f"open {kind} {title}")
        if self.surface() != "workspace":
            self.finding(
                "P0",
                "navigation",
                f"Opening {title} did not enter a studio",
                f"Surface is {self.surface()}.",
            )
            return

        chrome = self.page.inner_text("body")[:1500]
        if "Workspaces" not in chrome:
            self.finding(
                "P2",
                "ia",
                "Studio chrome is missing Workspaces",
                "Opened a studio but the top chrome has no Workspaces control.",
            )

        if kind in self._kinds_fully_toured:
            self.shot(f"{kind} {title} opened (kind already crawled)")
            return

        self.click_toolbar_all(kind)
        self.tour_viewport_menus(kind)
        self.tour_tree(kind)
        self.tour_sketch_if_present(kind)
        self.tour_document_menu(kind)
        self.shot(f"{kind} {title} complete")
        self._kinds_fully_toured.add(kind)

    def tour_tabs(self) -> None:
        """After several opens, remaining tabs should still be in App state
        only while in workspace. Open the last remaining docs then click tabs.
        """
        if self.surface() != "workspace":
            return
        tabs = self.page.locator("[data-explorer='workspace'] button")
        names = []
        for title, _kind in SAMPLE_DOCUMENTS:
            loc = self.page.get_by_role("button", name=title, exact=False)
            if loc.count():
                names.append(title)
                self.click_first(loc, f"tab:{title}")
                self.wait(250)
                self.shot(f"tab switch {title}")
        if not names:
            self.finding(
                "P2",
                "ia",
                "No document tabs to switch",
                "Going back to Documents unmounts AppLayout so tabs are hidden "
                "even though App.tsx still holds them.",
            )

    def tour_pdm(self) -> None:
        self.go_home()
        more = self.page.locator("[data-explorer='more-menu']")
        if self.click_first(more, "More menu"):
            item = self.page.get_by_role("menuitem", name="Versions")
            if item.count():
                self.click_first(item, "Versions")
                self.wait(400)
                self.shot("versions page")
                body = self.page.inner_text("body")
                if "npm run tauri" in body or "Open via" in body:
                    self.finding(
                        "P2",
                        "pdm",
                        "Versions is offline in the web runtime",
                        "PDM requires the Tauri desktop app / .cad_db. Expected for Vite.",
                    )
        if self.click_text_button("Releases"):
            self.wait(300)
            self.shot("releases page")
        if self.click_text_button("← Workspaces") or self.click_text_button(
            "Workspaces"
        ) or self.click_text_button("Documents"):
            self.wait(200)
            self.shot("back from pdm")

    def generic_pass(self, budget: int = 40) -> None:
        """Click remaining unique visible buttons once, skipping destructive ones."""
        clicks = 0
        while clicks < budget:
            buttons = self.page.locator("button:visible")
            progressed = False
            count = min(buttons.count(), 80)
            for i in range(count):
                btn = buttons.nth(i)
                try:
                    text = (btn.inner_text() or btn.get_attribute("aria-label") or "").strip()
                except Exception:
                    continue
                text = re.sub(r"\s+", " ", text)[:60]
                if not text or text in SKIP_GENERIC:
                    continue
                key = f"{self.surface()}::{text}"
                if key in self.clicked:
                    continue
                if btn.get_attribute("disabled") is not None:
                    continue
                try:
                    btn.click(timeout=700)
                    self.clicked.add(key)
                    clicks += 1
                    progressed = True
                    self.wait(140)
                    self.shot(f"generic {text}")
                    self.escape()
                    break
                except Exception:
                    self.clicked.add(key)
                    continue
            if not progressed:
                break

    def run(self) -> None:
        self.tour_empty_dashboard()
        # Load sample and crawl studios BEFORE labels/filters hide the rows.
        self.ensure_sample()
        self.shot("sample loaded for studio crawl")
        for title, kind in SAMPLE_DOCUMENTS:
            try:
                self.tour_studio(title, kind)
            except Exception as exc:
                self.finding(
                    "P0",
                    "crash",
                    f"Explorer crashed in {title}",
                    str(exc)[:400],
                )
                self.shot(f"crash recovery {title}")
                try:
                    self.go_home()
                except Exception:
                    self.page.goto(BASE_URL, wait_until="domcontentloaded")

        self.ensure_sample()
        self.load_sample_workspace()
        self.tour_create_items()

        try:
            if self.open_document("Bracket Plate"):
                self.shot("reopen bracket for tabs")
                self.tour_tabs()
                self.generic_pass(budget=20)
        except Exception as exc:
            self.finding("P1", "navigation", "Tab tour failed", str(exc)[:300])

        self.tour_pdm()
        self.ensure_sample()
        self.shot("final documents dashboard")


def ensure_app_running() -> subprocess.Popen[Any] | None:
    try:
        with urllib.request.urlopen(BASE_URL, timeout=2) as resp:
            if resp.status < 500:
                return None
    except (urllib.error.URLError, TimeoutError, ConnectionError):
        pass
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(60):
        try:
            with urllib.request.urlopen(BASE_URL, timeout=1) as resp:
                if resp.status < 500:
                    return proc
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("Vite dev server did not start on :1420")


def write_reports(explorer: Explorer) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_url": BASE_URL,
        "viewport": VIEWPORT,
        "steps": [asdict(s) for s in explorer.steps],
        "findings": [asdict(f) for f in explorer.findings],
        "console_errors": explorer.console_errors[-50:],
        "page_errors": explorer.page_errors,
        "failed_requests": explorer.failed_requests[:30],
        "clicked_count": len(explorer.clicked),
    }
    REPORT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    by_sev: dict[str, list[Finding]] = {"P0": [], "P1": [], "P2": [], "P3": []}
    for f in explorer.findings:
        by_sev.setdefault(f.severity, []).append(f)

    lines = [
        "# Arbor autonomous explorer report",
        "",
        f"Generated {payload['generated_at']}",
        f"Viewport {VIEWPORT['width']}×{VIEWPORT['height']} at {BASE_URL}",
        f"Steps: {len(explorer.steps)} · Findings: {len(explorer.findings)} · "
        f"Clicks: {len(explorer.clicked)}",
        "",
    ]
    for sev in ("P0", "P1", "P2", "P3"):
        items = by_sev.get(sev) or []
        if not items:
            continue
        lines.append(f"## {sev} ({len(items)})")
        lines.append("")
        for f in items:
            lines.append(f"### {f.title}")
            lines.append(f"- Category: {f.category}")
            lines.append(f"- Step: {f.step}")
            if f.screenshot:
                lines.append(f"- Screenshot: `{f.screenshot}`")
            lines.append(f"- {f.detail}")
            lines.append("")
    lines.append("## Steps")
    lines.append("")
    for s in explorer.steps:
        lines.append(f"- `{s.screenshot}` — {s.name}")
    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    for old in SCREENSHOT_DIR.glob("*.png"):
        old.unlink()
    spawned = ensure_app_running()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
            )
            context = browser.new_context(
                viewport=VIEWPORT,
                device_scale_factor=1,
                color_scheme="dark",
            )
            page = context.new_page()
            explorer = Explorer(page)
            try:
                explorer.run()
            except Exception as exc:
                explorer.finding("P0", "crash", "Explorer aborted", str(exc)[:400])
                try:
                    explorer.shot("aborted")
                except Exception:
                    pass
            write_reports(explorer)
            context.close()
            browser.close()
            print(f"Wrote {len(explorer.steps)} screenshots to {SCREENSHOT_DIR}")
            print(f"Findings: {len(explorer.findings)} → {REPORT_MD}")
            p0 = sum(1 for f in explorer.findings if f.severity == "P0")
            return 1 if p0 else 0
    finally:
        if spawned is not None:
            spawned.terminate()


if __name__ == "__main__":
    sys.exit(main())
