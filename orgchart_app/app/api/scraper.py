"""
Ethical Web Scraper for Contact Discovery
Respects robots.txt and rate limits
DOES NOT scrape LinkedIn or other prohibited platforms
"""
import requests
import time
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
from flask import Blueprint, request, jsonify
from requests_cache import CachedSession
import logging

# Create blueprint
scraper_bp = Blueprint('scraper', __name__)

# Setup caching to avoid repeated requests
session = CachedSession('contact_scraper_cache', expire_after=3600)

# Rate limiting
RATE_LIMIT_DELAY = 2  # seconds between requests
last_request_time = {}

# Prohibited domains (LinkedIn and similar)
PROHIBITED_DOMAINS = [
    'linkedin.com',
    'facebook.com', 
    'twitter.com',
    'instagram.com',
    'tiktok.com'
]

logger = logging.getLogger(__name__)


def is_allowed_domain(url):
    """Check if domain is allowed to be scraped"""
    domain = urlparse(url).netloc.lower()
    for prohibited in PROHIBITED_DOMAINS:
        if prohibited in domain:
            return False
    return True


def check_robots_txt(url):
    """Check if robots.txt allows scraping this URL"""
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        
        return rp.can_fetch("*", url)
    except:
        # If we can't read robots.txt, be conservative and allow
        return True


def rate_limit(domain):
    """Enforce rate limiting per domain"""
    global last_request_time
    
    now = time.time()
    if domain in last_request_time:
        elapsed = now - last_request_time[domain]
        if elapsed < RATE_LIMIT_DELAY:
            time.sleep(RATE_LIMIT_DELAY - elapsed)
    
    last_request_time[domain] = time.time()


def extract_contacts_from_page(html, base_url):
    """Extract potential contacts from HTML content"""
    soup = BeautifulSoup(html, 'lxml')
    contacts = []
    
    # Find all text that might contain contact information
    text_content = soup.get_text()
    
    # Email regex
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text_content)
    
    # Phone regex (various formats)
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    phones = re.findall(phone_pattern, text_content)
    
    # Look for common contact page patterns
    contact_sections = soup.find_all(['div', 'section', 'article'], class_=re.compile(r'contact|team|people|staff|leadership|executive', re.I))
    
    # Extract structured contact info
    for section in contact_sections:
        # Look for name + title + email patterns
        potential_names = section.find_all(['h2', 'h3', 'h4', 'strong', 'b'])
        for name_elem in potential_names:
            name_text = name_elem.get_text(strip=True)
            
            # Look for associated email and title nearby
            parent = name_elem.find_parent(['div', 'li', 'article'])
            if parent:
                parent_text = parent.get_text()
                
                # Find emails in this context
                context_emails = re.findall(email_pattern, parent_text)
                context_phones = re.findall(phone_pattern, parent_text)
                
                # Try to find title
                title = None
                title_patterns = ['CEO', 'CTO', 'VP', 'President', 'Director', 'Manager', 'Engineer', 'Lead']
                for pattern in title_patterns:
                    if pattern.lower() in parent_text.lower():
                        # Extract sentence containing the title
                        sentences = parent_text.split('.')
                        for sent in sentences:
                            if pattern.lower() in sent.lower():
                                title = sent.strip()[:100]
                                break
                        if title:
                            break
                
                if context_emails:
                    contacts.append({
                        'name': name_text[:100],
                        'email': context_emails[0] if context_emails else None,
                        'phone': context_phones[0] if context_phones else None,
                        'title': title,
                        'source_url': base_url
                    })
    
    # If no structured contacts found, return raw emails/phones
    if not contacts and emails:
        for email in set(emails[:10]):  # Limit to 10
            contacts.append({
                'name': None,
                'email': email,
                'phone': None,
                'title': None,
                'source_url': base_url
            })
    
    return contacts


def find_contact_pages(base_url, soup):
    """Find links to potential contact/team pages"""
    contact_keywords = ['contact', 'about', 'team', 'people', 'staff', 'leadership', 'management', 'executive']
    contact_urls = []
    
    links = soup.find_all('a', href=True)
    for link in links:
        href = link['href']
        text = link.get_text().lower()
        
        # Check if link text or URL contains contact keywords
        if any(keyword in text or keyword in href.lower() for keyword in contact_keywords):
            full_url = urljoin(base_url, href)
            if urlparse(full_url).netloc == urlparse(base_url).netloc:  # Same domain only
                contact_urls.append(full_url)
    
    return list(set(contact_urls))[:5]  # Limit to 5 pages


@scraper_bp.route('/search-contacts', methods=['POST'])
def search_contacts():
    """
    Search for contacts from a given company website
    POST body: { "url": "https://company.com", "max_pages": 3 }
    """
    data = request.get_json()
    target_url = data.get('url')
    max_pages = data.get('max_pages', 3)
    
    if not target_url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Validate URL
    if not target_url.startswith(('http://', 'https://')):
        target_url = 'https://' + target_url
    
    # Check if domain is allowed
    if not is_allowed_domain(target_url):
        return jsonify({
            'error': 'This domain is prohibited. We do not scrape social media or LinkedIn.',
            'prohibited': True
        }), 403
    
    # Check robots.txt
    if not check_robots_txt(target_url):
        return jsonify({
            'error': 'robots.txt prohibits scraping this URL',
            'allowed': False
        }), 403
    
    all_contacts = []
    urls_to_check = [target_url]
    checked_urls = set()
    
    try:
        # Check main page
        domain = urlparse(target_url).netloc
        rate_limit(domain)
        
        response = session.get(target_url, timeout=10, headers={
            'User-Agent': 'Industrial-OrgChart-Bot/1.0 (Contact Discovery; +info@example.com)'
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        
        # Find contact pages
        contact_pages = find_contact_pages(target_url, soup)
        urls_to_check.extend(contact_pages)
        
        # Scrape up to max_pages
        for url in urls_to_check[:max_pages]:
            if url in checked_urls:
                continue
            
            checked_urls.add(url)
            rate_limit(domain)
            
            try:
                resp = session.get(url, timeout=10, headers={
                    'User-Agent': 'Industrial-OrgChart-Bot/1.0 (Contact Discovery)'
                })
                resp.raise_for_status()
                
                contacts = extract_contacts_from_page(resp.content, url)
                all_contacts.extend(contacts)
                
            except Exception as e:
                logger.warning(f"Error scraping {url}: {e}")
                continue
        
        # Remove duplicates based on email
        unique_contacts = []
        seen_emails = set()
        for contact in all_contacts:
            email = contact.get('email')
            if email and email not in seen_emails:
                seen_emails.add(email)
                unique_contacts.append(contact)
            elif not email:
                unique_contacts.append(contact)
        
        return jsonify({
            'success': True,
            'contacts': unique_contacts,
            'pages_checked': len(checked_urls),
            'total_found': len(unique_contacts)
        }), 200
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {e}")
        return jsonify({
            'error': f'Failed to fetch URL: {str(e)}',
            'success': False
        }), 400
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'error': f'Error processing page: {str(e)}',
            'success': False
        }), 500


@scraper_bp.route('/search-company', methods=['POST'])
def search_company_info():
    """
    Search for general company information from website
    POST body: { "url": "https://company.com" }
    """
    data = request.get_json()
    target_url = data.get('url')
    
    if not target_url:
        return jsonify({'error': 'URL is required'}), 400
    
    if not target_url.startswith(('http://', 'https://')):
        target_url = 'https://' + target_url
    
    if not is_allowed_domain(target_url):
        return jsonify({'error': 'Domain is prohibited'}), 403
    
    try:
        domain = urlparse(target_url).netloc
        rate_limit(domain)
        
        response = session.get(target_url, timeout=10, headers={
            'User-Agent': 'Industrial-OrgChart-Bot/1.0'
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        
        # Extract company info
        title = soup.find('title')
        description = soup.find('meta', attrs={'name': 'description'})
        
        company_info = {
            'name': title.get_text(strip=True) if title else None,
            'description': description.get('content') if description else None,
            'url': target_url
        }
        
        return jsonify({
            'success': True,
            'company': company_info
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 400
