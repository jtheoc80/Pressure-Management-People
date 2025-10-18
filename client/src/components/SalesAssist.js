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
    industry: '',
    job_title_levels: '',
    experience_level: '',
    skills: '',
    education: '',
    summary: ''
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
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, errors: [] });
  const [companyEnrichment, setCompanyEnrichment] = useState({
    domain: '',
    loading: false,
    results: null,
    error: null
  });

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

  const validatePDLQuery = (query) => {
    const errors = [];
    
    if (!query.company_domain && !query.company) {
      errors.push('Company domain or company name is required');
    }
    
    if (!query.title) {
      errors.push('Title is required');
    }
    
    if (query.company_domain && !isValidDomain(query.company_domain)) {
      errors.push('Invalid domain format (e.g., acme.com)');
    }
    
    if (query.limit && (query.limit < 1 || query.limit > 25)) {
      errors.push('Limit must be between 1 and 25');
    }
    
    if (query.email && !isValidEmail(query.email)) {
      errors.push('Invalid email format');
    }
    
    return errors;
  };

  const isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const searchPDL = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSelectedIndexes(new Set());
    
    // Validate query
    const validationErrors = validatePDLQuery(pdlQuery);
    if (validationErrors.length > 0) {
      setMessage({ type: 'warning', text: validationErrors.join('. ') });
      return;
    }
    
    setPdlLoading(true);
    try {
      const res = await axios.post('/api/enrich/pdl/search', pdlQuery);
      const results = res.data.results || [];
      setPdlResults(results);
      
      if (results.length === 0) {
        setMessage({ 
          type: 'info', 
          text: 'No results found. Try broadening your search criteria or removing location filters.' 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Found ${results.length} contact(s). ${res.data.total ? `(${res.data.total} total available)` : ''}` 
        });
      }
    } catch (err) {
      let errorMessage = 'PDL search failed. ';
      
      if (err.response?.status === 400) {
        errorMessage += 'Invalid search parameters. Check your filters.';
      } else if (err.response?.status === 401) {
        errorMessage += 'PDL API key is invalid or expired.';
      } else if (err.response?.status === 429) {
        errorMessage += 'Rate limit exceeded. Please wait before trying again.';
      } else if (err.response?.status === 500) {
        errorMessage += 'PDL API server error. Please try again later.';
      } else if (err.response?.data?.error === 'pdl_error') {
        errorMessage += `PDL API error: ${err.response.data.detail || 'Unknown error'}`;
      } else {
        errorMessage += 'Check your network connection and try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setPdlLoading(false);
    }
  };

  const validateContactData = (person) => {
    const errors = [];
    
    if (!person.first_name && !person.full_name) {
      errors.push('Name is required');
    }
    
    if (person.email && !isValidEmail(person.email)) {
      errors.push('Invalid email format');
    }
    
    if (person.phone && !isValidPhone(person.phone)) {
      errors.push('Invalid phone format');
    }
    
    return errors;
  };

  const isValidPhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const savePDLContact = async (person) => {
    try {
      // Validate contact data
      const validationErrors = validateContactData(person);
      if (validationErrors.length > 0) {
        setMessage({ type: 'warning', text: `Cannot save contact: ${validationErrors.join(', ')}` });
        return;
      }

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
        setOrganizations(prev => [...prev, orgRes.data]);
      }
      if (!orgId) {
        setMessage({ type: 'warning', text: 'Select an organization to save this contact.' });
        return;
      }

      const contactData = {
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
        notes: `Imported from PDL - ${new Date().toLocaleDateString()}`
      };

      await axios.post('/api/contacts', contactData);
      setMessage({ type: 'success', text: `Contact ${contactData.first_name} ${contactData.last_name} saved successfully.` });
    } catch (e) {
      let errorMessage = 'Failed to save contact. ';
      if (e.response?.status === 400) {
        errorMessage += e.response.data.error || 'Invalid contact data.';
      } else if (e.response?.status === 500) {
        errorMessage += 'Server error. Please try again.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      setMessage({ type: 'error', text: errorMessage });
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
      { label: 'Maintenance Manager', title: 'maintenance manager', seniority: 'manager', industry: 'oil & gas' },
      { label: 'Reliability Engineer', title: 'reliability engineer', seniority: '', industry: 'oil & gas' },
      { label: 'Procurement Manager', title: 'procurement manager', seniority: 'manager', industry: 'oil & gas' },
      { label: 'Operations Manager', title: 'operations manager', seniority: 'manager', industry: 'oil & gas' },
      { label: 'Plant Manager', title: 'plant manager', seniority: 'manager', industry: 'oil & gas' },
      { label: 'Safety Manager', title: 'safety manager', seniority: 'manager', industry: 'oil & gas' },
      { label: 'Project Manager', title: 'project manager', seniority: 'manager', industry: 'oil & gas' },
      { label: 'Process Engineer', title: 'process engineer', seniority: '', industry: 'petrochemical' },
      { label: 'LNG Operations', title: 'lng operations', seniority: '', industry: 'lng' },
      { label: 'EPC Director', title: 'epc director', seniority: 'director', industry: 'epc' },
    ],
    []
  );

  const applyPreset = (preset) => {
    setPdlQuery((prev) => ({
      ...prev,
      title: preset.title,
      seniority: preset.seniority || prev.seniority || '',
      industry: preset.industry || prev.industry || '',
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
      setMessage({ type: 'warning', text: 'Nothing to import' });
      return;
    }
    
    setImportProgress({ current: 0, total: csvPreview.length, status: 'Starting import...' });
    setImportResults({ success: 0, failed: 0, errors: [] });
    
    const results = { success: 0, failed: 0, errors: [] };
    
    try {
      for (let i = 0; i < csvPreview.length; i++) {
        const row = csvPreview[i];
        setImportProgress({ 
          current: i + 1, 
          total: csvPreview.length, 
          status: `Importing ${row.first_name} ${row.last_name}...` 
        });
        
        try {
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
              // Update organizations list
              setOrganizations(prev => [...prev, orgRes.data]);
            }
          }
          if (!orgId) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: No organization found for ${row.company || 'unknown company'}`);
            continue;
          }

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
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${error.response?.data?.error || error.message}`);
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setImportResults(results);
      setImportProgress({ current: csvPreview.length, total: csvPreview.length, status: 'Import completed' });
      
      if (results.success > 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully imported ${results.success} contacts${results.failed > 0 ? `, ${results.failed} failed` : ''}` 
        });
      } else {
        setMessage({ type: 'error', text: 'No contacts were imported successfully' });
      }
      
      setCsvText('');
      setCsvPreview([]);
    } catch (e) {
      setMessage({ type: 'error', text: 'Import process failed' });
      setImportProgress({ current: 0, total: 0, status: 'Import failed' });
    }
  };

  const enrichCompany = async (e) => {
    e.preventDefault();
    if (!companyEnrichment.domain) {
      setCompanyEnrichment(prev => ({ ...prev, error: 'Please enter a company domain' }));
      return;
    }
    
    setCompanyEnrichment(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await axios.post('/api/enrich/pdl/company', {
        domain: companyEnrichment.domain
      });
      setCompanyEnrichment(prev => ({ 
        ...prev, 
        loading: false, 
        results: res.data,
        error: null 
      }));
    } catch (error) {
      setCompanyEnrichment(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.error || 'Company enrichment failed' 
      }));
    }
  };

  const createOrgFromEnrichment = async (companyData) => {
    try {
      const res = await axios.post('/api/organizations', {
        name: companyData.name,
        industry: companyData.industry || 'Oil & Gas',
        sector: companyData.sector || '',
        location: companyData.location || '',
        notes: `Enriched from PDL - ${companyData.website || companyEnrichment.domain}`
      });
      setOrganizations(prev => [...prev, res.data]);
      setForm(prev => ({ ...prev, org_id: res.data.id }));
      setMessage({ type: 'success', text: 'Organization created from enrichment data' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create organization' });
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
                <label className="form-label">Industry</label>
                <select className="form-select" value={pdlQuery.industry} onChange={(e) => setPdlQuery({ ...pdlQuery, industry: e.target.value })}>
                  <option value="">Any</option>
                  <option value="oil & gas">Oil & Gas</option>
                  <option value="petrochemical">Petrochemical</option>
                  <option value="lng">LNG</option>
                  <option value="epc">EPC</option>
                  <option value="energy">Energy</option>
                  <option value="manufacturing">Manufacturing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" placeholder="Houston, TX" value={pdlQuery.location} onChange={(e) => setPdlQuery({ ...pdlQuery, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <select className="form-select" value={pdlQuery.experience_level} onChange={(e) => setPdlQuery({ ...pdlQuery, experience_level: e.target.value })}>
                  <option value="">Any</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Skills (comma-separated)</label>
                <input className="form-input" placeholder="maintenance, reliability, safety" value={pdlQuery.skills} onChange={(e) => setPdlQuery({ ...pdlQuery, skills: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Education</label>
                <input className="form-input" placeholder="engineering, business" value={pdlQuery.education} onChange={(e) => setPdlQuery({ ...pdlQuery, education: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Summary keywords</label>
                <input className="form-input" placeholder="turnaround, project management" value={pdlQuery.summary} onChange={(e) => setPdlQuery({ ...pdlQuery, summary: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Results limit</label>
                <input type="number" className="form-input" min="1" max="25" value={pdlQuery.limit} onChange={(e) => setPdlQuery({ ...pdlQuery, limit: Number(e.target.value) })} />
                <div className="form-hint">Max 25 results per search</div>
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
          <h2 className="card-title">Company Enrichment (PDL)</h2>
          {!providers.pdl && (
            <span className="badge badge-yellow">PDL key not configured</span>
          )}
        </div>
        {!providers.pdl && (
          <div className="callout callout-warning" style={{ marginBottom: '1rem' }}>
            <strong>Provider setup:</strong> Set one of these env vars and restart the server: <code>PDL_API_KEY</code>, <code>PEOPLE_DATA_LABS_API_KEY</code>, <code>PEOPLEDATALABS_API_KEY</code>. Example: <code>export PDL_API_KEY=your_key</code>
          </div>
        )}
        <form onSubmit={enrichCompany} className="grid-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company Domain</label>
              <input 
                className="form-input" 
                placeholder="acme.com" 
                value={companyEnrichment.domain} 
                onChange={(e) => setCompanyEnrichment(prev => ({ ...prev, domain: e.target.value }))} 
              />
              <div className="form-hint">Enter the company's website domain for enrichment</div>
            </div>
            <div className="form-group">
              <label className="form-label">Action</label>
              <button type="submit" className="btn btn-primary" disabled={companyEnrichment.loading || !providers.pdl}>
                {companyEnrichment.loading ? 'Enriching...' : 'Enrich Company'}
              </button>
            </div>
          </div>
        </form>
        
        {companyEnrichment.error && (
          <div className="callout callout-error" style={{ marginTop: '1rem' }}>
            {companyEnrichment.error}
          </div>
        )}
        
        {companyEnrichment.results && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Enrichment Results</h3>
            <div className="company-enrichment-results">
              <div className="company-info">
                <h4>{companyEnrichment.results.name}</h4>
                <p><strong>Industry:</strong> {companyEnrichment.results.industry || 'N/A'}</p>
                <p><strong>Website:</strong> {companyEnrichment.results.website || 'N/A'}</p>
                <p><strong>Location:</strong> {companyEnrichment.results.location || 'N/A'}</p>
                <p><strong>Size:</strong> {companyEnrichment.results.size || 'N/A'}</p>
                <p><strong>Description:</strong> {companyEnrichment.results.summary || 'N/A'}</p>
              </div>
              <div className="form-actions">
                <button 
                  className="btn btn-success" 
                  onClick={() => createOrgFromEnrichment(companyEnrichment.results)}
                >
                  Create Organization
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCompanyEnrichment(prev => ({ ...prev, results: null }))}
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">CSV Import</h2>
        </div>
        <div className="form-group">
          <label className="form-label">CSV Data</label>
          <textarea 
            className="form-input" 
            rows="6" 
            placeholder="first_name,last_name,title,company,email,phone,location&#10;John,Doe,Manager,Acme Corp,john@acme.com,555-1234,Houston TX"
            value={csvText} 
            onChange={(e) => setCsvText(e.target.value)} 
          />
          <div className="form-hint">
            Paste CSV data with headers: first_name, last_name, title, company, email, phone, location
          </div>
        </div>
        
        <div className="form-actions">
          <button className="btn btn-primary" onClick={parseCsv} disabled={parsingCsv || !csvText.trim()}>
            {parsingCsv ? 'Parsing...' : 'Parse CSV'}
          </button>
          {csvPreview.length > 0 && (
            <button className="btn btn-success" onClick={importCsvRows} disabled={importProgress.total > 0}>
              Import {csvPreview.length} contacts
            </button>
          )}
        </div>
        
        {csvPreview.length > 0 && (
          <div className="csv-preview" style={{ marginTop: '1rem' }}>
            <h4>Preview ({csvPreview.length} rows):</h4>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    {Object.keys(csvPreview[0] || {}).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((value, colIdx) => (
                        <td key={colIdx}>{value || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {importProgress.total > 0 && (
          <div className="import-progress" style={{ marginTop: '1rem' }}>
            <div className="progress-header">
              <span className="progress-status">{importProgress.status}</span>
              <span className="progress-count">{importProgress.current} / {importProgress.total}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${(importProgress.current / importProgress.total) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        )}
        
        {importResults.errors.length > 0 && (
          <div className="import-errors" style={{ marginTop: '1rem' }}>
            <h4>Import Errors ({importResults.errors.length}):</h4>
            <div className="error-list">
              {importResults.errors.slice(0, 10).map((error, idx) => (
                <div key={idx} className="error-item">{error}</div>
              ))}
              {importResults.errors.length > 10 && (
                <div className="error-item">... and {importResults.errors.length - 10} more errors</div>
              )}
            </div>
          </div>
        )}
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
