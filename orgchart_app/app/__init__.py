import os
from flask import Flask, render_template, send_from_directory
from .config import Config
from .database import db


def create_app() -> Flask:
    # Move Flask's own static to a non-conflicting URL so CRA assets can use /static
    app = Flask(
        __name__,
        static_folder="static",
        static_url_path="/flask-static",
        template_folder="templates",
    )
    app.config.from_object(Config)

    db.init_app(app)

    # Create tables on startup (simple dev setup)
    with app.app_context():
        from . import models  # noqa: F401 - ensure models are imported
        db.create_all()

    # Register blueprints
    from .api.organizations import bp as org_bp
    from .api.people import bp as people_bp
    from .api.imports import bp as import_bp
    from .api.orgchart import bp as orgchart_bp
    from .api.projects import bp as projects_bp
    from .api.departments import bp as departments_bp
    from .api.enrich import bp as enrich_bp
    from .api.scraper import scraper_bp

    app.register_blueprint(org_bp)
    app.register_blueprint(people_bp)
    app.register_blueprint(import_bp)
    app.register_blueprint(orgchart_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(enrich_bp)
    app.register_blueprint(scraper_bp, url_prefix='/api/scraper')

    # --- Frontend (React) static serving ---
    # In Docker, the React build is copied to /app/frontend (relative to this module's root)
    frontend_dir = os.path.abspath(os.path.join(app.root_path, "..", "frontend"))

    def _has_frontend_build() -> bool:
        return os.path.exists(os.path.join(frontend_dir, "index.html"))

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path: str):
        # If a React build exists, serve static assets or index.html as SPA fallback.
        if _has_frontend_build():
            candidate = os.path.join(frontend_dir, path)
            if path and os.path.exists(candidate) and os.path.isfile(candidate):
                return send_from_directory(frontend_dir, path)
            return send_from_directory(frontend_dir, "index.html")

        # Fallback for local/dev when the React build isn't present
        # Serve the legacy Flask template instead so the app remains usable
        return render_template("index.html")

    return app
