from sqlalchemy import text
from db.models import Base
from db.session import engine

def init_db():
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully.")

if __name__ == "__main__":
    init_db()