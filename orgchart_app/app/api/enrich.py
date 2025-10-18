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
    name = data.get("name", "")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    limit = data.get("limit", 50)
    
    # Build PDL search parameters (not SQL)
    search_params = {}
    
    if company_domain:
        search_params["company_domain"] = company_domain
    elif company:
        search_params["company_name"] = company
    
    if title:
        search_params["job_title"] = title
    
    if seniority:
        search_params["job_title_levels"] = seniority
    
    if location:
        search_params["location_name"] = location

    if name:
        search_params["full_name"] = name
    if first_name:
        search_params["first_name"] = first_name
    if last_name:
        search_params["last_name"] = last_name
    
    if not search_params:
        return jsonify({
            "error": "At least one search parameter required",
            "results": []
        }), 400
    
    # Add API key and other required parameters
    search_params["api_key"] = pdl_api_key
    search_params["size"] = limit
    
    # Call PDL Person Search API
    pdl_url = "https://api.peopledatalabs.com/v5/person/search"
    
    try:
        response = requests.get(
            pdl_url,
            params=search_params,
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


@bp.post("/pdl/identify")
def pdl_identify():
    """
    People Data Lab Person Identify API Integration
    
    Expected request body:
    {
        "first_name": "ben",
        "last_name": "eisenberg",
        "region": "new york"
    }
    """
    cfg = current_app.config
    pdl_api_key = cfg.get("PDL_API_KEY")
    
    if not pdl_api_key:
        return jsonify({
            "error": "PDL_API_KEY not configured"
        }), 400
    
    data = request.get_json(force=True)
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    region = data.get("region", "")
    
    if not first_name or not last_name:
        return jsonify({
            "error": "first_name and last_name are required"
        }), 400
    
    # Build PDL Identify API parameters
    params = {
        "api_key": pdl_api_key,
        "first_name": first_name,
        "last_name": last_name
    }
    
    if region:
        params["region"] = region
    
    # Call PDL Person Identify API
    pdl_url = "https://api.peopledatalabs.com/v5/person/identify"
    
    try:
        response = requests.get(
            pdl_url,
            params=params,
            timeout=30
        )
        
        if response.status_code != 200:
            return jsonify({
                "error": f"PDL API error: {response.status_code}",
                "details": response.text
            }), response.status_code
        
        result = response.json()
        
        # Check for successful response
        if result.get('status') == 200:
            identities = result.get('matches', [])
            return jsonify({
                "success": True,
                "status": result.get('status'),
                "matches": identities,
                "count": len(identities)
            })
        else:
            return jsonify({
                "success": False,
                "error": "Identify unsuccessful",
                "details": result
            }), 400
        
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "PDL API request timeout"
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": f"PDL API request failed: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            "error": f"Unexpected error: {str(e)}"
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
