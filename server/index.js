const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Attempt to load environment variables from common .env locations.
// This makes local development easier and avoids relying solely on shell exports.
try {
  const dotenv = require('dotenv');
  const dotenvPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'orgchart_app', '.env'),
  ];
  for (const filePath of dotenvPaths) {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false });
    }
  }
} catch (_) {
  // dotenv is optional; ignore if not installed
}
const {
  exportToJSON,
} = require('./api-integrations');

const app = express();

// Helper: robustly read PDL API key from multiple env var names
const PDL_ENV_CANDIDATES = [
  'PDL_API_KEY',
  'PEOPLE_DATA_LABS_API_KEY',
  'PEOPLE_DATA_LAB_API_KEY',
  'PEOPLEDATALABS_API_KEY',
  'PEOPLE_DATALABS_API_KEY',
  'PDL_KEY',
  'PDLAPIKEY',
];

function getEnvFirst(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return undefined;
}

function getPdlApiKey() {
  return getEnvFirst(PDL_ENV_CANDIDATES);
}

function getPdlApiKeySource() {
  for (const name of PDL_ENV_CANDIDATES) {
    if (process.env[name]) return name;
  }
  return undefined;
}
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const db = new sqlite3.Database('./orgchart.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    sector TEXT,
    location TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    parent_id TEXT,
    level INTEGER DEFAULT 0,
    responsibilities TEXT,
    project_types TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES contacts(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contact_projects (
    contact_id TEXT,
    project_id TEXT,
    role TEXT,
    PRIMARY KEY (contact_id, project_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`);

  // Requests for sales research/help
  db.run(`CREATE TABLE IF NOT EXISTS sales_requests (
    id TEXT PRIMARY KEY,
    org_id TEXT,
    title TEXT NOT NULL,
    details TEXT,
    priority TEXT,
    status TEXT DEFAULT 'open',
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
  )`);
}

// ============= ORGANIZATION ROUTES =============

// Get all organizations
app.get('/api/organizations', (req, res) => {
  db.all('SELECT * FROM organizations ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single organization
app.get('/api/organizations/:id', (req, res) => {
  db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json(row);
  });
});

// Create organization
app.post('/api/organizations', (req, res) => {
  const { name, industry, sector, location, notes } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO organizations (id, name, industry, sector, location, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, industry, sector, location, notes],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, name, industry, sector, location, notes });
    }
  );
});

// Update organization
app.put('/api/organizations/:id', (req, res) => {
  const { name, industry, sector, location, notes } = req.body;
  
  db.run(
    `UPDATE organizations SET name = ?, industry = ?, sector = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, industry, sector, location, notes, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, name, industry, sector, location, notes });
    }
  );
});

// Delete organization
app.delete('/api/organizations/:id', (req, res) => {
  db.run('DELETE FROM organizations WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// ============= CONTACT ROUTES =============

// Get all contacts for an organization
app.get('/api/organizations/:orgId/contacts', (req, res) => {
  db.all(
    'SELECT * FROM contacts WHERE org_id = ? ORDER BY level, last_name',
    [req.params.orgId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Get single contact
app.get('/api/contacts/:id', (req, res) => {
  db.get('SELECT * FROM contacts WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json(row);
  });
});

// Create contact
app.post('/api/contacts', (req, res) => {
  const {
    org_id, first_name, last_name, title, department, email, phone,
    location, parent_id, level, responsibilities, project_types, notes
  } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO contacts (id, org_id, first_name, last_name, title, department, email, phone, location, parent_id, level, responsibilities, project_types, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, org_id, first_name, last_name, title, department, email, phone, location, parent_id, level || 0, responsibilities, project_types, notes],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, org_id, first_name, last_name, title, department, email, phone, location, parent_id, level, responsibilities, project_types, notes });
    }
  );
});

// Update contact
app.put('/api/contacts/:id', (req, res) => {
  const {
    first_name, last_name, title, department, email, phone,
    location, parent_id, level, responsibilities, project_types, notes
  } = req.body;
  
  db.run(
    `UPDATE contacts SET first_name = ?, last_name = ?, title = ?, department = ?, email = ?, phone = ?, 
     location = ?, parent_id = ?, level = ?, responsibilities = ?, project_types = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [first_name, last_name, title, department, email, phone, location, parent_id, level, responsibilities, project_types, notes, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, first_name, last_name, title, department, email, phone, location, parent_id, level, responsibilities, project_types, notes });
    }
  );
});

// Delete contact
app.delete('/api/contacts/:id', (req, res) => {
  db.run('DELETE FROM contacts WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// ============= PROJECT ROUTES =============

// Get all projects for an organization
app.get('/api/organizations/:orgId/projects', (req, res) => {
  db.all(
    'SELECT * FROM projects WHERE org_id = ? ORDER BY start_date DESC',
    [req.params.orgId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Create project
app.post('/api/projects', (req, res) => {
  const { org_id, name, type, status, description, start_date, end_date } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO projects (id, org_id, name, type, status, description, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, org_id, name, type, status, description, start_date, end_date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, org_id, name, type, status, description, start_date, end_date });
    }
  );
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  const { name, type, status, description, start_date, end_date } = req.body;
  
  db.run(
    `UPDATE projects SET name = ?, type = ?, status = ?, description = ?, start_date = ?, end_date = ? WHERE id = ?`,
    [name, type, status, description, start_date, end_date, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, name, type, status, description, start_date, end_date });
    }
  );
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Link contact to project
app.post('/api/contact-projects', (req, res) => {
  const { contact_id, project_id, role } = req.body;
  
  db.run(
    `INSERT INTO contact_projects (contact_id, project_id, role) VALUES (?, ?, ?)`,
    [contact_id, project_id, role],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ contact_id, project_id, role });
    }
  );
});

// ============= PRODUCTION STATIC FILE SERVING =============

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(buildPath));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============= SALES ASSIST / ENRICHMENT / EXPORT =============

// Show which enrichment providers are configured via env vars
app.get('/api/enrich/providers', (req, res) => {
  res.json({
    clearbit: Boolean(process.env.CLEARBIT_API_KEY),
    zoominfo: Boolean(process.env.ZOOMINFO_API_KEY),
    apollo: Boolean(process.env.APOLLO_API_KEY),
    pdl: Boolean(getPdlApiKey()),
    // Non-secret hint to help diagnose which env var was used in various envs
    pdl_source: getPdlApiKeySource() || null,
  });
});

// Create a sales help request
app.post('/api/sales-requests', (req, res) => {
  const { org_id, title, details, priority, due_date } = req.body;
  const id = uuidv4();

  db.run(
    `INSERT INTO sales_requests (id, org_id, title, details, priority, status, due_date)
     VALUES (?, ?, ?, ?, ?, 'open', ?)` ,
    [id, org_id || null, title, details || '', priority || 'normal', due_date || null],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, org_id, title, details, priority: priority || 'normal', status: 'open', due_date });
    }
  );
});

// List sales help requests
app.get('/api/sales-requests', (req, res) => {
  const { status, org_id } = req.query;
  const params = [];
  let sql = 'SELECT * FROM sales_requests';
  const clauses = [];
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (org_id) {
    clauses.push('org_id = ?');
    params.push(org_id);
  }
  if (clauses.length) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update a sales help request (status, details, etc.)
app.patch('/api/sales-requests/:id', (req, res) => {
  const { id } = req.params;
  const { title, details, priority, status, due_date, org_id } = req.body;

  db.run(
    `UPDATE sales_requests
     SET title = COALESCE(?, title),
         details = COALESCE(?, details),
         priority = COALESCE(?, priority),
         status = COALESCE(?, status),
         due_date = COALESCE(?, due_date),
         org_id = COALESCE(?, org_id),
         created_at = created_at
     WHERE id = ?`,
    [title || null, details || null, priority || null, status || null, due_date || null, org_id || null, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      res.json({ id, title, details, priority, status, due_date, org_id });
    }
  );
});

// Export an organization's account brief as JSON
app.get('/api/export/org/:id', (req, res) => {
  const orgId = req.params.id;

  db.get('SELECT * FROM organizations WHERE id = ?', [orgId], (err, orgRow) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!orgRow) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    db.all('SELECT * FROM contacts WHERE org_id = ? ORDER BY level, last_name', [orgId], (err2, contacts) => {
      if (err2) {
        res.status(500).json({ error: err2.message });
        return;
      }
      db.all('SELECT * FROM projects WHERE org_id = ? ORDER BY start_date DESC', [orgId], (err3, projects) => {
        if (err3) {
          res.status(500).json({ error: err3.message });
          return;
        }

        const exportPayload = exportToJSON(orgRow, contacts, projects);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportPayload);
      });
    });
  });
});

// Search People Data Labs for contacts (server-side proxy)
app.post('/api/enrich/pdl/search', async (req, res) => {
  try {
    const apiKey = getPdlApiKey();
    if (!apiKey) {
      res.status(400).json({ error: 'PDL_API_KEY not configured' });
      return;
    }

    const {
      name,
      first_name,
      last_name,
      company,
      company_domain,
      title,
      seniority,
      location,
      limit = 10,
    } = req.body || {};

    // Build SQL conditions using PDL's documented field names
    const conditions = [];
    const esc = (v) => String(v).replace(/"/g, '\\"');
    if (company_domain) {
      conditions.push(`job_company_website:"${esc(company_domain)}"`);
    } else if (company) {
      conditions.push(`job_company_name:"${esc(company)}"`);
    }
    if (title) conditions.push(`job_title:"${esc(title)}"`);
    if (seniority) conditions.push(`job_title_levels:"${esc(seniority)}"`);
    if (location) conditions.push(`location_name:"${esc(location)}"`);
    if (name) conditions.push(`full_name:"${esc(name)}"`);
    if (first_name) conditions.push(`first_name:"${esc(first_name)}"`);
    if (last_name) conditions.push(`last_name:"${esc(last_name)}"`);

    const sql = conditions.length
      ? `SELECT * FROM person WHERE ${conditions.join(' AND ')}`
      : 'SELECT * FROM person WHERE job_title:"manager"';

    const pdlResp = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ sql, size: Math.max(1, Math.min(25, Number(limit) || 10)), pretty: true }),
    });

    if (!pdlResp.ok) {
      const text = await pdlResp.text();
      res.status(pdlResp.status).json({ error: 'pdl_error', detail: text });
      return;
    }

    const data = await pdlResp.json();
    const results = (data?.data || []).map((p) => {
      const email = p.work_email || (Array.isArray(p.emails) ? (typeof p.emails[0] === 'string' ? p.emails[0] : p.emails[0]?.address) : undefined);
      const phone = Array.isArray(p.phone_numbers) ? (typeof p.phone_numbers[0] === 'string' ? p.phone_numbers[0] : p.phone_numbers[0]?.number) : undefined;
      return {
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.job_title || p.title || null,
        email: email || null,
        phone: phone || null,
        location: p.location_name || p.location || null,
        company: p.job_company_name || p.company || null,
        company_domain: p.job_company_domain || p.job_company_website || null,
        source: 'pdl',
      };
    });

    res.json({ total: data?.total || results.length, results });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err?.message || err) });
  }
});

// ============= PRODUCTION CATCH-ALL ROUTE =============

// In production, serve index.html for all non-API routes (enables client-side routing)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
