#!/usr/bin/env python3
"""Arbor email sidecar — send a CAD repository over SMTP.

Credentials come from the environment so they never appear in `ps` output:

  ARBOR_SMTP_HOST, ARBOR_SMTP_PORT, ARBOR_SMTP_USER,
  ARBOR_SMTP_PASS, ARBOR_SMTP_FROM, ARBOR_SMTP_SECURITY

SECURITY is one of: starttls (default), ssl, none.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from pathlib import Path


ENV_HOST = "ARBOR_SMTP_HOST"
ENV_PORT = "ARBOR_SMTP_PORT"
ENV_USER = "ARBOR_SMTP_USER"
ENV_PASS = "ARBOR_SMTP_PASS"
ENV_FROM = "ARBOR_SMTP_FROM"
ENV_SECURITY = "ARBOR_SMTP_SECURITY"

GMAIL_LIMIT_BYTES = 25 * 1024 * 1024


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="mailer",
        description="Send an Arbor workspace (.cad_db or patch) to collaborators.",
    )
    parser.add_argument("--to", required=True, help="Recipient(s), comma-separated")
    parser.add_argument("--subject", required=True, help="Message subject")
    parser.add_argument("--body", required=True, help="Plain-text body")
    parser.add_argument(
        "--attachment",
        action="append",
        default=[],
        help="Path to a .cad_db or patch file (repeatable)",
    )
    parser.add_argument("--from-addr", dest="from_addr", default=None, help="From address")
    parser.add_argument("--host", default=None, help="SMTP host (or ARBOR_SMTP_HOST)")
    parser.add_argument("--port", type=int, default=None, help="SMTP port (or ARBOR_SMTP_PORT)")
    parser.add_argument("--user", default=None, help="SMTP username (or ARBOR_SMTP_USER)")
    parser.add_argument(
        "--password",
        default=None,
        help="SMTP password. Prefer ARBOR_SMTP_PASS so it stays off argv.",
    )
    parser.add_argument(
        "--security",
        choices=("starttls", "ssl", "none"),
        default=None,
        help="Transport security (or ARBOR_SMTP_SECURITY)",
    )
    parser.add_argument(
        "--important",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Mark the message as Important (default: on)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build the message and print JSON; do not connect to SMTP",
    )
    return parser.parse_args(argv)


def split_recipients(raw: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for part in raw.replace(";", ",").split(","):
        addr = part.strip()
        if not addr or addr in seen:
            continue
        if "@" not in addr or addr.startswith("@") or addr.endswith("@"):
            raise ValueError(f"invalid recipient: {addr}")
        seen.add(addr)
        out.append(addr)
    if not out:
        raise ValueError("at least one recipient is required")
    return out


def guess_mime(path: Path) -> tuple[str, str]:
    guessed, _ = mimetypes.guess_type(path.name)
    if guessed:
        main, _, sub = guessed.partition("/")
        if main and sub:
            return main, sub
    suffix = path.suffix.lower()
    if suffix in {".cad_db", ".sqlite", ".db"}:
        return "application", "vnd.sqlite3"
    if suffix in {".patch", ".diff"}:
        return "text", "x-diff"
    return "application", "octet-stream"


def attach_file(msg: EmailMessage, path: Path) -> int:
    if not path.is_file():
        raise FileNotFoundError(f"attachment not found: {path}")
    data = path.read_bytes()
    main, sub = guess_mime(path)
    msg.add_attachment(
        data,
        maintype=main,
        subtype=sub,
        filename=path.name,
    )
    return len(data)


def build_message(
    *,
    to: list[str],
    subject: str,
    body: str,
    from_addr: str,
    attachments: list[Path],
    important: bool,
) -> tuple[EmailMessage, int]:
    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    if important:
        # Gmail, Apple Mail, and Outlook all honor at least one of these.
        msg["Importance"] = "high"
        msg["X-Priority"] = "1 (Highest)"
        msg["X-MSMail-Priority"] = "High"
        msg["Priority"] = "urgent"
    msg["X-Mailer"] = "Arbor CAD"
    msg.set_content(body if body.endswith("\n") else body + "\n")

    total = 0
    for path in attachments:
        total += attach_file(msg, path)
    return msg, total


def resolve_settings(args: argparse.Namespace) -> dict[str, object]:
    host = (args.host or os.environ.get(ENV_HOST) or "").strip()
    port_raw = args.port if args.port is not None else os.environ.get(ENV_PORT, "")
    user = (args.user or os.environ.get(ENV_USER) or "").strip()
    password = args.password if args.password is not None else os.environ.get(ENV_PASS, "")
    from_addr = (args.from_addr or os.environ.get(ENV_FROM) or user).strip()
    security = (
        args.security or os.environ.get(ENV_SECURITY) or "starttls"
    ).strip().lower()
    try:
        port = int(port_raw) if str(port_raw).strip() else (465 if security == "ssl" else 587)
    except ValueError as exc:
        raise ValueError(f"invalid SMTP port: {port_raw}") from exc
    if security not in {"starttls", "ssl", "none"}:
        raise ValueError(f"invalid security: {security}")
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
        "security": security,
    }


def send_message(msg: EmailMessage, settings: dict[str, object], timeout: float = 45.0) -> None:
    host = str(settings["host"])
    port = int(settings["port"])  # type: ignore[arg-type]
    user = str(settings["user"])
    password = str(settings["password"])
    security = str(settings["security"])
    if not host:
        raise ValueError("SMTP host is required")
    if user and not password:
        raise ValueError("SMTP password is required when a username is set")

    context = ssl.create_default_context()
    if security == "ssl":
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
    else:
        smtp = smtplib.SMTP(host, port, timeout=timeout)
        smtp.ehlo()
        if security == "starttls":
            smtp.starttls(context=context)
            smtp.ehlo()
    try:
        if user:
            smtp.login(user, password)
        smtp.send_message(msg)
    finally:
        try:
            smtp.quit()
        except smtplib.SMTPException:
            smtp.close()


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        recipients = split_recipients(args.to)
        settings = resolve_settings(args)
        attachments = [Path(p).expanduser() for p in args.attachment]
        from_addr = str(settings["from_addr"])
        if not from_addr:
            if args.dry_run:
                from_addr = "arbor@localhost"
                settings["from_addr"] = from_addr
            else:
                raise ValueError("From address is required")
        msg, nbytes = build_message(
            to=recipients,
            subject=args.subject,
            body=args.body,
            from_addr=from_addr,
            attachments=attachments,
            important=args.important,
        )
    except (ValueError, FileNotFoundError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    payload = {
        "ok": True,
        "to": recipients,
        "from": from_addr,
        "subject": args.subject,
        "important": bool(args.important),
        "attachments": [str(p) for p in attachments],
        "bytes": nbytes,
        "dryRun": bool(args.dry_run),
    }
    if nbytes > GMAIL_LIMIT_BYTES:
        payload["warning"] = (
            f"attachment is {nbytes} bytes; many providers reject mail over 25 MB"
        )

    if args.dry_run:
        payload["headers"] = {
            key: msg[key] for key in ("From", "To", "Subject", "Importance", "X-Priority") if msg[key]
        }
        print(json.dumps(payload))
        return 0

    try:
        send_message(msg, settings)
    except (smtplib.SMTPException, OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(json.dumps(payload))
    return 0


if __name__ == "__main__":
    sys.exit(main())
