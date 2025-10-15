# Industrial Org Charts App

A small Flask app to capture org/person/project data for industrial customers (Oil & Gas, Petrochemical, LNG) and visualize org charts with D3. Includes CSV import, projects/assignments, EPC contact highlighting, and optional enrichment provider stubs (no scraping).

## Quick start

```bash
# From repo root
cd orgchart_app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run app
export FLASK_APP=wsgi.py
python wsgi.py
# or
# gunicorn -w 2 -b 0.0.0.0:5000 wsgi:app
```

Open `http://localhost:5000`.

## Seed sample data

```bash
python seed.py
```

This imports `data/sample_people.csv`. You can edit the CSV to add more orgs and people.

CSV headers:
```
organization,name,title,email,phone,location,department,manager_email,is_epc_contact
```

## Key API endpoints

- `GET /api/organizations` — list orgs; `POST` to create
- `GET /api/departments?organization_id={id}` — list departments
- `GET /api/people?organization_id={id}` — list people; filter by `email`
- `POST /api/imports/people-csv` — upload CSV
- `GET /api/projects?organization_id={id}` — list projects; `POST` to create
- `POST /api/projects/{project_id}/assignments` — assign people to a project
- `GET /api/orgchart/{organization_id}?project_id={optional}` — org chart tree JSON

## Enrichment (no scraping)

This project forbids scraping LinkedIn. To enrich contacts, integrate official providers with consent:

- Clearbit (`CLEARBIT_API_KEY`)
- People Data Labs (`PDL_API_KEY`)
- Crunchbase (`CRUNCHBASE_API_KEY`)

The app includes a placeholder endpoint `POST /api/enrich/note` and `GET /api/enrich/providers` to surface configured providers.

## Notes

- SQLite used by default; set `DATABASE_URL` for Postgres/MySQL.
- EPC contacts are highlighted in the org chart.
- Project filter shows only assigned people while preserving the managerial chain.
