import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';
import OrganizationList from './components/OrganizationList';
import OrganizationDetail from './components/OrganizationDetail';
import OrgChart from './components/OrgChart';
import AddOrganization from './components/AddOrganization';
import AddContact from './components/AddContact';
import Dashboard from './components/Dashboard';
import SalesAssist from './components/SalesAssist';
import OrgChartBuilder from './components/OrgChartBuilder';
import PDLConfiguration from './components/PDLConfiguration';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/organizations" element={<OrganizationList />} />
            <Route path="/organizations/new" element={<AddOrganization />} />
            <Route path="/organizations/:id" element={<OrganizationDetail />} />
            <Route path="/organizations/:id/chart" element={<OrgChart />} />
            <Route path="/organizations/:id/contacts/new" element={<AddContact />} />
            <Route path="/sales-assist" element={<SalesAssist />} />
            <Route path="/chart-builder" element={<OrgChartBuilder />} />
            <Route path="/pdl-config" element={<PDLConfiguration />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Industrial Org Chart</span>
        </Link>
        <nav className="nav-menu">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/organizations" className="nav-link">Organizations</Link>
          <Link to="/sales-assist" className="nav-link">Sales Assist</Link>
          <Link to="/chart-builder" className="nav-link">Chart Builder</Link>
          <Link to="/pdl-config" className="nav-link">PDL Config</Link>
        </nav>
      </div>
    </header>
  );
}

export default App;
