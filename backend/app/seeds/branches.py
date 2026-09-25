from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.branch import Branch


BRANCHES = [
    {
        "name": "Bamburi",
        "location": "Bamburi, Mombasa",
    },
    {
        "name": "Mombasa Town CBD",
        "location": "Mombasa CBD, Mombasa",
    },
]


def seed_branches():
    db = SessionLocal()

    try:
        for branch_data in BRANCHES:
            existing_branch = db.scalar(
                select(Branch).where(
                    Branch.name == branch_data["name"]
                )
            )

            if existing_branch:
                continue

            branch = Branch(
                **branch_data,
                is_active=True,
            )

            db.add(branch)

        db.commit()

        print("Vanella branches seeded successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_branches()