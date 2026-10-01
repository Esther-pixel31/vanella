"""Create the first admin account (the admin then creates everyone else).

Run inside the backend container and answer the questions:

    docker compose exec backend python -m app.scripts.create_admin
"""

import getpass
import re
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import ROLE_ADMIN, User
from app.schemas.team import TeamUserCreate
from app.services.team.user_service import create_team_user


def ask(prompt: str, pattern: str, hint: str) -> str:
    while True:
        value = input(prompt).strip()

        if re.fullmatch(pattern, value):
            return value

        print(f"  {hint}")


def main() -> None:
    db = SessionLocal()

    try:
        existing = db.scalars(select(User).where(User.role == ROLE_ADMIN)).all()

        if existing:
            print("Admins already exist:")
            for admin in existing:
                print(f"  - {admin.full_name} ({admin.phone_number})")

            if input("Create another admin anyway? [y/N] ").strip().lower() != "y":
                return

        full_name = ask("Full name: ", r".{2,150}", "Enter at least 2 characters.")
        phone = ask(
            "Phone number (e.g. 254712345678): ",
            r"254[17]\d{8}",
            "Use 254 followed by 9 digits, no + or spaces.",
        )
        username = ask(
            "Username (letters, numbers, . _ -): ",
            r"[A-Za-z0-9._-]{3,50}",
            "3 to 50 characters: letters, numbers, '.', '_' or '-'.",
        ).lower()

        while True:
            password = getpass.getpass("Password (at least 8 characters): ")

            if len(password) < 8:
                print("  Too short.")
                continue

            if getpass.getpass("Repeat password: ") != password:
                print("  The passwords did not match.")
                continue

            break

        admin = create_team_user(
            db,
            TeamUserCreate(
                full_name=full_name,
                phone_number=phone,
                role=ROLE_ADMIN,
                username=username,
                password=password,
            ),
        )

        print(f"Admin created: {admin.full_name} (username: {admin.username})")

    except ValueError as error:
        print(f"Could not create the admin: {error}")
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
