import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Form.css';

function AddContact() {
  const { id: orgId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    title: '',
    department: '',
    email: '',
    phone: '',
    location: '',
    parent_id: '',
    level: '0',
    responsibilities: '',
    project_types: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [orgId]);

  const loadData = async () => {
    try {
      const [orgRes, contactsRes] = await Promise.all([
        axios.get(`/api/organizations/${orgId}`),
        axios.get(`/api/organizations/${orgId}/contacts`)
      ]);
      setOrganization(orgRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.post('/api/contacts', {
        ...formData,
        org_id: orgId,
        parent_id: formData.parent_id || null
      });
      navigate(`/organizations/${orgId}`);
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Error creating contact. Please try again.');
      setSaving(false);
    }
  };

  const departments = [
    'Executive Management',
    'Operations',
    'Maintenance',
    'Engineering',
    'Projects',
    'Procurement',
    'HSE (Health, Safety, Environment)',
    'Technical Services',
    'Asset Management',
    'Planning & Scheduling',
    'Construction',
    'Quality Assurance',
    'Supply Chain',
    'Finance',
    'Other'
  ];

  const projectTypes = [
    'Turnaround/Shutdown',
    'Capital Projects',
    'Maintenance',
    'Brownfield Expansion',
    'Greenfield Construction',
    'Debottlenecking',
    'Upgrades/Modernization',
    'Safety/Compliance',
    'Digital Transformation',
    'Asset Integrity'
  ];

  if (!organization) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Contact</h1>
          <p className="page-subtitle">Add a new contact to {organization.name}</p>
        </div>
      </div>

      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          <h3 className="form-section-title">Basic Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                name="first_name"
                className="form-input"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                name="last_name"
                className="form-input"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g., VP of Operations"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                name="department"
                className="form-select"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select department...</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 className="form-section-title">Contact Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="email@company.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-input"
              placeholder="Office location or site"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <h3 className="form-section-title">Organizational Structure</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reports To</label>
              <select
                name="parent_id"
                className="form-select"
                value={formData.parent_id}
                onChange={handleChange}
              >
                <option value="">No direct report (top level)</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} - {contact.title || 'No title'}
                  </option>
                ))}
              </select>
              <div className="form-hint">Select the person this contact reports to</div>
            </div>

            <div className="form-group">
              <label className="form-label">Organizational Level</label>
              <select
                name="level"
                className="form-select"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="0">Executive (C-Level)</option>
                <option value="1">Senior Management (VP/Director)</option>
                <option value="2">Middle Management (Manager)</option>
                <option value="3">Supervisor/Team Lead</option>
                <option value="4">Individual Contributor</option>
              </select>
            </div>
          </div>

          <h3 className="form-section-title">Role Details</h3>

          <div className="form-group">
            <label className="form-label">Key Responsibilities</label>
            <textarea
              name="responsibilities"
              className="form-textarea"
              placeholder="Describe their key responsibilities and decision-making authority..."
              value={formData.responsibilities}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Types Involved</label>
            <select
              name="project_types"
              className="form-select"
              value={formData.project_types}
              onChange={handleChange}
            >
              <option value="">Select project types...</option>
              {projectTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div className="form-hint">Primary type of projects this contact is involved with</div>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              name="notes"
              className="form-textarea"
              placeholder="Any additional information about this contact..."
              value={formData.notes}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/organizations/${orgId}`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>

      <div className="info-card card">
        <h3 className="card-title">💡 Tips for Adding Contacts</h3>
        <ul className="tips-list">
          <li><strong>Build from the Top:</strong> Start with executives and work down the hierarchy</li>
          <li><strong>Set Reporting Relationships:</strong> Use "Reports To" to build the org chart structure</li>
          <li><strong>Be Detailed:</strong> Include responsibilities and project types for better relationship mapping</li>
          <li><strong>Keep it Updated:</strong> Regular updates ensure your org chart remains accurate</li>
        </ul>
      </div>
    </div>
  );
}

export default AddContact;
