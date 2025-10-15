from __future__ import annotations
from flask import Blueprint, request, jsonify
from sqlalchemy import select
from ..database import db
from ..models import Person, Organization, Department


bp = Blueprint("people", __name__, url_prefix="/api/people")


@bp.get("")
def list_people():
    org_id = request.args.get("organization_id", type=int)
    email = request.args.get("email")
    query = select(Person)
    if org_id:
        query = query.where(Person.organization_id == org_id)
    if email:
        query = query.where(Person.email == email)
    people = db.session.scalars(query.order_by(Person.full_name)).all()
    return jsonify([serialize_person(p) for p in people])


@bp.post("")
def create_person():
    data = request.get_json(force=True)
    org = db.session.get(Organization, data["organization_id"])  # validate
    if not org:
        return jsonify({"error": "org_not_found"}), 404

    department_id = data.get("department_id")
    if department_id:
        dept = db.session.get(Department, department_id)
        if not dept or dept.organization_id != org.id:
            return jsonify({"error": "invalid_department"}), 400

    manager_id = data.get("reports_to_id")
    if manager_id:
        manager = db.session.get(Person, manager_id)
        if not manager or manager.organization_id != org.id:
            return jsonify({"error": "invalid_manager"}), 400

    person = Person(
        organization_id=org.id,
        department_id=department_id,
        full_name=data["full_name"],
        title=data.get("title"),
        email=data.get("email"),
        phone=data.get("phone"),
        location=data.get("location"),
        is_epc_contact=bool(data.get("is_epc_contact", False)),
        source=data.get("source", "manual"),
        reports_to_id=manager_id,
    )
    db.session.add(person)
    db.session.commit()
    return jsonify(serialize_person(person)), 201


@bp.get("/<int:person_id>")
def get_person(person_id: int):
    person = db.session.get(Person, person_id)
    if not person:
        return jsonify({"error": "not_found"}), 404
    return jsonify(serialize_person(person))


@bp.patch("/<int:person_id>")
def update_person(person_id: int):
    person = db.session.get(Person, person_id)
    if not person:
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(force=True)

    if "department_id" in data and data["department_id"] is not None:
        dept = db.session.get(Department, data["department_id"])
        if not dept or dept.organization_id != person.organization_id:
            return jsonify({"error": "invalid_department"}), 400

    if "reports_to_id" in data and data["reports_to_id"] is not None:
        manager = db.session.get(Person, data["reports_to_id"])
        if not manager or manager.organization_id != person.organization_id:
            return jsonify({"error": "invalid_manager"}), 400

    for field in [
        "department_id",
        "full_name",
        "title",
        "email",
        "phone",
        "location",
        "is_epc_contact",
        "source",
        "reports_to_id",
    ]:
        if field in data:
            setattr(person, field, data[field])

    db.session.commit()
    return jsonify(serialize_person(person))


@bp.delete("/<int:person_id>")
def delete_person(person_id: int):
    person = db.session.get(Person, person_id)
    if not person:
        return jsonify({"error": "not_found"}), 404
    db.session.delete(person)
    db.session.commit()
    return ("", 204)


def serialize_person(p: Person) -> dict:
    return {
        "id": p.id,
        "organization_id": p.organization_id,
        "department_id": p.department_id,
        "full_name": p.full_name,
        "title": p.title,
        "email": p.email,
        "phone": p.phone,
        "location": p.location,
        "is_epc_contact": p.is_epc_contact,
        "source": p.source,
        "reports_to_id": p.reports_to_id,
    }
