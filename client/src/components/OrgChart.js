import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import './OrgChart.css';

const nodeTypes = {
  custom: CustomNode
};

function CustomNode({ data }) {
  const levelColors = {
    0: { bg: '#dbeafe', border: '#1e40af', text: '#1e3a8a' },
    1: { bg: '#e0e7ff', border: '#4f46e5', text: '#3730a3' },
    2: { bg: '#fce7f3', border: '#ec4899', text: '#9f1239' },
    3: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    4: { bg: '#d1fae5', border: '#10b981', text: '#065f46' }
  };

  const colors = levelColors[data.level] || levelColors[4];

  return (
    <div className="custom-node" style={{ borderColor: colors.border, background: colors.bg }}>
      <div className="node-header" style={{ background: colors.border, color: 'white' }}>
        <div className="node-name">{data.name}</div>
      </div>
      <div className="node-body">
        {data.title && <div className="node-title">{data.title}</div>}
        {data.department && <div className="node-department">{data.department}</div>}
        {data.email && (
          <div className="node-contact">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {data.email}
          </div>
        )}
        {data.phone && (
          <div className="node-contact">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {data.phone}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgChart() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState('vertical');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (contacts.length > 0) {
      generateOrgChart();
    }
  }, [contacts, layout]);

  const loadData = async () => {
    try {
      const [orgRes, contactsRes] = await Promise.all([
        axios.get(`/api/organizations/${id}`),
        axios.get(`/api/organizations/${id}/contacts`)
      ]);
      setOrganization(orgRes.data);
      setContacts(contactsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const generateOrgChart = () => {
    // Build hierarchy
    const contactMap = {};
    const rootContacts = [];

    contacts.forEach(contact => {
      contactMap[contact.id] = { ...contact, children: [] };
    });

    contacts.forEach(contact => {
      if (contact.parent_id && contactMap[contact.parent_id]) {
        contactMap[contact.parent_id].children.push(contactMap[contact.id]);
      } else {
        rootContacts.push(contactMap[contact.id]);
      }
    });

    // Generate nodes and edges
    const newNodes = [];
    const newEdges = [];
    const nodeSpacing = { x: 300, y: 150 };
    let nodeCounter = 0;

    function processNode(contact, level = 0, parentX = 0, index = 0, siblingCount = 1) {
      const x = layout === 'vertical'
        ? parentX + (index - (siblingCount - 1) / 2) * nodeSpacing.x
        : level * nodeSpacing.x;
      const y = layout === 'vertical'
        ? level * nodeSpacing.y
        : index * nodeSpacing.y;

      newNodes.push({
        id: contact.id,
        type: 'custom',
        position: { x, y },
        data: {
          name: `${contact.first_name} ${contact.last_name}`,
          title: contact.title,
          department: contact.department,
          email: contact.email,
          phone: contact.phone,
          level: contact.level
        },
        sourcePosition: layout === 'vertical' ? Position.Bottom : Position.Right,
        targetPosition: layout === 'vertical' ? Position.Top : Position.Left
      });

      contact.children.forEach((child, childIndex) => {
        newEdges.push({
          id: `${contact.id}-${child.id}`,
          source: contact.id,
          target: child.id,
          type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#6b7280'
          },
          style: {
            strokeWidth: 2,
            stroke: '#6b7280'
          }
        });

        processNode(child, level + 1, x, childIndex, contact.children.length);
      });
    }

    rootContacts.forEach((contact, index) => {
      processNode(contact, 0, index * nodeSpacing.x * 2, index, rootContacts.length);
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const exportChart = () => {
    const data = {
      organization: organization,
      contacts: contacts
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${organization.name.replace(/\s+/g, '_')}_org_chart.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">Loading org chart...</div>;
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
    <div className="org-chart-page">
      <div className="chart-header">
        <div>
          <h1 className="page-title">{organization.name} - Organization Chart</h1>
          <p className="page-subtitle">{contacts.length} contacts in hierarchy</p>
        </div>
        <div className="chart-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setLayout(layout === 'vertical' ? 'horizontal' : 'vertical')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            {layout === 'vertical' ? 'Horizontal' : 'Vertical'} Layout
          </button>
          <button className="btn btn-secondary" onClick={exportChart}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <Link to={`/organizations/${id}`} className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Organization
          </Link>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <h3 className="empty-state-title">No contacts to display</h3>
            <p className="empty-state-text">Add contacts to build the organization chart</p>
            <Link to={`/organizations/${id}/contacts/new`} className="btn btn-primary">
              Add First Contact
            </Link>
          </div>
        </div>
      ) : (
        <div className="chart-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const levelColors = ['#1e40af', '#4f46e5', '#ec4899', '#f59e0b', '#10b981'];
                return levelColors[node.data.level] || '#6b7280';
              }}
            />
          </ReactFlow>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="legend-card card">
          <h3 className="card-title">Organizational Levels</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#1e40af' }}></div>
              <span>Executive (C-Level)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#4f46e5' }}></div>
              <span>Senior Management</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#ec4899' }}></div>
              <span>Middle Management</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#f59e0b' }}></div>
              <span>Supervisor/Team Lead</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#10b981' }}></div>
              <span>Individual Contributor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrgChart;
