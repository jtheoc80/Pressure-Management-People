# Quick Start Guide

Get up and running with Industrial Org Chart Builder in 5 minutes!

## 🚀 Setup (2 minutes)

```bash
# 1. Install all dependencies
npm install && cd client && npm install && cd ..

# 2. Start the application
npm start
```

That's it! The application will open automatically at http://localhost:3000

## 📝 First Steps (3 minutes)

### 1. Create Your First Organization

1. Click **"Add Organization"** on the dashboard
2. Fill in the details:
   - **Name**: e.g., "Chevron Corporation"
   - **Industry**: Select "Oil & Gas"
   - **Sector**: Choose "Integrated"
   - **Location**: "Houston, TX"
3. Click **"Create Organization"**

### 2. Add Key Contacts

1. From the organization page, click **"Add Contact"**
2. Start with the top executive:
   - **First Name**: Jane
   - **Last Name**: Smith
   - **Title**: CEO
   - **Department**: Executive Management
   - **Email**: jane.smith@example.com
   - **Reports To**: Leave as "No direct report (top level)"
   - **Level**: Executive (C-Level)
3. Click **"Add Contact"**

4. Add a second contact that reports to the first:
   - **Name**: John Doe
   - **Title**: VP of Operations
   - **Department**: Operations
   - **Reports To**: Select "Jane Smith"
   - **Level**: Senior Management
5. Click **"Add Contact"**

### 3. View Your Org Chart

1. Click **"View Org Chart"** from the organization page
2. See your organizational hierarchy visualized!
3. Try:
   - **Zoom**: Use mouse wheel or controls
   - **Pan**: Click and drag
   - **Switch Layout**: Click "Horizontal Layout" button
   - **Export**: Click "Export" to save data

## 🎯 Key Features to Explore

### Dashboard
- View statistics across all organizations
- See industry distribution
- Quick access to recent organizations

### Organizations
- Search and filter by industry
- Manage multiple customer organizations
- Track contacts and projects per organization

### Org Charts
- Interactive, zoomable visualization
- Color-coded by organizational level:
  - 🔵 **Blue**: Executive (C-Level)
  - 🟣 **Purple**: Senior Management
  - 🌸 **Pink**: Middle Management
  - 🟡 **Yellow**: Supervisor/Team Lead
  - 🟢 **Green**: Individual Contributor
- Switch between vertical and horizontal layouts
- Export organizational data

### Contact Management
- Detailed profiles with responsibilities
- Link to project types
- Track reporting relationships
- Store contact information

## 💡 Best Practices

### Building Org Charts

1. **Start at the Top**: Begin with executives and work down
2. **Set Relationships**: Always specify "Reports To" for accurate hierarchy
3. **Be Detailed**: Add responsibilities and project types
4. **Keep Updated**: Review quarterly and after org changes

### Data Collection

- ✅ Use company websites and public sources
- ✅ Leverage industry events and conferences
- ✅ Request information directly from clients
- ✅ Use paid business intelligence platforms
- ❌ Never scrape LinkedIn or other sites
- See **DATA-COLLECTION-GUIDE.md** for detailed ethical methods

### Organization

1. **One Org per Customer**: Create separate organizations for each company
2. **Detailed Notes**: Use the notes field for relationship context
3. **Regular Updates**: Set reminders to verify contact information
4. **Export Backups**: Periodically export data for backup

## 🎨 Industry Templates

### Oil & Gas Organization
```
CEO → VP Operations → Operations Manager → Supervisors
   → VP Engineering → Engineering Manager → Engineers
   → VP HSE → HSE Manager → Safety Officers
   → VP Maintenance → Maintenance Manager → Technicians
```

### EPC Organization
```
CEO → VP Projects → Program Manager → Project Managers
   → VP Engineering → Discipline Leads → Engineers
   → VP Construction → Construction Manager → Superintendents
   → VP Procurement → Procurement Manager → Buyers
```

### Petrochemical Plant
```
Plant Manager → Operations Manager → Unit Supervisors → Operators
             → Maintenance Manager → Maintenance Supervisors → Mechanics
             → Technical Manager → Process Engineers
             → HSE Manager → Safety Specialists
```

## 📊 Sample Data

Want to see the app in action? Import the sample CSV:

1. Use **sample-import-template.csv** as a reference
2. Manually add the contacts from the template
3. View the resulting org chart
4. Modify and adapt for your needs

## 🔧 Troubleshooting

### Can't Connect to Server
```bash
# Make sure backend is running
npm run server
```

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run server
```

### Dependencies Issue
```bash
# Clean reinstall
rm -rf node_modules client/node_modules
npm install && cd client && npm install
```

## 📚 Next Steps

- **Read DATA-COLLECTION-GUIDE.md** for ethical data collection methods
- **Check INSTALLATION.md** for deployment options
- **Review server/api-integrations.js** for API integration examples
- **Explore the full README.md** for comprehensive documentation

## 🎯 Common Use Cases

### Business Development
- Map customer organizations before sales calls
- Identify key decision-makers
- Track relationships over time
- Prepare targeted proposals

### Project Management
- Identify project stakeholders
- Build communication plans
- Track project contacts
- Manage client relationships

### Account Management
- Maintain customer organizational intelligence
- Track personnel changes
- Build relationship depth
- Plan strategic engagement

## 💼 Example Workflow

1. **Before Industry Conference**
   - Review org charts for companies attending
   - Identify key contacts to meet
   - Update with new information gathered

2. **During Business Development**
   - Research target company structure
   - Map decision-making hierarchy
   - Identify influencers and stakeholders
   - Prepare customized approach

3. **During Project Execution**
   - Track all customer stakeholders
   - Document communication paths
   - Update as personnel changes occur
   - Maintain relationship continuity

## 📞 Support Resources

- **Installation Help**: See INSTALLATION.md
- **Data Collection**: See DATA-COLLECTION-GUIDE.md
- **API Integration**: See server/api-integrations.js
- **Full Documentation**: See README.md

---

**You're ready to go!** Start building your industrial sector organizational intelligence today. 🎉

Remember: Quality data comes from ethical collection methods and direct relationships. Focus on building genuine connections with your customers, and use this tool to organize and leverage that intelligence effectively.
