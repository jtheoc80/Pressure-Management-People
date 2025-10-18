import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Form.css';
import './Dashboard.css';

function PDLConfiguration() {
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [usageStats, setUsageStats] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    loadProviderStatus();
    loadUsageStats();
  }, []);

  const loadProviderStatus = async () => {
    try {
      const res = await axios.get('/api/enrich/providers');
      setProviders(res.data);
    } catch (error) {
      console.error('Error loading provider status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testPDLConnection = async () => {
    setTesting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post('/api/enrich/pdl/search', {
        company: 'test',
        title: 'engineer',
        limit: 1
      });
      setTestResults({
        success: true,
        message: 'PDL API connection successful',
        data: res.data
      });
      setMessage({ type: 'success', text: 'PDL API test successful!' });
    } catch (error) {
      setTestResults({
        success: false,
        message: error.response?.data?.error || 'PDL API test failed',
        error: error.response?.data?.detail || error.message
      });
      setMessage({ type: 'error', text: 'PDL API test failed. Check your configuration.' });
    } finally {
      setTesting(false);
    }
  };

  const loadUsageStats = async () => {
    setLoadingUsage(true);
    try {
      const res = await axios.get('/api/enrich/pdl/usage');
      setUsageStats(res.data);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      setMessage({ type: 'error', text: 'Failed to load usage statistics' });
    } finally {
      setLoadingUsage(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading PDL configuration...</div>;
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">People Data Labs Configuration</h1>
          <p className="page-subtitle">Configure and test your PDL API integration</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">API Status</h2>
            <div className="header-actions">
              <button 
                className="btn btn-primary" 
                onClick={testPDLConnection}
                disabled={testing || !providers.pdl}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
          
          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">PDL API Key</div>
              <div className={`status-value ${providers.pdl ? 'status-success' : 'status-error'}`}>
                {providers.pdl ? 'Configured' : 'Not Configured'}
              </div>
              {providers.pdl_source && (
                <div className="status-detail">Source: {providers.pdl_source}</div>
              )}
            </div>
            
            <div className="status-item">
              <div className="status-label">Connection Status</div>
              <div className={`status-value ${testResults?.success ? 'status-success' : testResults?.success === false ? 'status-error' : 'status-unknown'}`}>
                {testResults?.success ? 'Connected' : testResults?.success === false ? 'Failed' : 'Not Tested'}
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`callout ${
              message.type === 'success' ? 'callout-success' :
              message.type === 'error' ? 'callout-error' :
              'callout-info'
            }`} style={{ marginTop: '1rem' }}>
              {message.text}
            </div>
          )}

          {testResults && (
            <div className="test-results" style={{ marginTop: '1rem' }}>
              <h3>Test Results</h3>
              <div className={`callout ${testResults.success ? 'callout-success' : 'callout-error'}`}>
                <strong>{testResults.message}</strong>
                {testResults.error && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Error Details:</strong> {testResults.error}
                  </div>
                )}
                {testResults.data && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Response:</strong> {JSON.stringify(testResults.data, null, 2)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Configuration Guide</h2>
          </div>
          
          <div className="config-guide">
            <h3>Environment Variables</h3>
            <p>Set one of these environment variables on your server:</p>
            <div className="code-block">
              <code>export PDL_API_KEY=your_api_key_here</code>
            </div>
            <p>Or any of these alternative names:</p>
            <ul>
              <li><code>PEOPLE_DATA_LABS_API_KEY</code></li>
              <li><code>PEOPLEDATALABS_API_KEY</code></li>
              <li><code>PEOPLE_DATALABS_API_KEY</code></li>
              <li><code>PDL_KEY</code></li>
              <li><code>PDLAPIKEY</code></li>
            </ul>

            <h3>Getting Your API Key</h3>
            <ol>
              <li>Visit <a href="https://www.peopledatalabs.com/" target="_blank" rel="noopener noreferrer">People Data Labs</a></li>
              <li>Sign up for an account</li>
              <li>Navigate to your API settings</li>
              <li>Copy your API key</li>
              <li>Set it as an environment variable on your server</li>
              <li>Restart your application</li>
            </ol>

            <h3>API Limits</h3>
            <div className="info-box">
              <p><strong>Free Tier:</strong> 100 requests/month</p>
              <p><strong>Paid Plans:</strong> Starting at $0.10 per request</p>
              <p><strong>Rate Limits:</strong> 10 requests per second</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Available Endpoints</h2>
          </div>
          
          <div className="endpoints-list">
            <div className="endpoint-item">
              <div className="endpoint-name">Person Search</div>
              <div className="endpoint-description">Search for contacts by company, title, location, and other criteria</div>
              <div className="endpoint-path"><code>POST /api/enrich/pdl/search</code></div>
            </div>
            
            <div className="endpoint-item">
              <div className="endpoint-name">Company Enrichment</div>
              <div className="endpoint-description">Enrich company data using domain or company name</div>
              <div className="endpoint-path"><code>POST /api/enrich/pdl/company</code></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Search Parameters</h2>
          </div>
          
          <div className="parameters-list">
            <div className="parameter-group">
              <h4>Basic Filters</h4>
              <ul>
                <li><code>company</code> - Company name</li>
                <li><code>company_domain</code> - Company website domain</li>
                <li><code>title</code> - Job title keywords</li>
                <li><code>location</code> - Geographic location</li>
                <li><code>seniority</code> - Seniority level (manager, director, vp, cxo, owner)</li>
              </ul>
            </div>
            
            <div className="parameter-group">
              <h4>Advanced Filters</h4>
              <ul>
                <li><code>industry</code> - Industry sector</li>
                <li><code>skills</code> - Comma-separated skills</li>
                <li><code>education</code> - Education keywords</li>
                <li><code>summary</code> - Profile summary keywords</li>
                <li><code>experience_level</code> - Experience level (entry, mid, senior, executive)</li>
              </ul>
            </div>
            
            <div className="parameter-group">
              <h4>Pagination</h4>
              <ul>
                <li><code>limit</code> - Number of results (1-25)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Usage Analytics</h2>
            <div className="header-actions">
              <button 
                className="btn btn-secondary" 
                onClick={loadUsageStats}
                disabled={loadingUsage}
              >
                {loadingUsage ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {loadingUsage ? (
            <div className="loading">Loading usage statistics...</div>
          ) : usageStats ? (
            <div className="usage-analytics">
              {usageStats.summary && usageStats.summary.length > 0 ? (
                <div>
                  <h3>Summary (Last {usageStats.period_days} days)</h3>
                  <div className="usage-summary">
                    {usageStats.summary.map((stat, idx) => (
                      <div key={idx} className="usage-stat">
                        <div className="stat-header">
                          <span className="stat-endpoint">{stat.endpoint}</span>
                          <span className="stat-requests">{stat.total_requests} requests</span>
                        </div>
                        <div className="stat-details">
                          <div className="stat-item">
                            <span className="stat-label">Success Rate:</span>
                            <span className="stat-value">
                              {((stat.successful_requests / stat.total_requests) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total Results:</span>
                            <span className="stat-value">{stat.total_results}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Avg Response Time:</span>
                            <span className="stat-value">{Math.round(stat.avg_response_time)}ms</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Last Request:</span>
                            <span className="stat-value">
                              {new Date(stat.last_request).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {usageStats.daily_usage && usageStats.daily_usage.length > 0 && (
                    <div>
                      <h3>Daily Usage (Last 7 days)</h3>
                      <div className="daily-usage">
                        {usageStats.daily_usage.map((day, idx) => (
                          <div key={idx} className="daily-stat">
                            <div className="daily-date">{new Date(day.date).toLocaleDateString()}</div>
                            <div className="daily-requests">{day.requests} requests</div>
                            <div className="daily-results">{day.results} results</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No usage data available yet. Make some PDL API calls to see analytics.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>Unable to load usage statistics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PDLConfiguration;