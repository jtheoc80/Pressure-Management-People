import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './OrganizationDetail.css';

function OrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contacts');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [id]);

  const loadOrganizationData = async () => {
    try {
      const [orgRes, contactsRes, projectsRes] = await Promise.all([
        axios.get(`/api/organizations/${id}`),
        axios.get(`/api/organizations/${id}/contacts`),
        axios.get(`/api/organizations/${id}/projects`)
      ]);

      setOrganization(orgRes.data);
      setContacts(contactsRes.data);
      setProjects(projectsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading organization data:', error);
      setLoading(false);
    }
  };

  const requestHelp = async () => {
    const title = window.prompt('Describe what you need (e.g., "Find Maintenance Manager")');
    if (!title) return;
    setSubmittingRequest(true);
    try {
      await axios.post('/api/sales-requests', {
        org_id: id,
        title,
        priority: 'normal'
      });
      alert('Request submitted');
    } catch (e) {
      alert('Failed to submit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const exportAccountBrief = async () => {
    try {
      const res = await axios.get(`/api/export/org/${id}`);
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${organization.name.replace(/\s+/g, '_')}_account_brief.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed');
    }
  };

  const deleteContact = async (contactId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      await axios.delete(`/api/contacts/${contactId}`);
      loadOrganizationData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Error deleting contact');
    }
  };

  const deleteProject = async (projectId, name) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/projects/${projectId}`);
      loadOrganizationData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    }
  };

  const industryColors = {
    'Oil & Gas': 'badge-blue',
    'Petrochemical': 'badge-purple',
    'LNG': 'badge-green',
    'EPC': 'badge-yellow'
  };

  if (loading) {
    return <div className="loading">Loading organization details...</div>;
  }

  if (!organization) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3 className="empty-state-title">Organization not found</h3>
          <Link to="/organizations" className="btn btn-primary">Back to Organizations</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="organization-detail">
      <div className="page-header">
        <div>
          <h1 className="page-title">{organization.name}</h1>
          <div className="org-meta">
            <span className={`badge ${industryColors[organization.industry] || 'badge-blue'}`}>
              {organization.industry}
            </span>
            {organization.sector && (
              <span className="org-meta-item">{organization.sector}</span>
            )}
            {organization.location && (
              <span className="org-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {organization.location}
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <Link to={`/organizations/${id}/chart`} className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            View Org Chart
          </Link>
          <button className="btn btn-secondary" onClick={exportAccountBrief}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Brief
          </button>
          <button className="btn btn-secondary" onClick={requestHelp} disabled={submittingRequest}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18v-6a3 3 0 1 1 6 0" />
              <circle cx="12" cy="6" r="1" />
            </svg>
            {submittingRequest ? 'Submitting...' : 'Request Help'}
          </button>
        </div>
      </div>

      {organization.notes && (
        <div className="card notes-card">
          <h3 className="card-title">Notes</h3>
          <p className="notes-text">{organization.notes}</p>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Contacts ({contacts.length})
        </button>
        <button
          className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Projects ({projects.length})
        </button>
      </div>

      {activeTab === 'contacts' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Contacts</h2>
              <Link to={`/organizations/${id}/contacts/new`} className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Contact
              </Link>
            </div>

            {contacts.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className="empty-state-title">No contacts yet</h3>
                <p className="empty-state-text">Add your first contact to start building the org chart</p>
                <Link to={`/organizations/${id}/contacts/new`} className="btn btn-primary">
                  Add First Contact
                </Link>
              </div>
            ) : (
              <div className="contacts-table">
                {contacts.map(contact => (
                  <div key={contact.id} className="contact-row">
                    <div className="contact-info">
                      <div className="contact-name">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="contact-details">
                        {contact.title && <span className="contact-detail">{contact.title}</span>}
                        {contact.department && <span className="contact-detail">{contact.department}</span>}
                        {contact.email && <span className="contact-detail">{contact.email}</span>}
                        {contact.phone && <span className="contact-detail">{contact.phone}</span>}
                      </div>
                      {contact.responsibilities && (
                        <div className="contact-responsibilities">{contact.responsibilities}</div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteContact(contact.id, `${contact.first_name} ${contact.last_name}`)}
                      className="btn btn-danger btn-sm"
                      title="Delete contact"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Projects</h2>
            </div>

            {projects.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <h3 className="empty-state-title">No projects yet</h3>
                <p className="empty-state-text">Projects tracking coming soon</p>
              </div>
            ) : (
              <div className="projects-list">
                {projects.map(project => (
                  <div key={project.id} className="project-item">
                    <div className="project-info">
                      <div className="project-name">{project.name}</div>
                      {project.description && (
                        <div className="project-description">{project.description}</div>
                      )}
                      <div className="project-meta">
                        {project.type && <span className="badge badge-blue">{project.type}</span>}
                        {project.status && <span className="badge badge-green">{project.status}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationDetail;
