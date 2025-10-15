# Web Scraper Feature Guide

## 🔍 Overview

The Industrial Org Chart Builder now includes an **ethical web scraper** to help you discover contacts from company websites. This feature automatically searches for contact information on public company pages while respecting website terms of service and robots.txt files.

## ✅ What It Does

- **Searches company websites** for contact information (names, titles, emails, phones)
- **Finds contact pages** automatically (About, Team, Leadership pages)
- **Extracts structured data** from HTML
- **Rate limits requests** to be respectful to websites
- **Caches results** to avoid repeated requests
- **Blocks prohibited domains** (LinkedIn, social media)

## 🚫 What It Does NOT Do

- ❌ Does NOT scrape LinkedIn
- ❌ Does NOT scrape Facebook, Twitter, Instagram, or other social media
- ❌ Does NOT ignore robots.txt
- ❌ Does NOT overwhelm servers with requests
- ❌ Does NOT violate website terms of service

## 🎯 How to Use

### Via the Web Interface

1. **Navigate to the "Web Scraper" section** on the homepage
2. **Enter a company website URL** (e.g., `https://company.com`)
3. **Choose max pages to check** (1-5, default is 3)
4. **Click "Search Contacts"**
5. **Review the results** displayed below the form

The scraper will:
- Check the main page
- Find and check contact/team/about pages
- Extract any contact information found
- Display results with names, titles, emails, and phone numbers

### Via the API

You can also use the scraper programmatically:

#### Search for Contacts

```bash
curl -X POST http://localhost:5000/api/scraper/search-contacts \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "max_pages": 3
  }'
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "name": "John Doe",
      "title": "CEO",
      "email": "john@example.com",
      "phone": "+1-234-567-8900",
      "source_url": "https://example.com/about"
    }
  ],
  "pages_checked": 3,
  "total_found": 1
}
```

#### Get Company Information

```bash
curl -X POST http://localhost:5000/api/scraper/search-company \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com"
  }'
```

## 🔒 Ethical Safeguards

### 1. Prohibited Domains
The scraper **automatically blocks** these domains:
- linkedin.com
- facebook.com
- twitter.com
- instagram.com
- tiktok.com

### 2. robots.txt Compliance
The scraper checks robots.txt files and respects disallow directives.

### 3. Rate Limiting
- **2-second delay** between requests to the same domain
- Prevents overwhelming target servers
- Uses caching to avoid repeated requests

### 4. User Agent
Requests include a clear user agent:
```
Industrial-OrgChart-Bot/1.0 (Contact Discovery; +info@example.com)
```

### 5. Timeout Protection
- 10-second timeout per request
- Prevents hanging on slow servers

## 💡 Best Practices

### Finding Contact Information

1. **Start with the company homepage**: `https://company.com`
2. **Try specific pages** if needed:
   - `https://company.com/about`
   - `https://company.com/team`
   - `https://company.com/leadership`
   - `https://company.com/contact`

3. **Adjust max pages**: 
   - Use 1 for quick checks
   - Use 3-5 for thorough searches

### Using the Results

1. **Review the data** carefully - automated extraction may not be perfect
2. **Verify email addresses** before contacting
3. **Manually add contacts** to your organizations
4. **Keep records** of where data came from (source_url is included)

### Ethical Considerations

✅ **DO:**
- Use for B2B business development
- Scrape publicly available company information
- Respect robots.txt and rate limits
- Keep data private and secure
- Get consent before adding to databases

❌ **DON'T:**
- Scrape personal social media profiles
- Ignore website terms of service
- Use for spam or unsolicited marketing
- Share scraped data publicly
- Overwhelm websites with requests

## 🛠️ Technical Details

### Architecture

```
Frontend (HTML/JS)
    ↓
    POST /api/scraper/search-contacts
    ↓
Flask Blueprint (scraper.py)
    ↓
    ├─ Domain Check (prohibited?)
    ├─ robots.txt Check
    ├─ Rate Limiting
    ├─ HTTP Request (with caching)
    ├─ BeautifulSoup Parsing
    └─ Contact Extraction
    ↓
JSON Response
```

### Dependencies

- **requests**: HTTP client
- **beautifulsoup4**: HTML parsing
- **lxml**: Fast XML/HTML parser
- **requests-cache**: Request caching
- **urllib.robotparser**: robots.txt parsing

### Contact Extraction Logic

The scraper looks for:

1. **Email patterns**: Standard email regex
2. **Phone patterns**: Multiple phone number formats
3. **Name + Title patterns**: 
   - Searches in headers (h2, h3, h4)
   - Looks for common titles (CEO, VP, Director, etc.)
   - Associates nearby contact info with names
4. **Contact sections**:
   - Divs/sections with "contact", "team", "people" classes
   - About pages and leadership sections

## 📊 Example Use Cases

### Use Case 1: New Customer Research
```
Scenario: You're meeting with "Acme Industrial" next week
Action: Scrape https://acmeindustrial.com
Result: Find key executives and decision-makers
Benefit: Prepare targeted talking points
```

### Use Case 2: Building Account Intelligence
```
Scenario: Tracking organizational changes at key accounts
Action: Periodic scraping of customer websites
Result: Detect new hires, promotions, departures
Benefit: Stay current on account relationships
```

### Use Case 3: Industry Event Preparation
```
Scenario: Attending an oil & gas conference
Action: Scrape attendee company websites
Result: Build contact database of likely attendees
Benefit: Know who to network with
```

## 🐛 Troubleshooting

### "Domain is prohibited"
- You're trying to scrape LinkedIn or social media
- Solution: Use the company's official website instead

### "robots.txt prohibits scraping"
- The website blocks automated access
- Solution: Manually gather information or contact the company

### "No contacts found"
- The website structure isn't recognized
- Solution: Try specific pages like /about or /team
- Solution: Manually review the site

### "Request timeout"
- Website is slow or down
- Solution: Try again later or increase timeout

## 🔐 Security & Privacy

### Data Storage
- Scraped data is **only displayed**, not automatically saved
- You must manually add contacts to organizations
- No automatic database updates

### Caching
- Results are cached locally for 1 hour
- Cache location: `contact_scraper_cache.sqlite`
- Clear cache: Delete the cache file

### Logging
- Scraper activities are logged
- Includes URLs accessed and any errors
- Used for debugging and compliance

## 📚 Further Reading

- [robots.txt specification](https://www.robotstxt.org/)
- [Web scraping best practices](https://benbernardblog.com/web-scraping-and-crawling-are-perfectly-legal-right/)
- [GDPR and data collection](https://gdpr.eu/what-is-gdpr/)
- [CAN-SPAM Act](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

## 🎓 Training Recommendations

1. **Always verify** scraped data is accurate
2. **Get permission** before large-scale scraping
3. **Respect opt-outs** and unsubscribe requests
4. **Keep records** of data sources
5. **Review compliance** with legal team if needed

---

**Remember**: This tool is designed for legitimate business intelligence and relationship management. Use it ethically and responsibly! 🤝
