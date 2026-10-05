import smtplib
import ssl
from collections.abc import Iterator
from contextlib import contextmanager
from email.message import EmailMessage

from app import config

SMTP_TIMEOUT_S = 30


class EmailNotConfiguredError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_FROM)


@contextmanager
def smtp_session() -> Iterator[smtplib.SMTP]:
    """One STARTTLS connection and login, reused for a whole batch."""
    if not is_configured():
        raise EmailNotConfiguredError("SMTP_HOST and SMTP_FROM must be set to send email")
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=SMTP_TIMEOUT_S) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        if config.SMTP_USERNAME:
            smtp.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
        yield smtp


def send_email(smtp: smtplib.SMTP, to: str, subject: str, html: str, text: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = config.SMTP_FROM
    message["To"] = to
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    smtp.send_message(message)
