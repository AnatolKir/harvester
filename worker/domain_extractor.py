"""Domain extraction utilities for TikTok comments."""
import re
from typing import List, Set, Optional
from urllib.parse import urlparse

class DomainExtractor:
    """Extract and normalize domains from text content."""
    
    # URL pattern to match domains (negative lookbehind to exclude emails)
    DOMAIN_PATTERN = re.compile(
        r'(?<![@])(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})',
        re.IGNORECASE
    )
    
    # URL shorteners to identify
    URL_SHORTENERS = {
        'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co',
        'buff.ly', 'short.link', 'surl.li', 'is.gd', 'cli.gs'
    }
    
    # Domains to exclude from extraction
    BLACKLISTED_DOMAINS = {
        'tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com',
        'youtube.com', 'google.com', 'amazon.com', 'apple.com'
    }
    
    @classmethod
    def extract_domains(cls, text: str) -> List[str]:
        """Extract domains from text."""
        if not text:
            return []
        
        domains = set()
        matches = cls.DOMAIN_PATTERN.finditer(text)
        
        for match in matches:
            domain = cls.normalize_domain(match.group(1))
            if domain and cls.is_valid_domain(domain):
                domains.add(domain)
        
        return list(domains)
    
    @classmethod
    def normalize_domain(cls, domain: str) -> Optional[str]:
        """Normalize a domain to a consistent format."""
        if not domain:
            return None
        
        # Convert to lowercase and strip whitespace
        normalized = domain.lower().strip()
        
        # Remove protocol and www if present
        normalized = re.sub(r'^(?:https?://)?(?:www\.)?', '', normalized)
        
        # Remove trailing slash and path
        normalized = normalized.split('/')[0]
        normalized = normalized.split('?')[0]
        normalized = normalized.split('#')[0]
        
        return normalized if normalized else None
    
    @classmethod
    def is_valid_domain(cls, domain: str) -> bool:
        """Check if a domain is valid and not blacklisted."""
        if not domain or len(domain) < 4:
            return False
        
        # Check if domain starts or ends with a dot
        if domain.startswith('.') or domain.endswith('.'):
            return False
        
        # Check if blacklisted
        if domain in cls.BLACKLISTED_DOMAINS:
            return False
        
        # Basic validation
        parts = domain.split('.')
        if len(parts) < 2:
            return False
        
        # Check TLD is at least 2 chars
        tld = parts[-1]
        if len(tld) < 2:
            return False
        
        # Check for valid characters
        if not re.match(r'^[a-z0-9.-]+$', domain):
            return False
        
        return True
    
    @classmethod
    def is_url_shortener(cls, domain: str) -> bool:
        """Check if a domain is a known URL shortener."""
        normalized = cls.normalize_domain(domain)
        return normalized in cls.URL_SHORTENERS if normalized else False
    
    @classmethod
    def categorize_domain(cls, domain: str) -> str:
        """Categorize a domain based on its characteristics."""
        normalized = cls.normalize_domain(domain)
        if not normalized:
            return 'invalid'
        
        if cls.is_url_shortener(normalized):
            return 'shortener'
        
        # Check for IP addresses
        if re.match(r'^\d+\.\d+\.\d+\.\d+$', normalized):
            return 'suspicious'
        
        # Check for suspicious TLDs
        suspicious_tlds = {'.tk', '.ml', '.ga', '.cf'}
        for tld in suspicious_tlds:
            if normalized.endswith(tld):
                return 'suspicious'
        
        # Check for excessive numbers
        if len(re.findall(r'\d', normalized)) > 10:
            return 'suspicious'
        
        return 'standard'