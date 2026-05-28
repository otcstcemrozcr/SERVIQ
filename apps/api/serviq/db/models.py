"""SQLAlchemy declarative base for SERVIQ models.

Concrete tables live in `serviq.models` (field service domain) and extend `Base`.
"""
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
