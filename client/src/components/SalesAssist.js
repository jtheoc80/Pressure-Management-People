import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './Form.css';
import './Dashboard.css';

function SalesAssist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialOrgId = searchParams.get('orgId') || '';

  const [organizations, setOrganizations] = useState([]);
  const [providers, setProviders] = useState({});
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdlResults, setPdlResults] = useState([]);
  const [pdlLoading, setPdlLoading] = useState(false);
  const [pdlQuery, setPdlQuery] = useState({
    name: '',
    company: '',
    company_domain: '',
    title: 'maintenance manager',
    location: '',
    limit: 10,
  });

  const [form, setForm] = useState({
    org_id: initialOrgId,
    title: '',
    details: '',
    priority: 'normal',
    due_date: ''
  });

  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [parsingCsv, setParsingCsv] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/organizations'),
      axios.get('/api/enrich/providers'),
      axios.get('/api/sales-requests')
    ])
      .then(([orgRes, provRes, reqRes]) => {
        setOrganizations(orgRes.data);
        setProviders(provRes.data);
        setRequests(reqRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/sales-requests', form);
      setRequests((prev) => [res.data, ...prev]);
      setForm({ org_id: initialOrgId, title: '', details: '', priority: 'normal', due_date: '' });
    } catch (err) {
      alert('Failed to submit request');
    }
  };

  const searchPDL = async (e) => {
    e.preventDefault();
    setPdlLoading(true);
    try {
      const res = await axios.post('/api/enrich/pdl/search', pdlQuery);
      setPdlResults(res.data.results || []);
    } catch (err) {
      alert('PDL search failed');
    } finally {
      setPdlLoading(false);
    }
  };

  const savePDLContact = async (person) => {
    try {
      let orgId = form.org_id;
      if (!orgId) {
        const match = organizations.find((o) => o.name?.toLowerCase() === (person.company || '').toLowerCase());
        orgId = match?.id || null;
      }
      if (!orgId && person.company) {
        const orgRes = await axios.post('/api/organizations', {
          name: person.company,
          industry: 'Oil & Gas',
          sector: '',
          location: person.location || ''
        });
        orgId = orgRes.data.id;
      }
      if (!orgId) {
        alert('Select an organization to save this contact');
        return;
      }
      await axios.post('/api/contacts', {
        org_id: orgId,
        first_name: person.first_name || person.full_name?.split(' ')[0] || '',
        last_name: person.last_name || person.full_name?.split(' ').slice(1).join(' ') || '',
        title: person.title || '',
        department: '',
        email: person.email || '',
        phone: person.phone || '',
        location: person.location || '',
        parent_id: null,
        level: 0,
        responsibilities: '',
        project_types: '',
        notes: 'Imported from PDL'
      });
      alert('Contact saved');
    } catch (e) {
      alert('Failed to save contact');
    }
  };

  const parseCsv = () => {
    setParsingCsv(true);
    try {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length === 0) {
        setCsvPreview([]);
        setParsingCsv(false);
        return;
      }
      const header = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',');
        const row = {};
        header.forEach((h, i) => {
          row[h] = (cols[i] || '').trim();
        });
        return row;
      });
      setCsvPreview(rows.slice(0, 10));
    } catch (e) {
      alert('Invalid CSV');
    } finally {
      setParsingCsv(false);
    }
  };

  const importCsvRows = async () => {
    if (!csvPreview.length) {
      alert('Nothing to import');
      return;
    }
    try {
      // Transform preview rows into contact create calls
      const created = [];
      for (const row of csvPreview) {
        // Find or create organization
        let orgId = form.org_id;
        if (!orgId) {
          const match = organizations.find((o) => o.name?.toLowerCase() === (row.company || row.organization || '').toLowerCase());
          orgId = match?.id || null;
        }
        if (!orgId) {
          // create org on the fly if company field exists
          const companyName = row.company || row.organization;
          if (companyName) {
            const orgRes = await axios.post('/api/organizations', {
              name: companyName,
              industry: row.industry || 'Oil & Gas',
              sector: row.sector || '',
              location: row.location || ''
            });
            orgId = orgRes.data.id;
          }
        }
        if (!orgId) continue;

        await axios.post('/api/contacts', {
          org_id: orgId,
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          title: row.title || '',
          department: row.department || '',
          email: row.email || '',
          phone: row.phone || '',
          location: row.location || '',
          parent_id: null,
          level: Number(row.level || 0),
          responsibilities: row.responsibilities || '',
          project_types: row.project_types || '',
          notes: row.notes || ''
        });
        created.push(row.email || `${row.first_name} ${row.last_name}`);
      }
      alert(`Imported ${created.length} contacts`);
      setCsvText('');
      setCsvPreview([]);
    } catch (e) {
      alert('Import failed');
    }
  };

  const exportOrg = async () => {
    if (!form.org_id) {
      alert('Select an organization');
      return;
    }
    const res = await axios.get(`/api/export/org/${form.org_id}`);
    const dataStr = JSON.stringify(res.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const org = organizations.find((o) => o.id === form.org_id);
    a.download = `${(org?.name || 'organization').replace(/\s+/g, '_')}_account_brief.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">Loading Sales Assist...</div>;
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Assist</h1>
          <p className="page-subtitle">Find hard-to-get contacts fast (PDL)</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{gridColumn: '1 / -1'}}>
          <div className="card-header">
            <h2 className="card-title">Find Contacts (PDL)</h2>
            {!providers.pdl && (
              <span className="badge badge-yellow">PDL key not configured</span>
            )}
          </div>
          <form onSubmit={searchPDL} className="grid-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Organization (save to)</label>
                <select name="org_id" className="form-select" value={form.org_id} onChange={handleChange}>
                  <option value="">Select organization...</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Company domain</label>
                <input className="form-input" placeholder="acme.com" value={pdlQuery.company_domain} onChange={(e) => setPdlQuery({ ...pdlQuery, company_domain: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Title contains</label>
                <input className="form-input" value={pdlQuery.title} onChange={(e) => setPdlQuery({ ...pdlQuery, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={pdlQuery.location} onChange={(e) => setPdlQuery({ ...pdlQuery, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Limit</label>
                <input type="number" className="form-input" value={pdlQuery.limit} onChange={(e) => setPdlQuery({ ...pdlQuery, limit: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={pdlLoading}>Search</button>
            </div>
          </form>
          {pdlResults.length > 0 && (
            <div className="projects-list">
              {pdlResults.map((p, idx) => (
                <div key={idx} className="project-item">
                  <div className="project-info">
                    <div className="project-name">{p.full_name}</div>
                    <div className="project-description">{p.title} {p.company ? `• ${p.company}` : ''}</div>
                    <div className="project-meta">
                      {p.email && <span className="badge badge-blue">{p.email}</span>}
                      {p.phone && <span className="badge badge-green">{p.phone}</span>}
                      {p.location && <span className="badge badge-purple">{p.location}</span>}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => savePDLContact(p)}>Save</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">Open Requests</h2>
          <div className="header-actions">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Export Account Brief</label>
              <div className="form-row">
                <select name="org_id" className="form-select" value={form.org_id} onChange={handleChange}>
                  <option value="">Select org...</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <button className="btn btn-secondary" onClick={exportOrg}>Export</button>
              </div>
            </div>
          </div>
        </div>
        {requests.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No open requests</h3>
            <p className="empty-state-text">Submit a request to start</p>
          </div>
        ) : (
          <div className="projects-list">
            {requests.map((r) => (
              <div key={r.id} className="project-item">
                <div className="project-info">
                  <div className="project-name">{r.title}</div>
                  <div className="project-description">{r.details}</div>
                  <div className="project-meta">
                    {r.priority && <span className="badge badge-yellow">{r.priority}</span>}
                    {r.status && <span className="badge badge-green">{r.status}</span>}
                    {r.due_date && <span className="badge badge-blue">Due {r.due_date}</span>}
                  </div>
                </div>
                {r.org_id && (
                  <Link to={`/organizations/${r.org_id}`} className="btn btn-secondary btn-sm">View Org</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesAssist;
