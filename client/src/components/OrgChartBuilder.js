import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import './OrgChartBuilder.css';

function OrgChartBuilder() {
  const chartRef = useRef(null);
  const [currentResults, setCurrentResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState({});
  
  const [searchForm, setSearchForm] = useState({
    company: '',
    company_domain: '',
    title: '',
    seniority: '',
    department: '',
    location: ''
  });

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (currentResults.length > 0) {
      buildOrgChart(currentResults);
    }
  }, [currentResults]);

  const loadProviders = async () => {
    try {
      const res = await axios.get('/api/enrich/providers');
      setProviders(res.data);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchForm.company && !searchForm.company_domain) {
      alert('Please enter a company name or domain');
      return;
    }

    setLoading(true);
    setCurrentResults([]);
    
    if (chartRef.current) {
      chartRef.current.innerHTML = '';
    }

    try {
      // Build PDL query
      const pdlQuery = {
        company: searchForm.company,
        company_domain: searchForm.company_domain,
        title: searchForm.title,
        seniority: searchForm.seniority,
        location: searchForm.location,
        limit: 50
      };

      const res = await axios.post('/api/enrich/pdl/search', pdlQuery);
      const results = res.data.results || [];
      
      if (results.length === 0) {
        alert('No results found. Try adjusting your search criteria.');
        setLoading(false);
        return;
      }

      // Transform PDL results to org chart format
      const transformedData = transformPDLData(results, searchForm.company);
      setCurrentResults(transformedData);
      
    } catch (error) {
      console.error('Error searching PDL:', error);
      alert('Search failed. Please check your PDL API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const transformPDLData = (results, companyName) => {
    // Map seniority levels to create hierarchy
    const seniorityMap = {
      'owner': 1,
      'founder': 1,
      'c_suite': 1,
      'partner': 1,
      'vp': 2,
      'director': 3,
      'manager': 4,
      'senior': 5,
      'entry': 6,
      'training': 6
    };

    return results.map((person, index) => {
      const seniority = person.seniority || 'entry';
      const level = seniorityMap[seniority] || 5;
      
      // Determine parent based on seniority (simple hierarchy)
      let manager_id = null;
      if (level > 1) {
        // Find someone of higher seniority to be the parent
        const potentialManagers = results
          .map((p, i) => ({ ...p, index: i }))
          .filter(p => {
            const pSeniority = p.seniority || 'entry';
            const pLevel = seniorityMap[pSeniority] || 5;
            return pLevel < level;
          });
        
        if (potentialManagers.length > 0) {
          manager_id = String(potentialManagers[0].index + 1);
        }
      }

      return {
        id: String(index + 1),
        name: person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
        title: person.title || 'No title',
        email: person.email || '',
        company: companyName || person.company || '',
        department: person.department || '',
        location: person.location || '',
        manager_id: manager_id
      };
    });
  };

  const buildOrgChart = (data) => {
    if (!chartRef.current) return;
    
    // Clear previous chart
    chartRef.current.innerHTML = '';

    const width = Math.max(1000, chartRef.current.offsetWidth);
    const height = 600;

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', 'translate(80, 40)');

    // Create hierarchy
    const stratify = d3.stratify()
      .id(d => d.id)
      .parentId(d => d.manager_id);

    let root;
    try {
      root = stratify(data);
    } catch (error) {
      console.error('Error creating hierarchy:', error);
      // Fallback: create flat structure
      const flatData = data.map(d => ({ ...d, manager_id: null }));
      flatData[0].manager_id = null; // Ensure first is root
      for (let i = 1; i < flatData.length; i++) {
        flatData[i].manager_id = '1'; // All report to first person
      }
      root = stratify(flatData);
    }

    // Create tree layout
    const treeLayout = d3.tree()
      .size([height - 80, width - 200]);

    treeLayout(root);

    // Draw links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Add rectangles
    nodes.append('rect')
      .attr('x', -85)
      .attr('y', -22)
      .attr('width', 170)
      .attr('height', 44)
      .attr('rx', 6);

    // Add name text
    nodes.append('text')
      .attr('class', 'name')
      .attr('text-anchor', 'middle')
      .attr('dy', '-5')
      .text(d => {
        const name = d.data.name;
        return name.length > 20 ? name.substring(0, 18) + '...' : name;
      });

    // Add title text
    nodes.append('text')
      .attr('class', 'title')
      .attr('text-anchor', 'middle')
      .attr('dy', '10')
      .text(d => {
        const title = d.data.title;
        return title.length > 22 ? title.substring(0, 20) + '...' : title;
      });

    // Add click handler
    nodes.on('click', (event, d) => {
      const info = `
Name: ${d.data.name}
Title: ${d.data.title}
Email: ${d.data.email || 'N/A'}
Department: ${d.data.department || 'N/A'}
Location: ${d.data.location || 'N/A'}
Company: ${d.data.company}
      `.trim();
      alert(info);
    });
  };

  const handleClear = () => {
    setCurrentResults([]);
    setSearchForm({
      company: '',
      company_domain: '',
      title: '',
      seniority: '',
      department: '',
      location: ''
    });
    if (chartRef.current) {
      chartRef.current.innerHTML = '';
    }
  };

  const handleExport = () => {
    if (currentResults.length === 0) return;

    const csv = [
      ['Name', 'Title', 'Email', 'Company', 'Department', 'Location'],
      ...currentResults.map(r => [
        r.name, r.title, r.email, r.company, r.department, r.location
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-chart-${currentResults[0]?.company || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="org-chart-builder-container">
      <div className="ocb-header">
        <h1>Organization Chart Builder</h1>
        <p>Search for contacts and visualize organizational hierarchies</p>
      </div>

      <div className="ocb-main-content">
        <div className="ocb-search-panel">
          <h2>🔍 Search Contacts</h2>
          {!providers.pdl && (
            <div className="ocb-warning">
              <strong>⚠️ PDL API not configured</strong>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Set the PDL_API_KEY environment variable
              </p>
            </div>
          )}
          <form onSubmit={handleSearch}>
            <div className="ocb-form-group">
              <label htmlFor="company">Company Name *</label>
              <input
                type="text"
                id="company"
                name="company"
                placeholder="e.g., Microsoft"
                value={searchForm.company}
                onChange={handleInputChange}
              />
            </div>

            <div className="ocb-form-group">
              <label htmlFor="company_domain">Company Domain</label>
              <input
                type="text"
                id="company_domain"
                name="company_domain"
                placeholder="e.g., microsoft.com"
                value={searchForm.company_domain}
                onChange={handleInputChange}
              />
            </div>

            <div className="ocb-form-group">
              <label htmlFor="title">Job Title</label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="e.g., Engineer"
                value={searchForm.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="ocb-form-group">
              <label htmlFor="seniority">Seniority Level</label>
              <select
                id="seniority"
                name="seniority"
                value={searchForm.seniority}
                onChange={handleInputChange}
              >
                <option value="">All Levels</option>
                <option value="c_suite">C-Suite</option>
                <option value="vp">VP</option>
                <option value="director">Director</option>
                <option value="manager">Manager</option>
                <option value="senior">Senior</option>
                <option value="entry">Entry Level</option>
              </select>
            </div>

            <div className="ocb-form-group">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                name="department"
                placeholder="e.g., Engineering"
                value={searchForm.department}
                onChange={handleInputChange}
              />
            </div>

            <div className="ocb-form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                placeholder="e.g., San Francisco"
                value={searchForm.location}
                onChange={handleInputChange}
              />
            </div>

            <button
              type="submit"
              className="ocb-btn ocb-btn-primary"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search People Data Lab'}
            </button>
            
            {currentResults.length > 0 && (
              <button
                type="button"
                className="ocb-btn ocb-btn-secondary"
                onClick={handleClear}
              >
                Clear Results
              </button>
            )}
          </form>
        </div>

        <div className="ocb-chart-container">
          <div className="ocb-chart-header">
            <h2>Organization Chart</h2>
            {currentResults.length > 0 && (
              <button className="ocb-export-btn" onClick={handleExport}>
                📥 Export CSV
              </button>
            )}
          </div>

          {currentResults.length > 0 && (
            <div className="ocb-results-info">
              <h3>✅ Search Results</h3>
              <p>{currentResults.length} contacts found for {searchForm.company}</p>
            </div>
          )}

          {loading && (
            <div className="ocb-loading">
              <div className="ocb-spinner"></div>
              <p>Searching People Data Lab...</p>
            </div>
          )}

          {!loading && currentResults.length === 0 && (
            <div className="ocb-empty-state">
              <h3>No Results Yet</h3>
              <p>Enter a company name and click "Search People Data Lab" to build your organization chart</p>
            </div>
          )}

          <div ref={chartRef} id="chartArea" className="ocb-chart-area"></div>
        </div>
      </div>
    </div>
  );
}

export default OrgChartBuilder;
