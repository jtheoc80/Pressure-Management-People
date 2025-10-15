# Industrial Org Chart Builder

A comprehensive web application for building and managing visual organization charts for customers in the industrial sector, focusing on maintenance and project-based activities across Oil & Gas, Petrochemical, LNG, and EPC organizations.

## 🎯 Features

- **Multi-Organization Management**: Track multiple customer organizations across different industries
- **Visual Org Charts**: Interactive, hierarchical organization chart visualization with drag-and-zoom capabilities
- **Contact Management**: Detailed contact profiles with roles, responsibilities, and project involvement
- **Industry-Specific Fields**: Tailored data capture for Oil & Gas, Petrochemical, LNG, and EPC sectors
- **Project Tracking**: Link contacts to maintenance and project-based activities
- **Export Capabilities**: Export organizational data for analysis and reporting
- **Responsive Design**: Beautiful, modern UI that works on desktop and mobile devices

## 🏗️ Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for data persistence
- RESTful API architecture
- CORS enabled for frontend-backend communication

### Frontend
- **React 18** with React Router for navigation
- **ReactFlow** for interactive org chart visualization
- **Axios** for API communication
- Modern CSS with responsive design
- Lucide React icons

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Start the application**
   ```bash
   # Start both backend and frontend concurrently
   npm start
   ```

   Or start them separately:
   ```bash
   # Terminal 1 - Start backend (runs on port 5000)
   npm run server
   
   # Terminal 2 - Start frontend (runs on port 3000)
   npm run client
   ```

4. **Access the application**
   - Open your browser and navigate to: `http://localhost:3000`
   - Backend API is available at: `http://localhost:5000/api`

## 📖 Usage Guide

### Creating Your First Organization

1. Click "Add Organization" from the dashboard or organizations page
2. Fill in the organization details:
   - **Name**: Official company name
   - **Industry**: Select from Oil & Gas, Petrochemical, LNG, or EPC
   - **Sector**: Choose the specific sector within the industry
   - **Location**: Headquarters or primary operating location
   - **Notes**: Additional context about the organization

### Adding Contacts

1. Navigate to an organization's detail page
2. Click "Add Contact"
3. Fill in contact information:
   - **Basic Info**: Name, title, department
   - **Contact Details**: Email, phone, location
   - **Organizational Structure**: Set reporting relationships and level
   - **Role Details**: Responsibilities and project involvement

### Building the Org Chart

1. Add contacts with appropriate reporting relationships
2. Click "View Org Chart" to visualize the hierarchy
3. Toggle between vertical and horizontal layouts
4. Use zoom and pan to navigate large organizational structures
5. Export the chart data for external use

## 🔌 API Integration Options

Since LinkedIn scraping is prohibited, here are alternative data sources:

### Recommended Approaches

1. **Manual Data Entry** (Primary Method)
   - Research company websites
   - Review annual reports and SEC filings
   - Check industry association directories
   - Attend industry events and conferences
   - Request organizational charts from clients

2. **Business Intelligence APIs**
   - **ZoomInfo**: B2B contact and company data
   - **Apollo.io**: Sales intelligence and engagement
   - **Clearbit**: Company and contact enrichment
   - **Lusha**: Business contact information

3. **CRM Integration**
   - Salesforce API
   - HubSpot API
   - Microsoft Dynamics 365
   - Zoho CRM

4. **CSV/Excel Import**
   - Import bulk contact data from spreadsheets
   - Standardized template provided

See `server/api-integrations.js` for implementation examples.

## 🎨 Industry-Specific Features

### Oil & Gas
- Sectors: Upstream, Midstream, Downstream, Integrated, Services
- Project types: Turnarounds, capital projects, asset integrity

### Petrochemical
- Sectors: Base Chemicals, Intermediates, Polymers, Specialty Chemicals
- Focus on plant maintenance and expansion projects

### LNG
- Sectors: Liquefaction, Regasification, Trading & Shipping, Storage
- Specialized facility operations tracking

### EPC (Engineering, Procurement, Construction)
- Sectors: Engineering, Procurement, Construction, EPCM, Maintenance
- Project-based organizational structures

## 📊 Database Schema

### Organizations Table
- id, name, industry, sector, location, notes, timestamps

### Contacts Table
- id, org_id, first_name, last_name, title, department
- email, phone, location, parent_id, level
- responsibilities, project_types, notes, timestamps

### Projects Table
- id, org_id, name, type, status, description
- start_date, end_date, timestamp

### Contact_Projects Junction Table
- contact_id, project_id, role

## 🔒 Data Privacy & Compliance

- All data is stored locally in SQLite database
- No third-party data sharing
- Follows ethical data collection practices
- User controls all data entry and management
- Export functionality for data portability

## 🛠️ Development

### Project Structure
```
├── server/
│   ├── index.js              # Express server and API routes
│   └── api-integrations.js   # API integration utilities
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.js           # Main application component
│   │   └── index.js         # React entry point
│   └── package.json
├── package.json
└── README.md
```

### Available Scripts

- `npm start` - Start both backend and frontend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build production frontend

## 🤝 Contributing

This is a specialized application for industrial sector relationship management. Contributions focused on:
- Additional industry-specific features
- Enhanced visualization options
- Integration with business intelligence platforms
- Mobile app development

## 📝 License

MIT License

## 🆘 Support

For issues, questions, or feature requests, please refer to the documentation or contact the development team.

---

**Note**: This application is designed for business relationship management in the industrial sector. All data collection should follow ethical practices and respect privacy regulations. Never scrape LinkedIn or other platforms without proper authorization.
