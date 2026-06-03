"""Database session for Supabase/Postgres.

Lazy engine — DATABASE_URL is not required at import time so the scaffold
can be imported and tested without a running database.
"""
from __future__ import annotations

import os
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker


def _normalize_database_url(url: str) -> str:
    normalized = url.strip().strip('"').strip("'")
    if normalized.startswith("postgres://"):
        return "postgresql+psycopg://" + normalized[len("postgres://") :]
    if normalized.startswith("postgresql://"):
        return "postgresql+psycopg://" + normalized[len("postgresql://") :]
    return normalized


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return create_engine(_normalize_database_url(url))


def get_session() -> Session:
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())()
