from __future__ import annotations
from flask import Blueprint, request, jsonify
from sqlalchemy import select
from ..database import db
from ..models import Department, Organization


bp = Blueprint("departments", __name__, url_prefix="/api/departments")


@bp.get("")
def list_departments():
    org_id = request.args.get("organization_id", type=int)
    if not org_id:
        return jsonify({"error": "organization_id_required"}), 400
    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "org_not_found"}), 404
    depts = db.session.scalars(select(Department).where(Department.organization_id == org_id).order_by(Department.name)).all()
    return jsonify([{ "id": d.id, "name": d.name } for d in depts])
