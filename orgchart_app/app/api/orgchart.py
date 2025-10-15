from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass
from flask import Blueprint, jsonify, request
from sqlalchemy import select
from ..database import db
from ..models import Person, Organization, ProjectAssignment


bp = Blueprint("orgchart", __name__, url_prefix="/api/orgchart")


@dataclass
class OrgNode:
    id: int
    name: str
    title: str | None
    children: list["OrgNode"]


@bp.get("/<int:organization_id>")
def get_org_chart(organization_id: int):
    """Return a tree suitable for D3 hierarchy layouts."""
    org = db.session.get(Organization, organization_id)
    if not org:
        return jsonify({"error": "org_not_found"}), 404

    project_id = request.args.get("project_id", type=int)

    people_query = select(Person).where(Person.organization_id == organization_id)
    if project_id:
        assigned_person_ids = db.session.scalars(
            select(ProjectAssignment.person_id).where(ProjectAssignment.project_id == project_id)
        ).all()
        # Include managers of assigned people to preserve chain of command
        people = db.session.scalars(people_query).all()
        allowed_ids = set(assigned_person_ids)
        id_to_person = {p.id: p for p in people}
        for pid in list(assigned_person_ids):
            cur = id_to_person.get(pid)
            while cur and cur.reports_to_id and cur.reports_to_id not in allowed_ids:
                allowed_ids.add(cur.reports_to_id)
                cur = id_to_person.get(cur.reports_to_id)
        people = [p for p in people if p.id in allowed_ids]
    else:
        people = db.session.scalars(people_query).all()

    by_manager: dict[int | None, list[Person]] = defaultdict(list)
    for p in people:
        by_manager[p.reports_to_id].append(p)

    def build(manager_id: int | None) -> list[OrgNode]:
        nodes: list[OrgNode] = []
        for p in sorted(by_manager.get(manager_id, []), key=lambda x: (x.title or "", x.full_name)):
            nodes.append(
                OrgNode(
                    id=p.id,
                    name=p.full_name,
                    title=p.title,
                    children=build(p.id),
                )
            )
        return nodes

    # Roots are those without a manager
    roots = build(None)

    def to_dict(node: OrgNode) -> dict:
        return {
            "id": node.id,
            "name": node.name,
            "title": node.title,
            "is_epc_contact": db.session.get(Person, node.id).is_epc_contact,
            "children": [to_dict(c) for c in node.children],
        }

    return jsonify({
        "organization": {"id": org.id, "name": org.name},
        "tree": [to_dict(r) for r in roots],
    })


@bp.get("/<int:organization_id>/flat")
def get_org_flat(organization_id: int):
    people = db.session.scalars(select(Person).where(Person.organization_id == organization_id)).all()
    return jsonify([
        {
            "id": p.id,
            "name": p.full_name,
            "title": p.title,
            "reports_to_id": p.reports_to_id,
        }
        for p in people
    ])
