from __future__ import annotations
import csv
import io
from typing import Any
from flask import Blueprint, request, jsonify
from ..database import db
from ..models import Organization, Department, Person


bp = Blueprint("imports", __name__, url_prefix="/api/imports")


@bp.post("/people-csv")
def import_people_csv():
    """
    Expected CSV headers:
    organization,name,title,email,phone,location,department,manager_email,is_epc_contact
    """
    if "file" not in request.files:
        return jsonify({"error": "no_file"}), 400

    file = request.files["file"]
    text = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    created: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for idx, row in enumerate(reader, start=2):  # data starts at line 2
        try:
            org_name = row.get("organization")
            if not org_name:
                raise ValueError("missing organization")
            org = Organization.query.filter_by(name=org_name).first()
            if not org:
                org = Organization(name=org_name)
                db.session.add(org)
                db.session.flush()

            dept_name = (row.get("department") or "").strip() or None
            dept_id = None
            if dept_name:
                dept = Department.query.filter_by(organization_id=org.id, name=dept_name).first()
                if not dept:
                    dept = Department(organization_id=org.id, name=dept_name)
                    db.session.add(dept)
                    db.session.flush()
                dept_id = dept.id

            manager_email = (row.get("manager_email") or "").strip() or None
            manager_id = None
            if manager_email:
                manager = Person.query.filter_by(organization_id=org.id, email=manager_email).first()
                if manager:
                    manager_id = manager.id

            person = Person(
                organization_id=org.id,
                department_id=dept_id,
                full_name=row.get("name") or "",
                title=row.get("title"),
                email=row.get("email"),
                phone=row.get("phone"),
                location=row.get("location"),
                is_epc_contact=row.get("is_epc_contact", "").strip().lower() in {"true", "1", "yes", "y"},
                source="csv",
                reports_to_id=manager_id,
            )
            db.session.add(person)
            db.session.flush()
            created.append({"row": idx, "id": person.id, "email": person.email})
        except Exception as exc:  # noqa: BLE001
            errors.append({"row": idx, "error": str(exc)})

    db.session.commit()
    return jsonify({"created": created, "errors": errors})
