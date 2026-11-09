
from sqlalchemy import text
from app.database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), version()")
        )

        row = result.fetchone()

        print("DATABASE CONNECTION SUCCESSFUL!")
        print("Database:", row[0])
        print("PostgreSQL Version:", row[1])

except Exception as error:
    print("DATABASE CONNECTION FAILED!")
    print("Error:", error)
