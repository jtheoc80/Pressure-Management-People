from __future__ import annotations
import os
from typing import Optional
from flask import Blueprint, request, jsonify, current_app


bp = Blueprint("enrich", __name__, url_prefix="/api/enrich")


@bp.get("/providers")
def list_providers():
    cfg = current_app.config
    return jsonify({
        "clearbit": bool(cfg.get("CLEARBIT_API_KEY")),
        "pdl": bool(cfg.get("PDL_API_KEY")),
        "crunchbase": bool(cfg.get("CRUNCHBASE_API_KEY")),
    })


@bp.post("/note")
def enrichment_note():
    data = request.get_json(force=True)
    # Placeholder endpoint to show how to safely handle enrichment without scraping
    # In real usage, integrate with providers' official APIs with consent and ToS compliance
    return jsonify({
        "ok": True,
        "message": "Enrichment will use official APIs only. No scraping.",
        "input": data,
    })
