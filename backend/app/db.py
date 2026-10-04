import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Connection, Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "command-center.db"
DATABASE_URL = os.environ.get("PCC_DATABASE_URL", f"sqlite:///{DEFAULT_DB.as_posix()}")


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite:///") and ":memory:" not in url:
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    result = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(result, "connect")
    def foreign_keys(connection: object, _: object) -> None:
        from sqlite3 import Connection as SQLiteConnection

        assert isinstance(connection, SQLiteConnection)
        # Let SQLAlchemy start real transactions for reads as well as writes.
        # This gives multi-table exports a consistent SQLite snapshot.
        connection.isolation_level = None
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA busy_timeout=5000")

    @event.listens_for(result, "begin")
    def begin(connection: Connection) -> None:
        connection.exec_driver_sql("BEGIN")

    return result


engine = make_engine(DATABASE_URL)
SessionLocal = sessionmaker(engine)


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
