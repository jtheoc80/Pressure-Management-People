# Installation & Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Start the Application

**Option A: Start Both (Recommended)**
```bash
npm start
```
This will start both the backend server and frontend development server concurrently.

**Option B: Start Separately**
```bash
# Terminal 1 - Backend (port 5000)
npm run server

# Terminal 2 - Frontend (port 3000)
npm run client
```

### 3. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## Detailed Setup

### Prerequisites

- **Node.js**: v14.0.0 or higher
- **npm**: v6.0.0 or higher

Check your versions:
```bash
node --version
npm --version
```

### Database Setup

The application uses SQLite, which requires no separate installation or configuration. The database file (`orgchart.db`) will be created automatically on first run with the following schema:

- **organizations**: Store company information
- **contacts**: Store individual contact details
- **projects**: Track projects and activities
- **contact_projects**: Link contacts to projects

### Environment Variables

The application uses default configuration values. To customize:

**Backend** (create `.env` in root):
```env
PORT=5000
NODE_ENV=development
```

**Frontend** (create `.env` in client directory):
```env
REACT_APP_API_URL=http://localhost:5000
```

## Troubleshooting

### Port Already in Use

If port 5000 is already in use:
```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5001 npm run server
```

### Dependencies Issues

If you encounter dependency issues:
```bash
# Clean install
rm -rf node_modules client/node_modules
rm package-lock.json client/package-lock.json
npm install
cd client && npm install
```

### Database Issues

To reset the database:
```bash
rm orgchart.db
npm run server  # Will recreate the database
```

### React Build Issues

If the React app fails to start:
```bash
cd client
npm install --legacy-peer-deps
npm start
```

## Production Deployment

### Build Frontend

```bash
cd client
npm run build
```

This creates an optimized production build in `client/build/`.

### Serve Production Build

Update `server/index.js` to serve the static build:

```javascript
// Add after other middleware
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});
```

Then start the server:
```bash
NODE_ENV=production npm run server
```

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN cd client && npm install && npm run build
EXPOSE 5000
CMD ["npm", "run", "server"]
```

Build and run:
```bash
docker build -t industrial-org-chart .
docker run -p 5000:5000 industrial-org-chart
```

## Data Import

### CSV Import Format

To import contacts from CSV, use this format:

```csv
first_name,last_name,title,department,email,phone,location,level,responsibilities,project_types,notes
John,Doe,VP Operations,Operations,john@example.com,555-0100,Houston TX,1,Plant operations oversight,Turnaround/Shutdown,Key decision maker
```

### API-Based Import

See `server/api-integrations.js` for examples of importing from:
- ZoomInfo API
- Apollo.io API
- Clearbit API
- Custom CRM systems

## Testing

### Backend Testing
```bash
# Test API health
curl http://localhost:5000/api/health
```

### Frontend Testing
```bash
cd client
npm test
```

## Security Considerations

1. **Never commit sensitive data** to version control
2. **Use environment variables** for API keys and secrets
3. **Enable HTTPS** in production
4. **Implement authentication** before deploying
5. **Regular backups** of the SQLite database

## Support

For issues or questions:
1. Check the main README.md
2. Review error logs
3. Ensure all dependencies are correctly installed
4. Verify Node.js and npm versions

---

**Ready to go!** Your Industrial Org Chart application should now be running successfully.
