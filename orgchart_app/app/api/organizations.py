from __future__ import annotations
from flask import Blueprint, request, jsonify
from sqlalchemy import select
from ..database import db
from ..models import Organization, Department


bp = Blueprint("organizations", __name__, url_prefix="/api/organizations")


@bp.get("")
def list_organizations():
    orgs = db.session.scalars(select(Organization).order_by(Organization.name)).all()
    return jsonify([serialize_org(o) for o in orgs])


@bp.post("")
def create_organization():
    data = request.get_json(force=True)
    org = Organization(
        name=data["name"],
        sector=data.get("sector"),
        subsector=data.get("subsector"),
        domain=data.get("domain"),
        country=data.get("country"),
        description=data.get("description"),
    )
    db.session.add(org)
    db.session.commit()
    return jsonify(serialize_org(org)), 201


@bp.get("/<int:org_id>")
def get_organization(org_id: int):
    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "not_found"}), 404
    return jsonify(serialize_org(org))


@bp.patch("/<int:org_id>")
def update_organization(org_id: int):
    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(force=True)
    for field in ["name", "sector", "subsector", "domain", "country", "description"]:
        if field in data:
            setattr(org, field, data[field])
    db.session.commit()
    return jsonify(serialize_org(org))


@bp.delete("/<int:org_id>")
def delete_organization(org_id: int):
    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "not_found"}), 404
    db.session.delete(org)
    db.session.commit()
    return ("", 204)


@bp.post("/<int:org_id>/departments")
def create_department(org_id: int):
    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "org_not_found"}), 404
    data = request.get_json(force=True)
    dept = Department(organization_id=org.id, name=data["name"])
    db.session.add(dept)
    db.session.commit()
    return jsonify({"id": dept.id, "name": dept.name}), 201


def serialize_org(o: Organization) -> dict:
    return {
        "id": o.id,
        "name": o.name,
        "sector": o.sector,
        "subsector": o.subsector,
        "domain": o.domain,
        "country": o.country,
        "description": o.description,
    }
