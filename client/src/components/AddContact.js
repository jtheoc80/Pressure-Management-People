import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Form.css';
import './AddContact.css';

function AddContact() {
  const { id: orgId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null); // 'search', 'manual', 'quick'
  
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
  const [currentStep, setCurrentStep] = useState(1);
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
      setAllContacts(contactsRes.data);
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

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowSearchResults(query.length > 0);
  };

  const filteredContacts = allContacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const title = (contact.title || '').toLowerCase();
    const department = (contact.department || '').toLowerCase();
    const email = (contact.email || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           title.includes(searchLower) || 
           department.includes(searchLower) ||
           email.includes(searchLower);
  });

  const selectExistingContact = (contact) => {
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title || '',
      department: contact.department || '',
      email: contact.email || '',
      phone: contact.phone || '',
      location: contact.location || '',
      parent_id: contact.parent_id || '',
      level: contact.level?.toString() || '0',
      responsibilities: contact.responsibilities || '',
      project_types: contact.project_types || '',
      notes: contact.notes || ''
    });
    setSearchQuery('');
    setShowSearchResults(false);
    setSelectedMode('manual');
    setCurrentStep(1);
  };

  const startQuickAdd = () => {
    setSelectedMode('quick');
    setCurrentStep(1);
  };

  const startManualAdd = () => {
    setSelectedMode('manual');
    setCurrentStep(1);
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

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      alert('Please provide at least first and last name');
      return;
    }
    await handleSubmit(e);
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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

  // Mode Selection Screen
  if (!selectedMode) {
    return (
      <div className="add-contact-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Add Contact</h1>
            <p className="page-subtitle">Add a new contact to {organization.name}</p>
          </div>
        </div>

        <div className="mode-selection-grid">
          {/* Search Existing */}
          <div className="mode-card">
            <div className="mode-icon search">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h3 className="mode-title">Search Contacts</h3>
            <p className="mode-description">
              Search through your existing contacts or find similar contacts across organizations
            </p>
            
            <div className="search-box-wrapper">
              <div className="search-box">
                <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, title, department..."
                  className="search-input"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSearchResults(searchQuery.length > 0)}
                />
              </div>
              
              {showSearchResults && (
                <div className="search-results">
                  {filteredContacts.length > 0 ? (
                    <>
                      <div className="search-results-header">
                        Found {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                      </div>
                      {filteredContacts.slice(0, 5).map(contact => (
                        <div
                          key={contact.id}
                          className="search-result-item"
                          onClick={() => selectExistingContact(contact)}
                        >
                          <div className="result-avatar">
                            {contact.first_name[0]}{contact.last_name[0]}
                          </div>
                          <div className="result-info">
                            <div className="result-name">
                              {contact.first_name} {contact.last_name}
                            </div>
                            <div className="result-details">
                              {contact.title && <span>{contact.title}</span>}
                              {contact.department && <span className="separator">•</span>}
                              {contact.department && <span>{contact.department}</span>}
                            </div>
                            {contact.email && (
                              <div className="result-email">{contact.email}</div>
                            )}
                          </div>
                          <button className="btn btn-sm btn-primary">
                            Use as Template
                          </button>
                        </div>
                      ))}
                      {filteredContacts.length > 5 && (
                        <div className="search-results-footer">
                          and {filteredContacts.length - 5} more...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-results">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <p>No contacts found matching "{searchQuery}"</p>
                      <button className="btn btn-primary btn-sm" onClick={startManualAdd}>
                        Add New Contact
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Add */}
          <div className="mode-card" onClick={startQuickAdd}>
            <div className="mode-icon quick">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h3 className="mode-title">Quick Add</h3>
            <p className="mode-description">
              Fast entry with just the essentials. Perfect when you need to quickly capture basic contact info.
            </p>
            <button className="btn btn-primary mode-button">
              Quick Add →
            </button>
          </div>

          {/* Full Details */}
          <div className="mode-card" onClick={startManualAdd}>
            <div className="mode-icon detailed">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="mode-title">Full Details</h3>
            <p className="mode-description">
              Complete form with all fields including organizational structure, responsibilities, and notes.
            </p>
            <button className="btn btn-secondary mode-button">
              Add Full Details →
            </button>
          </div>
        </div>

        {/* Tips Section */}
        <div className="info-card card">
          <h3 className="card-title">💡 Pro Tips</h3>
          <div className="tips-grid">
            <div className="tip-item">
              <div className="tip-icon">🔍</div>
              <div>
                <strong>Search First</strong>
                <p>Check if the contact already exists to avoid duplicates</p>
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-icon">⚡</div>
              <div>
                <strong>Quick Add for Speed</strong>
                <p>Use quick add when capturing info at events or meetings</p>
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-icon">📋</div>
              <div>
                <strong>Full Details for Org Charts</strong>
                <p>Complete all fields to build accurate organizational hierarchies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quick Add Mode
  if (selectedMode === 'quick') {
    return (
      <div className="form-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quick Add Contact</h1>
            <p className="page-subtitle">Essential information only</p>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={() => setSelectedMode(null)}
          >
            ← Change Mode
          </button>
        </div>

        <div className="card form-card">
          <form onSubmit={handleQuickSubmit}>
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
                  autoFocus
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

            <div className="quick-add-note">
              💡 You can add more details later by editing this contact
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
      </div>
    );
  }

  // Manual/Full Details Mode (Multi-step)
  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Contact - Full Details</h1>
          <p className="page-subtitle">Step {currentStep} of 3</p>
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => setSelectedMode(null)}
        >
          ← Change Mode
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="progress-step-number">1</div>
          <div className="progress-step-label">Basic Info</div>
        </div>
        <div className={`progress-line ${currentStep > 1 ? 'active' : ''}`}></div>
        <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="progress-step-number">2</div>
          <div className="progress-step-label">Organization</div>
        </div>
        <div className={`progress-line ${currentStep > 2 ? 'active' : ''}`}></div>
        <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="progress-step-number">3</div>
          <div className="progress-step-label">Role Details</div>
        </div>
      </div>

      <div className="card form-card">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="form-step">
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
                    autoFocus
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

              <h3 className="form-section-title" style={{marginTop: '2rem'}}>Contact Information</h3>

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
            </div>
          )}

          {/* Step 2: Organizational Structure */}
          {currentStep === 2 && (
            <div className="form-step">
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

              {contacts.length === 0 && (
                <div className="info-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>This is the first contact in this organization. They will be at the top of the org chart.</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Role Details */}
          {currentStep === 3 && (
            <div className="form-step">
              <h3 className="form-section-title">Role Details</h3>

              <div className="form-group">
                <label className="form-label">Key Responsibilities</label>
                <textarea
                  name="responsibilities"
                  className="form-textarea"
                  placeholder="Describe their key responsibilities and decision-making authority..."
                  value={formData.responsibilities}
                  onChange={handleChange}
                  rows="4"
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
                  rows="4"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (currentStep === 1) {
                  navigate(`/organizations/${orgId}`);
                } else {
                  prevStep();
                }
              }}
              disabled={saving}
            >
              {currentStep === 1 ? 'Cancel' : '← Previous'}
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Contact'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddContact;
