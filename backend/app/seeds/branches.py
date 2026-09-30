from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.branch import Branch


# PLACEHOLDER COORDINATES: these are the approximate centres of the Bamburi
# and Mombasa CBD areas, NOT the real shop positions. Replace them with each
# shop's actual map pin, then re-run this seed. They are only used to pick
# the branch nearest to the customer.
BRANCHES = [
    {
        "name": "Bamburi",
        "location": "Bamburi, Mombasa",
        "latitude": -3.9990,
        "longitude": 39.7180,
    },
    {
        "name": "Mombasa Town CBD",
        "location": "Mombasa CBD, Mombasa",
        "latitude": -4.0620,
        "longitude": 39.6720,
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
                # Keep coordinates in step with this file on re-runs.
                existing_branch.latitude = branch_data["latitude"]
                existing_branch.longitude = branch_data["longitude"]
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