from __future__ import annotations
from datetime import date
from typing import Optional
from sqlalchemy import UniqueConstraint, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import db


class Organization(db.Model):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    sector: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., Oil & Gas
    subsector: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., Upstream, LNG
    domain: Mapped[Optional[str]] = mapped_column(String(255))
    country: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(String(2000))

    departments: Mapped[list[Department]] = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    people: Mapped[list[Person]] = relationship("Person", back_populates="organization", cascade="all, delete-orphan")
    projects: Mapped[list[Project]] = relationship("Project", back_populates="organization", cascade="all, delete-orphan")


class Department(db.Model):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    organization: Mapped[Organization] = relationship("Organization", back_populates="departments")
    people: Mapped[list[Person]] = relationship("Person", back_populates="department")

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_department_org_name"),
    )


class Person(db.Model):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"))

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(255))

    is_epc_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., manual, csv, clearbit

    reports_to_id: Mapped[Optional[int]] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"))

    organization: Mapped[Organization] = relationship("Organization", back_populates="people")
    department: Mapped[Optional[Department]] = relationship("Department", back_populates="people")
    manager: Mapped[Optional["Person"]] = relationship("Person", remote_side=[id], backref="direct_reports")

    project_assignments: Mapped[list[ProjectAssignment]] = relationship("ProjectAssignment", back_populates="person", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_person_org_email"),
    )


class Project(db.Model):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_type: Mapped[str] = mapped_column(String(50))  # maintenance | project
    status: Mapped[Optional[str]] = mapped_column(String(50))  # planned, active, complete
    site: Mapped[Optional[str]] = mapped_column(String(255))

    start_date: Mapped[Optional[date]] = mapped_column(Date())
    end_date: Mapped[Optional[date]] = mapped_column(Date())

    epc_company: Mapped[Optional[str]] = mapped_column(String(255))
    epc_contact_person_id: Mapped[Optional[int]] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"))

    organization: Mapped[Organization] = relationship("Organization", back_populates="projects")
    epc_contact_person: Mapped[Optional[Person]] = relationship("Person")

    assignments: Mapped[list[ProjectAssignment]] = relationship("ProjectAssignment", back_populates="project", cascade="all, delete-orphan")


class ProjectAssignment(db.Model):
    __tablename__ = "project_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), nullable=False)

    role: Mapped[Optional[str]] = mapped_column(String(100))  # e.g., PM, Maintenance Lead

    project: Mapped[Project] = relationship("Project", back_populates="assignments")
    person: Mapped[Person] = relationship("Person", back_populates="project_assignments")
