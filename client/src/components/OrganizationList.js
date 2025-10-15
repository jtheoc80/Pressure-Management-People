import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './OrganizationList.css';

function OrganizationList() {
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [searchTerm, filterIndustry, organizations]);

  const loadOrganizations = async () => {
    try {
      const response = await axios.get('/api/organizations');
      setOrganizations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = organizations;

    if (searchTerm) {
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.location && org.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterIndustry !== 'all') {
      filtered = filtered.filter(org => org.industry === filterIndustry);
    }

    setFilteredOrgs(filtered);
  };

  const deleteOrganization = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will also delete all associated contacts.`)) {
      return;
    }

    try {
      await axios.delete(`/api/organizations/${id}`);
      loadOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Error deleting organization');
    }
  };

  const industries = ['Oil & Gas', 'Petrochemical', 'LNG', 'EPC'];
  const industryColors = {
    'Oil & Gas': 'badge-blue',
    'Petrochemical': 'badge-purple',
    'LNG': 'badge-green',
    'EPC': 'badge-yellow'
  };

  if (loading) {
    return <div className="loading">Loading organizations...</div>;
  }

  return (
    <div className="organization-list">
      <div className="page-header">
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage your industrial sector customer organizations</p>
        </div>
        <Link to="/organizations/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Organization
        </Link>
      </div>

      <div className="card filters-card">
        <div className="filters">
          <div className="search-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Industry:</label>
            <select
              className="form-select"
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
            >
              <option value="all">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredOrgs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <h3 className="empty-state-title">No organizations found</h3>
            <p className="empty-state-text">
              {searchTerm || filterIndustry !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first organization'}
            </p>
            {!searchTerm && filterIndustry === 'all' && (
              <Link to="/organizations/new" className="btn btn-primary">
                Add Your First Organization
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="org-grid">
          {filteredOrgs.map(org => (
            <div key={org.id} className="org-card card">
              <div className="org-card-header">
                <h3 className="org-card-title">{org.name}</h3>
                <span className={`badge ${industryColors[org.industry] || 'badge-blue'}`}>
                  {org.industry}
                </span>
              </div>
              
              {org.sector && (
                <div className="org-card-detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <span>{org.sector}</span>
                </div>
              )}
              
              {org.location && (
                <div className="org-card-detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{org.location}</span>
                </div>
              )}

              {org.notes && (
                <p className="org-card-notes">{org.notes}</p>
              )}

              <div className="org-card-actions">
                <Link to={`/organizations/${org.id}`} className="btn btn-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View Details
                </Link>
                <Link to={`/organizations/${org.id}/chart`} className="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Org Chart
                </Link>
                <button
                  onClick={() => deleteOrganization(org.id, org.name)}
                  className="btn btn-danger"
                  title="Delete organization"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrganizationList;
