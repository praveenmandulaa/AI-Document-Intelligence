
from sqlalchemy import text

from app.db.session import engine


with engine.connect() as connection:
    result = connection.execute(
        text("SELECT current_database(), version()")
    )

    database_name, version = result.one()

    print("Database:", database_name)
    print("PostgreSQL:", version.split(",")[0])
    print("Connection successful!")
