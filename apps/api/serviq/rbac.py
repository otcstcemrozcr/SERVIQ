"""Role-Based Access Control: roles, organization store, require_role dependency factory."""
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from enum import IntEnum

from fastapi import Depends, Header, HTTPException, status

from .auth import UserContext, require_current_user

_SERVICE_USER_ID = os.environ.get("OPENOPS_SERVICE_USER_ID", "service")


# ---------------------------------------------------------------------------
# Role hierarchy
# ---------------------------------------------------------------------------

class Role(IntEnum):
    VIEWER = 1
    ANALYST = 2
    OWNER = 3

    def label(self) -> str:
        return self.name.lower()

    @classmethod
    def from_str(cls, s: str) -> "Role":
        try:
            return cls[s.upper()]
        except KeyError:
            raise ValueError(f"Unknown role {s!r}. Valid: viewer, analyst, owner")


@dataclass(frozen=True)
class OrgContext:
    user_id: str
    org_id: str
    role: Role


# ---------------------------------------------------------------------------
# In-memory org + membership store (Supabase tables in production)
# ---------------------------------------------------------------------------

@dataclass
class _OrgRecord:
    org_id: str
    name: str


@dataclass
class _MemberRecord:
    user_id: str
    org_id: str
    role: Role


_orgs: dict[str, _OrgRecord] = {}
_members: dict[tuple[str, str], _MemberRecord] = {}  # (user_id, org_id)


def create_org(name: str, owner_user_id: str) -> str:
    """Create an org, add owner, return org_id."""
    org_id = str(uuid.uuid4())
    _orgs[org_id] = _OrgRecord(org_id=org_id, name=name)
    add_member(owner_user_id, org_id, Role.OWNER)
    return org_id


def add_member(user_id: str, org_id: str, role: Role) -> None:
    _members[(user_id, org_id)] = _MemberRecord(user_id=user_id, org_id=org_id, role=role)


def get_membership(user_id: str, org_id: str) -> _MemberRecord | None:
    return _members.get((user_id, org_id))


def _clear() -> None:
    """Test helper — wipe org + member state."""
    _orgs.clear()
    _members.clear()


# ---------------------------------------------------------------------------
# Dependency factory
# ---------------------------------------------------------------------------

def require_role(min_role: Role):
    """FastAPI dependency factory.

    Resolves auth first (401 on bad token), then validates X-Org-ID (422 if
    missing), then checks role (403 if insufficient).  Returns OrgContext.
    """
    def _dep(
        user: UserContext = Depends(require_current_user),
        x_org_id: str | None = Header(None, alias="X-Org-ID"),
    ) -> OrgContext:
        if x_org_id is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "X-Org-ID header is required.",
            )

        # API key / service account gets owner-level access to any org.
        if user.user_id == _SERVICE_USER_ID:
            return OrgContext(user_id=user.user_id, org_id=x_org_id, role=Role.OWNER)

        membership = get_membership(user.user_id, x_org_id)
        if membership is None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You are not a member of this organization.",
            )
        if membership.role < min_role:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"This action requires the '{min_role.label()}' role or higher. "
                f"Your current role is '{membership.role.label()}'.",
            )
        return OrgContext(user_id=user.user_id, org_id=x_org_id, role=membership.role)

    return _dep
