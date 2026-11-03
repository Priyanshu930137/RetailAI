"""Copy the local RetailAI SQLite database to a completely empty Neon database.

Set DATABASE_URL to the Neon connection string before running this script. It
refuses a non-Postgres target or a target containing any existing RetailAI rows.
"""
from __future__ import annotations

from sqlalchemy import create_engine, inspect, select, text

from app.database import DATABASE_PATH, DATABASE_URL, engine as target_engine
from app.models import Base


def migrate() -> int:
    if target_engine.dialect.name != "postgresql":
        raise SystemExit("DATABASE_URL must point to Neon/Postgres; no data was copied.")
    if not DATABASE_PATH.exists():
        raise SystemExit(f"SQLite source file not found: {DATABASE_PATH}")

    source_engine = create_engine(f"sqlite:///{DATABASE_PATH.as_posix()}")
    Base.metadata.create_all(bind=target_engine)
    source_tables = set(inspect(source_engine).get_table_names())
    tables = [table for table in Base.metadata.sorted_tables if table.name in source_tables]
    copied = 0
    try:
        with target_engine.begin() as target:
            for table in tables:
                if target.execute(select(table.c[0]).select_from(table).limit(1)).first():
                    raise SystemExit(f"Target table '{table.name}' is not empty; migration stopped before copying.")
            with source_engine.connect() as source:
                for table in tables:
                    source_columns = {column["name"] for column in inspect(source_engine).get_columns(table.name)}
                    columns = [column for column in table.columns if column.name in source_columns]
                    query = select(*[table.c[column.name] for column in columns])
                    rows = source.execute(query).mappings().all()
                    if rows:
                        target_rows = []
                        for row in rows:
                            values = dict(row)
                            # SQLite's historical additive migrations left some old
                            # created_at values NULL; use target defaults for those.
                            for column in table.columns:
                                if not column.nullable and values.get(column.name) is None and (column.default or column.server_default):
                                    values.pop(column.name, None)
                            target_rows.append(values)
                        target.execute(table.insert(), target_rows)
                        copied += len(target_rows)
            # Keep generated IDs above the copied range for future inserts.
            for table in tables:
                if "id" not in table.c:
                    continue
                table_name = target_engine.dialect.identifier_preparer.quote(table.name)
                target.execute(text(
                    "SELECT setval(pg_get_serial_sequence(:table_name, 'id'), "
                    f"GREATEST(COALESCE((SELECT MAX(id) FROM {table_name}), 1), 1), "
                    f"COALESCE((SELECT MAX(id) FROM {table_name}), 0) > 0)"
                ), {"table_name": table.name})
    finally:
        source_engine.dispose()
    return copied


if __name__ == "__main__":
    print(f"Target: {DATABASE_URL.split('@')[-1].split('?')[0]}")
    print(f"Rows copied: {migrate()}")
