from __future__ import annotations
from flask import Blueprint, request, jsonify
from sqlalchemy import select
from ..database import db
from ..models import Project, ProjectAssignment, Person, Organization


bp = Blueprint("projects", __name__, url_prefix="/api/projects")


@bp.get("")
def list_projects():
    org_id = request.args.get("organization_id", type=int)
    query = select(Project)
    if org_id:
        query = query.where(Project.organization_id == org_id)
    projects = db.session.scalars(query.order_by(Project.name)).all()
    return jsonify([serialize_project(p) for p in projects])


@bp.post("")
def create_project():
    data = request.get_json(force=True)
    org = db.session.get(Organization, data["organization_id"])
    if not org:
        return jsonify({"error": "org_not_found"}), 404
    project = Project(
        organization_id=org.id,
        name=data["name"],
        project_type=data.get("project_type", "project"),
        status=data.get("status"),
        site=data.get("site"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        epc_company=data.get("epc_company"),
        epc_contact_person_id=data.get("epc_contact_person_id"),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(serialize_project(project)), 201


@bp.patch("/<int:project_id>")
def update_project(project_id: int):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(force=True)
    for field in [
        "name",
        "project_type",
        "status",
        "site",
        "start_date",
        "end_date",
        "epc_company",
        "epc_contact_person_id",
    ]:
        if field in data:
            setattr(project, field, data[field])
    db.session.commit()
    return jsonify(serialize_project(project))


@bp.delete("/<int:project_id>")
def delete_project(project_id: int):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": "not_found"}), 404
    db.session.delete(project)
    db.session.commit()
    return ("", 204)


@bp.get("/<int:project_id>/assignments")
def list_assignments(project_id: int):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": "project_not_found"}), 404
    assignments = db.session.scalars(select(ProjectAssignment).where(ProjectAssignment.project_id == project_id)).all()
    return jsonify([serialize_assignment(a) for a in assignments])


@bp.post("/<int:project_id>/assignments")
def add_assignment(project_id: int):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": "project_not_found"}), 404
    data = request.get_json(force=True)
    person = db.session.get(Person, data["person_id"]) if data.get("person_id") else None
    if not person or person.organization_id != project.organization_id:
        return jsonify({"error": "invalid_person"}), 400
    assignment = ProjectAssignment(project_id=project.id, person_id=person.id, role=data.get("role"))
    db.session.add(assignment)
    db.session.commit()
    return jsonify(serialize_assignment(assignment)), 201


@bp.delete("/<int:project_id>/assignments/<int:assignment_id>")
def delete_assignment(project_id: int, assignment_id: int):
    assignment = db.session.get(ProjectAssignment, assignment_id)
    if not assignment or assignment.project_id != project_id:
        return jsonify({"error": "not_found"}), 404
    db.session.delete(assignment)
    db.session.commit()
    return ("", 204)


def serialize_project(p: Project) -> dict:
    return {
        "id": p.id,
        "organization_id": p.organization_id,
        "name": p.name,
        "project_type": p.project_type,
        "status": p.status,
        "site": p.site,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "epc_company": p.epc_company,
        "epc_contact_person_id": p.epc_contact_person_id,
    }


def serialize_assignment(a: ProjectAssignment) -> dict:
    return {
        "id": a.id,
        "project_id": a.project_id,
        "person_id": a.person_id,
        "role": a.role,
    }
