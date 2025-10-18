import React, { useEffect, useMemo, useState } from 'react';
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
    seniority: '',
    location: '',
    limit: 10,
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());
  const [savingBulk, setSavingBulk] = useState(false);

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
    try {
      const savedQuery = localStorage.getItem('salesAssist.pdlQuery');
      if (savedQuery) {
        const parsed = JSON.parse(savedQuery);
        setPdlQuery((prev) => ({ ...prev, ...parsed }));
      }
      const savedOrgId = localStorage.getItem('salesAssist.orgId');
      if (savedOrgId) {
        setForm((prev) => ({ ...prev, org_id: savedOrgId }));
      }
    } catch (_) {}

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

  useEffect(() => {
    try {
      localStorage.setItem('salesAssist.pdlQuery', JSON.stringify(pdlQuery));
    } catch (_) {}
  }, [pdlQuery]);

  useEffect(() => {
    try {
      localStorage.setItem('salesAssist.orgId', form.org_id || '');
    } catch (_) {}
  }, [form.org_id]);

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
    setMessage({ type: '', text: '' });
    setSelectedIndexes(new Set());
    if (!pdlQuery.company_domain && !pdlQuery.company) {
      setMessage({ type: 'warning', text: 'Enter a company domain or company name.' });
      return;
    }
    if (!pdlQuery.title) {
      setMessage({ type: 'warning', text: 'Enter a target title or use a preset.' });
      return;
    }
    setPdlLoading(true);
    try {
      const res = await axios.post('/api/enrich/pdl/search', pdlQuery);
      const results = res.data.results || [];
      setPdlResults(results);
      if (results.length === 0) {
        setMessage({ type: 'info', text: 'No results. Try broadening the title or removing location.' });
      } else {
        setMessage({ type: 'success', text: `Found ${results.length} contact(s).` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'PDL search failed. Check your filters or provider configuration.' });
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
        setMessage({ type: 'warning', text: 'Select an organization to save this contact.' });
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
      setMessage({ type: 'success', text: 'Contact saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save contact.' });
    }
  };

  const saveSelectedPDLContacts = async () => {
    if (selectedIndexes.size === 0) {
      setMessage({ type: 'warning', text: 'Select at least one contact to save.' });
      return;
    }
    if (!form.org_id) {
      setMessage({ type: 'warning', text: 'Select an organization to save selected contacts.' });
      return;
    }
    setSavingBulk(true);
    let successCount = 0;
    try {
      for (const idx of selectedIndexes) {
        const person = pdlResults[idx];
        try {
          await savePDLContact(person);
          successCount += 1;
        } catch (_) {}
      }
      setMessage({ type: 'success', text: `Saved ${successCount} contact(s).` });
      setSelectedIndexes(new Set());
    } finally {
      setSavingBulk(false);
    }
  };

  const rolePresets = useMemo(
    () => [
      { label: 'Maintenance Manager', title: 'maintenance manager', seniority: 'manager' },
      { label: 'Reliability Engineer', title: 'reliability engineer', seniority: '' },
      { label: 'Procurement', title: 'procurement', seniority: '' },
      { label: 'Operations Manager', title: 'operations manager', seniority: 'manager' },
      { label: 'Plant Manager', title: 'plant manager', seniority: 'manager' },
    ],
    []
  );

  const applyPreset = (preset) => {
    setPdlQuery((prev) => ({
      ...prev,
      title: preset.title,
      seniority: preset.seniority || prev.seniority || '',
    }));
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      const all = new Set(pdlResults.map((_, i) => i));
      setSelectedIndexes(all);
    } else {
      setSelectedIndexes(new Set());
    }
  };

  const toggleSelectOne = (index) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
          {!providers.pdl && (
            <div className="callout callout-warning" style={{ marginBottom: '1rem' }}>
              <strong>Provider setup:</strong> Set one of these env vars and restart the server: <code>PDL_API_KEY</code>, <code>PEOPLE_DATA_LABS_API_KEY</code>, <code>PEOPLEDATALABS_API_KEY</code>. Example: <code>export PDL_API_KEY=your_key</code>
              {providers.pdl_source ? (
                <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>(detected: {providers.pdl_source})</span>
              ) : null}
            </div>
          )}
          {message.text && (
            <div className={`callout ${
              message.type === 'success' ? 'callout-success' :
              message.type === 'error' ? 'callout-error' :
              message.type === 'warning' ? 'callout-warning' : 'callout-info'
            }`}>
              {message.text}
            </div>
          )}
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
                <div className="form-hint">Best results if you know the domain.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Company name</label>
                <input className="form-input" placeholder="Acme Corporation" value={pdlQuery.company} onChange={(e) => setPdlQuery({ ...pdlQuery, company: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Title contains</label>
                <input className="form-input" placeholder="e.g., maintenance manager" value={pdlQuery.title} onChange={(e) => setPdlQuery({ ...pdlQuery, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Seniority</label>
                <select className="form-select" value={pdlQuery.seniority} onChange={(e) => setPdlQuery({ ...pdlQuery, seniority: e.target.value })}>
                  <option value="">Any</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                  <option value="vp">VP</option>
                  <option value="cxo">CXO</option>
                  <option value="owner">Owner</option>
                </select>
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
            <div className="form-group">
              <label className="form-label">Quick role presets</label>
              <div className="preset-buttons">
                {rolePresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={pdlLoading}>
                {pdlLoading ? 'Searching…' : 'Search'}
              </button>
              {pdlResults.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => { setPdlResults([]); setSelectedIndexes(new Set()); }}>
                  Clear results
                </button>
              )}
            </div>
          </form>
          {pdlResults.length > 0 && (
            <div>
              <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {selectedIndexes.size} selected
                </div>
                <div>
                  <button className="btn btn-success" onClick={saveSelectedPDLContacts} disabled={savingBulk}>
                    {savingBulk ? 'Saving…' : 'Save selected'}
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px' }}>
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={selectedIndexes.size === pdlResults.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th>Name</th>
                      <th>Title</th>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Location</th>
                      <th style={{ width: '1%'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdlResults.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIndexes.has(idx)}
                            onChange={() => toggleSelectOne(idx)}
                          />
                        </td>
                        <td>{p.full_name}</td>
                        <td>{p.title || '-'}</td>
                        <td>{p.company || '-'}</td>
                        <td>{p.email || '-'}</td>
                        <td>{p.phone || '-'}</td>
                        <td>{p.location || '-'}</td>
                        <td className="table-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => savePDLContact(p)}>Save</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
