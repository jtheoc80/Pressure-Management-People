from flask import Flask, render_template
from .config import Config
from .database import db


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
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

    @app.get("/")
    def index():
        return render_template("index.html")

    return app
