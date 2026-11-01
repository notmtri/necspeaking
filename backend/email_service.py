"""Account email (address verification, password reset) through Resend.

Resend is called over its HTTP API with the httpx client the app already
installs. Plain SMTP (e.g. sending through Gmail) is not an option: Render's
free plan blocks outbound SMTP ports 25, 465 and 587. So mail is sent from the
necspeaking.com domain and replies go to the site's Gmail inbox.

Configuration, all on the Render service:

    RESEND_API_KEY   from resend.com -> API Keys. Unset = email is off.
    EMAIL_FROM       default "necs. <no-reply@necspeaking.com>"; the domain
                     must be verified in Resend.
    EMAIL_REPLY_TO   where replies go, default necspeaking@gmail.com.
    PUBLIC_SITE_URL  where links point, e.g. https://www.necspeaking.com

With no key the features that need email say so instead of pretending to
send. Outside production the message is printed so links can be followed
locally; in production it is not, since a printed reset link would let
anyone who can read the logs take over the account.
"""
import os

import httpx


RESEND_URL = 'https://api.resend.com/emails'
SEND_TIMEOUT_SECONDS = 10
DEFAULT_FROM = 'necs. <no-reply@necspeaking.com>'
DEFAULT_REPLY_TO = 'necspeaking@gmail.com'


def email_enabled():
    return bool(os.getenv('RESEND_API_KEY', '').strip())


def _is_production():
    return os.getenv('PRODUCTION', '').strip().lower() == 'true'


def public_site_url():
    configured = os.getenv('PUBLIC_SITE_URL', '').strip().rstrip('/')
    if configured:
        return configured
    return 'https://www.necspeaking.com' if _is_production() else 'http://localhost:3000'


def send_email(to, subject, text):
    """Send a plain-text email; returns True only if Resend accepted it."""
    api_key = os.getenv('RESEND_API_KEY', '').strip()
    if not api_key:
        if not _is_production():
            print(f"[EMAIL] RESEND_API_KEY unset; not sent. To: {to} | {subject}" + chr(10) + text)
        return False

    try:
        response = httpx.post(
            RESEND_URL,
            headers={'Authorization': f'Bearer {api_key}'},
            json={
                'from': os.getenv('EMAIL_FROM', '').strip() or DEFAULT_FROM,
                'to': [to],
                'reply_to': os.getenv('EMAIL_REPLY_TO', '').strip() or DEFAULT_REPLY_TO,
                'subject': subject,
                'text': text,
            },
            timeout=SEND_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        print(f"[EMAIL] Send failed: {type(error).__name__}: {error}")
        return False

    if response.status_code >= 400:
        # Resend's error body names the problem (unverified domain, bad key)
        # and never echoes the key back.
        print(f"[EMAIL] Resend rejected the message ({response.status_code}): {response.text[:300]}")
        return False
    return True


def verification_email(name, link):
    return (
        'Confirm your email for necs.',
        f"Hi {name or 'there'},\n\n"
        "Confirm this is your email address so you can reset your password if you forget it:\n\n"
        f"{link}\n\n"
        "The link works for 3 days. If you didn't create a necs. account, ignore this email.\n"
        "Questions? Just reply to this email.\n\n"
        "necs. - NEC speaking practice\n",
    )


def password_reset_email(name, link):
    return (
        'Reset your necs. password',
        f"Hi {name or 'there'},\n\n"
        "Someone asked to reset the password for your necs. account. To choose a new one, open:\n\n"
        f"{link}\n\n"
        "The link works for 1 hour and only once. If it wasn't you, ignore this email; "
        "your password stays the same.\n\n"
        "necs. - NEC speaking practice\n",
    )
