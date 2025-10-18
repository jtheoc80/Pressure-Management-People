from __future__ import annotations
import os
import requests
from typing import Optional
from flask import Blueprint, request, jsonify, current_app


bp = Blueprint("enrich", __name__, url_prefix="/api/enrich")


@bp.get("/providers")
def list_providers():
    cfg = current_app.config
    return jsonify({
        "clearbit": bool(cfg.get("CLEARBIT_API_KEY")),
        "pdl": bool(cfg.get("PDL_API_KEY")),
        # Non-secret hint to help diagnose which var name was used
        "pdl_source": cfg.get("PDL_API_KEY_SOURCE"),
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


@bp.post("/pdl/search")
def pdl_search():
    """
    People Data Lab Person Search API Integration
    
    Expected request body:
    {
        "company": "Company Name",
        "company_domain": "example.com",
        "title": "engineer",
        "seniority": "manager",
        "location": "San Francisco",
        "limit": 50
    }
    """
    cfg = current_app.config
    pdl_api_key = cfg.get("PDL_API_KEY")
    
    if not pdl_api_key:
        return jsonify({
            "error": "PDL_API_KEY not configured",
            "results": []
        }), 400
    
    data = request.get_json(force=True)
    company = data.get("company", "")
    company_domain = data.get("company_domain", "")
    title = data.get("title", "")
    seniority = data.get("seniority", "")
    location = data.get("location", "")
    limit = data.get("limit", 50)
    
    # Build PDL SQL query
    conditions = []
    
    if company_domain:
        conditions.append(f'job_company_website:"{company_domain}"')
    elif company:
        conditions.append(f'job_company_name:"{company}"')
    
    if title:
        conditions.append(f'job_title:"{title}"')
    
    if seniority:
        conditions.append(f'job_title_levels:"{seniority}"')
    
    if location:
        conditions.append(f'location_name:"{location}"')
    
    if not conditions:
        return jsonify({
            "error": "At least one search parameter required",
            "results": []
        }), 400
    
    sql_query = f"SELECT * FROM person WHERE {' AND '.join(conditions)}"
    
    # Call PDL API
    pdl_url = "https://api.peopledatalabs.com/v5/person/search"
    
    try:
        response = requests.post(
            pdl_url,
            json={
                "sql": sql_query,
                "size": limit,
                "pretty": True
            },
            headers={
                "X-Api-Key": pdl_api_key,
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return jsonify({
                "error": f"PDL API error: {response.status_code}",
                "results": [],
                "details": response.text
            }), response.status_code
        
        result = response.json()
        
        # Transform PDL response to our format
        transformed_results = []
        pdl_data = result.get("data", [])
        
        for idx, person in enumerate(pdl_data):
            transformed_results.append({
                "id": person.get("id", str(idx + 1)),
                "full_name": person.get("full_name", "Unknown"),
                "first_name": person.get("first_name", ""),
                "last_name": person.get("last_name", ""),
                "title": person.get("job_title", ""),
                "company": person.get("job_company_name", company),
                "email": (person.get("emails") or [{}])[0].get("address") if person.get("emails") else person.get("work_email", ""),
                "phone": (person.get("phone_numbers") or [""])[0] if person.get("phone_numbers") else "",
                "location": person.get("location_name", ""),
                "department": person.get("job_title_sub_role", ""),
                "seniority": (person.get("job_title_levels") or [""])[0] if person.get("job_title_levels") else "",
                "linkedin_url": person.get("linkedin_url", ""),
            })
        
        return jsonify({
            "success": True,
            "total": result.get("total", 0),
            "results": transformed_results
        })
        
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "PDL API request timeout",
            "results": []
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": f"PDL API request failed: {str(e)}",
            "results": []
        }), 500
    except Exception as e:
        return jsonify({
            "error": f"Unexpected error: {str(e)}",
            "results": []
        }), 500


@bp.post("/pdl/enrich")
def pdl_enrich():
    """
    People Data Lab Person Enrichment API
    
    Expected request body:
    {
        "email": "john@example.com"
    }
    OR
    {
        "name": "John Doe",
        "company": "Example Corp"
    }
    """
    cfg = current_app.config
    pdl_api_key = cfg.get("PDL_API_KEY")
    
    if not pdl_api_key:
        return jsonify({
            "error": "PDL_API_KEY not configured"
        }), 400
    
    data = request.get_json(force=True)
    
    params = {"pretty": True}
    if data.get("email"):
        params["email"] = data["email"]
    if data.get("name"):
        params["name"] = data["name"]
    if data.get("company"):
        params["company"] = data["company"]
    if data.get("linkedin_url"):
        params["linkedin_url"] = data["linkedin_url"]
    
    pdl_url = "https://api.peopledatalabs.com/v5/person/enrich"
    
    try:
        response = requests.get(
            pdl_url,
            params=params,
            headers={
                "X-Api-Key": pdl_api_key
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return jsonify({
                "error": f"PDL API error: {response.status_code}",
                "details": response.text
            }), response.status_code
        
        return jsonify({
            "success": True,
            "data": response.json()
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Request failed: {str(e)}"
        }), 500
