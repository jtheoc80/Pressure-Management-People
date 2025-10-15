import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Form.css';

function AddOrganization() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    industry: 'Oil & Gas',
    sector: '',
    location: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const industries = ['Oil & Gas', 'Petrochemical', 'LNG', 'EPC'];
  
  const sectorsByIndustry = {
    'Oil & Gas': ['Upstream', 'Midstream', 'Downstream', 'Integrated', 'Services'],
    'Petrochemical': ['Base Chemicals', 'Intermediates', 'Polymers', 'Specialty Chemicals'],
    'LNG': ['Liquefaction', 'Regasification', 'Trading & Shipping', 'Storage'],
    'EPC': ['Engineering', 'Procurement', 'Construction', 'EPCM', 'Maintenance']
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset sector when industry changes
      ...(name === 'industry' ? { sector: '' } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await axios.post('/api/organizations', formData);
      navigate(`/organizations/${response.data.id}`);
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Error creating organization. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Organization</h1>
          <p className="page-subtitle">Create a new industrial sector customer organization</p>
        </div>
      </div>

      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Organization Name *</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="e.g., Chevron Corporation"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Industry *</label>
              <select
                name="industry"
                className="form-select"
                value={formData.industry}
                onChange={handleChange}
                required
              >
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sector</label>
              <select
                name="sector"
                className="form-select"
                value={formData.sector}
                onChange={handleChange}
              >
                <option value="">Select sector...</option>
                {sectorsByIndustry[formData.industry]?.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-input"
              placeholder="e.g., Houston, TX or Multiple Locations"
              value={formData.location}
              onChange={handleChange}
            />
            <div className="form-hint">City, State, Country, or Region</div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              className="form-textarea"
              placeholder="Add any additional information about this organization..."
              value={formData.notes}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/organizations')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>

      <div className="info-card card">
        <h3 className="card-title">💡 Tips for Adding Organizations</h3>
        <ul className="tips-list">
          <li><strong>Be Specific:</strong> Use full official company names for better organization</li>
          <li><strong>Choose the Right Industry:</strong> Select the primary industry category that best fits</li>
          <li><strong>Add Location Details:</strong> Include headquarters or primary operating regions</li>
          <li><strong>Document Context:</strong> Use notes to capture important details like relationship status, key projects, or contact preferences</li>
        </ul>
      </div>
    </div>
  );
}

export default AddOrganization;
