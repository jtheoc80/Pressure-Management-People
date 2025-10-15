import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalContacts: 0,
    byIndustry: {}
  });
  const [recentOrgs, setRecentOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const orgsResponse = await axios.get('/api/organizations');
      const orgs = orgsResponse.data;
      
      // Calculate statistics
      const industryCount = {};
      let totalContacts = 0;

      for (const org of orgs) {
        industryCount[org.industry] = (industryCount[org.industry] || 0) + 1;
        
        try {
          const contactsResponse = await axios.get(`/api/organizations/${org.id}/contacts`);
          totalContacts += contactsResponse.data.length;
        } catch (error) {
          console.error('Error loading contacts:', error);
        }
      }

      setStats({
        totalOrgs: orgs.length,
        totalContacts,
        byIndustry: industryCount
      });

      setRecentOrgs(orgs.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const industryColors = {
    'Oil & Gas': 'badge-blue',
    'Petrochemical': 'badge-purple',
    'LNG': 'badge-green',
    'EPC': 'badge-yellow'
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your industrial sector organizations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalOrgs}</div>
            <div className="stat-label">Organizations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalContacts}</div>
            <div className="stat-label">Total Contacts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{Object.keys(stats.byIndustry).length}</div>
            <div className="stat-label">Industries</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Industry Distribution</h2>
          </div>
          <div className="industry-list">
            {Object.entries(stats.byIndustry).map(([industry, count]) => (
              <div key={industry} className="industry-item">
                <div className="industry-info">
                  <span className={`badge ${industryColors[industry] || 'badge-blue'}`}>
                    {industry}
                  </span>
                </div>
                <div className="industry-count">{count} org{count !== 1 ? 's' : ''}</div>
              </div>
            ))}
            {Object.keys(stats.byIndustry).length === 0 && (
              <div className="empty-state-text">No organizations yet</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Organizations</h2>
            <Link to="/organizations/new" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add New
            </Link>
          </div>
          <div className="org-list">
            {recentOrgs.map(org => (
              <Link key={org.id} to={`/organizations/${org.id}`} className="org-item">
                <div className="org-item-content">
                  <div className="org-item-name">{org.name}</div>
                  <div className="org-item-meta">
                    <span className={`badge ${industryColors[org.industry] || 'badge-blue'}`}>
                      {org.industry}
                    </span>
                    {org.location && <span className="org-item-location">{org.location}</span>}
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
            {recentOrgs.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-text">No organizations yet</div>
                <Link to="/organizations/new" className="btn btn-primary">
                  Create Your First Organization
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="info-card card">
        <h3 className="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Getting Started
        </h3>
        <p style={{marginBottom: '1rem', color: '#6b7280'}}>
          This application helps you build and manage organizational charts for industrial sector customers. Here's how to get started:
        </p>
        <ol className="getting-started-list">
          <li><strong>Create Organizations:</strong> Add companies from Oil & Gas, Petrochemical, LNG, or EPC sectors</li>
          <li><strong>Add Contacts:</strong> Build your network by adding key personnel with their roles and responsibilities</li>
          <li><strong>Build Org Charts:</strong> Establish reporting relationships to visualize organizational hierarchies</li>
          <li><strong>Track Projects:</strong> Link contacts to maintenance and project-based activities</li>
          <li><strong>Export Data:</strong> Leverage your organizational intelligence for business development</li>
        </ol>
      </div>
    </div>
  );
}

export default Dashboard;
