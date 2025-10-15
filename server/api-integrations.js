/**
 * API Integration Module for Industrial Org Chart
 * 
 * This module provides examples and utilities for integrating with external
 * data sources to populate organization and contact data.
 * 
 * Since LinkedIn scraping is prohibited, here are alternative data sources:
 * 
 * 1. CRM APIs (Salesforce, HubSpot, Microsoft Dynamics)
 * 2. Business Intelligence APIs (ZoomInfo, Apollo, Clearbit)
 * 3. Company Databases (Crunchbase, PitchBook)
 * 4. Manual CSV/Excel Import
 * 5. User-submitted data through web forms
 * 6. Professional networking APIs (with proper authorization)
 * 7. Company websites and public organizational directories
 * 8. Industry association member directories
 */

// Example: Import from CSV
const fs = require('fs');
const csv = require('csv-parser');

/**
 * Import contacts from CSV file
 * CSV format: first_name,last_name,title,department,email,phone,company
 */
function importFromCSV(filePath, orgId, db) {
  return new Promise((resolve, reject) => {
    const contacts = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        contacts.push({
          org_id: orgId,
          first_name: row.first_name,
          last_name: row.last_name,
          title: row.title,
          department: row.department,
          email: row.email,
          phone: row.phone,
          location: row.location || '',
          parent_id: null,
          level: parseInt(row.level) || 0,
          responsibilities: row.responsibilities || '',
          project_types: row.project_types || '',
          notes: row.notes || ''
        });
      })
      .on('end', () => {
        resolve(contacts);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Example: Integration with ZoomInfo API
 * Note: Requires valid ZoomInfo API credentials
 */
async function fetchFromZoomInfo(companyName, apiKey) {
  // Example implementation - requires actual API credentials
  const url = `https://api.zoominfo.com/search/company`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        companyName: companyName,
        outputFields: ['contacts', 'employees']
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from ZoomInfo:', error);
    return null;
  }
}

/**
 * Example: Integration with Apollo.io API
 * Apollo provides B2B contact and company data
 */
async function fetchFromApollo(companyDomain, apiKey) {
  const url = `https://api.apollo.io/v1/organizations/enrich`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        domain: companyDomain
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Apollo:', error);
    return null;
  }
}

/**
 * Example: Integration with Clearbit API
 * Clearbit provides company and person enrichment data
 */
async function fetchFromClearbit(companyDomain, apiKey) {
  const url = `https://company.clearbit.com/v2/companies/find?domain=${companyDomain}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Clearbit:', error);
    return null;
  }
}

/**
 * Example: Manual data entry workflow
 * This is the primary method and ensures data quality
 */
function createManualEntryWorkflow() {
  return {
    steps: [
      '1. Research company website for organizational structure',
      '2. Check company press releases and news for key personnel',
      '3. Review industry conference speaker lists',
      '4. Check professional associations and memberships',
      '5. Review company filings and investor relations pages',
      '6. Use public company directories',
      '7. Attend industry events and collect business cards',
      '8. Request organizational charts directly from clients'
    ],
    dataSources: [
      'Company website "About Us" and "Leadership" pages',
      'Annual reports and SEC filings (for public companies)',
      'Industry association directories',
      'Conference and webinar speaker lists',
      'Press releases and news articles',
      'Company social media (Twitter, Facebook, Instagram)',
      'YouTube channel "About" sections',
      'Job postings (reveal department structure)',
      'Customer/client testimonials with names and titles'
    ]
  };
}

/**
 * Data validation helper
 */
function validateContactData(contact) {
  const errors = [];
  
  if (!contact.first_name || contact.first_name.trim() === '') {
    errors.push('First name is required');
  }
  
  if (!contact.last_name || contact.last_name.trim() === '') {
    errors.push('Last name is required');
  }
  
  if (contact.email && !isValidEmail(contact.email)) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Export organization data for external use
 */
function exportToJSON(orgData, contacts, projects) {
  return {
    organization: orgData,
    contacts: contacts.map(c => ({
      ...c,
      full_name: `${c.first_name} ${c.last_name}`
    })),
    projects: projects,
    exported_at: new Date().toISOString(),
    hierarchy: buildHierarchy(contacts)
  };
}

function buildHierarchy(contacts) {
  const contactMap = {};
  const roots = [];
  
  contacts.forEach(contact => {
    contactMap[contact.id] = { ...contact, subordinates: [] };
  });
  
  contacts.forEach(contact => {
    if (contact.parent_id && contactMap[contact.parent_id]) {
      contactMap[contact.parent_id].subordinates.push(contactMap[contact.id]);
    } else {
      roots.push(contactMap[contact.id]);
    }
  });
  
  return roots;
}

module.exports = {
  importFromCSV,
  fetchFromZoomInfo,
  fetchFromApollo,
  fetchFromClearbit,
  createManualEntryWorkflow,
  validateContactData,
  exportToJSON,
  buildHierarchy
};
