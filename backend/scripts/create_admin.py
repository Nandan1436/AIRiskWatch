"""Create an admin account, or promote an existing account to admin.

    python scripts/create_admin.py --email you@example.com --username you
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.security import BCRYPT_MAX_BYTES, hash_password  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.user_model import ROLE_ADMIN, User  # noqa: E402
from app.services.user_service import UserService  # noqa: E402


def _prompt_password() -> str:
    while True:
        password = getpass.getpass("Password: ")
        if len(password) < 8 or len(password.encode("utf-8")) > BCRYPT_MAX_BYTES:
            print(f"Password must be 8 characters to {BCRYPT_MAX_BYTES} bytes.")
            continue
        if password != getpass.getpass("Confirm password: "):
            print("Passwords do not match.")
            continue
        return password


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote an admin account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--username", help="only used when creating a new account")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        users = UserService(db)
        user = users.get_by_email(args.email)
        if user is not None:
            user.role = ROLE_ADMIN
            user.is_active = True
            db.commit()
            print(f"Promoted {user.email} (id={user.id}) to admin.")
            return

        username = args.username or args.email.split("@", 1)[0]
        if users.username_taken(username):
            sys.exit(f"Username '{username}' is already taken; pass --username.")
        user = User(
            email=args.email.lower(),
            username=username,
            password_hash=hash_password(_prompt_password()),
            role=ROLE_ADMIN,
        )
        db.add(user)
        db.commit()
        print(f"Created admin {user.email} (id={user.id}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
