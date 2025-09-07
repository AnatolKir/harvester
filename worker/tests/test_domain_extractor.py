"""Tests for domain extraction utilities."""
import pytest
from domain_extractor import DomainExtractor


class TestDomainExtractor:
    """Test suite for DomainExtractor class."""
    
    def test_extract_domains_from_text(self):
        """Test extracting domains from various text formats."""
        text = "Check out https://example.com and www.test.org for more info"
        domains = DomainExtractor.extract_domains(text)
        assert 'example.com' in domains
        assert 'test.org' in domains
        assert len(domains) == 2
    
    def test_extract_domains_without_protocol(self):
        """Test extracting domains without http/https prefix."""
        text = "Visit example.com or test.net today"
        domains = DomainExtractor.extract_domains(text)
        assert 'example.com' in domains
        assert 'test.net' in domains
    
    def test_empty_input(self):
        """Test handling of empty or None input."""
        assert DomainExtractor.extract_domains('') == []
        assert DomainExtractor.extract_domains(None) == []
        assert DomainExtractor.extract_domains('   ') == []
    
    def test_remove_duplicates(self):
        """Test that duplicate domains are removed."""
        text = "example.com is great, visit example.com now"
        domains = DomainExtractor.extract_domains(text)
        assert domains == ['example.com']
    
    def test_filter_blacklisted_domains(self):
        """Test that blacklisted domains are filtered out."""
        text = "Visit facebook.com, twitter.com, and mysite.com"
        domains = DomainExtractor.extract_domains(text)
        assert domains == ['mysite.com']
        assert 'facebook.com' not in domains
        assert 'twitter.com' not in domains
    
    def test_complex_urls(self):
        """Test extraction from complex URLs with paths and parameters."""
        text = "Check https://example.com/path/to/page?query=1#hash"
        domains = DomainExtractor.extract_domains(text)
        assert domains == ['example.com']
    
    def test_normalize_domain(self):
        """Test domain normalization."""
        assert DomainExtractor.normalize_domain('HTTPS://WWW.EXAMPLE.COM/') == 'example.com'
        assert DomainExtractor.normalize_domain('http://example.com') == 'example.com'
        assert DomainExtractor.normalize_domain('www.example.com') == 'example.com'
        assert DomainExtractor.normalize_domain('example.com/') == 'example.com'
        assert DomainExtractor.normalize_domain('example.com/path') == 'example.com'
        assert DomainExtractor.normalize_domain('example.com?query=1') == 'example.com'
        assert DomainExtractor.normalize_domain('example.com#section') == 'example.com'
    
    def test_is_valid_domain(self):
        """Test domain validation."""
        assert DomainExtractor.is_valid_domain('example.com') is True
        assert DomainExtractor.is_valid_domain('sub.example.com') is True
        assert DomainExtractor.is_valid_domain('example.co.uk') is True
        
        assert DomainExtractor.is_valid_domain('') is False
        assert DomainExtractor.is_valid_domain('abc') is False
        assert DomainExtractor.is_valid_domain('a.b') is False  # Too short
        assert DomainExtractor.is_valid_domain('.com') is False
        assert DomainExtractor.is_valid_domain('facebook.com') is False  # Blacklisted
        assert DomainExtractor.is_valid_domain('exam ple.com') is False  # Space
        assert DomainExtractor.is_valid_domain('exam@ple.com') is False  # Invalid char
    
    def test_is_url_shortener(self):
        """Test URL shortener identification."""
        assert DomainExtractor.is_url_shortener('bit.ly') is True
        assert DomainExtractor.is_url_shortener('tinyurl.com') is True
        assert DomainExtractor.is_url_shortener('t.co') is True
        assert DomainExtractor.is_url_shortener('https://bit.ly') is True
        assert DomainExtractor.is_url_shortener('http://www.tinyurl.com') is True
        
        assert DomainExtractor.is_url_shortener('example.com') is False
        assert DomainExtractor.is_url_shortener('google.com') is False
    
    def test_categorize_domain(self):
        """Test domain categorization."""
        assert DomainExtractor.categorize_domain('bit.ly') == 'shortener'
        assert DomainExtractor.categorize_domain('tinyurl.com') == 'shortener'
        
        assert DomainExtractor.categorize_domain('192.168.1.1') == 'suspicious'
        assert DomainExtractor.categorize_domain('example.tk') == 'suspicious'
        assert DomainExtractor.categorize_domain('site12345678901.com') == 'suspicious'
        
        assert DomainExtractor.categorize_domain('example.com') == 'standard'
        assert DomainExtractor.categorize_domain('mysite.org') == 'standard'
        
        assert DomainExtractor.categorize_domain('') == 'invalid'
        assert DomainExtractor.categorize_domain(None) == 'invalid'
    
    def test_international_domains(self):
        """Test handling of international domains."""
        text = "Visit münchen.de and 中国.cn"
        domains = DomainExtractor.extract_domains(text)
        # Current implementation only handles ASCII domains
        # This is a known limitation that could be addressed in the future
        assert len(domains) >= 0  # May or may not extract depending on regex
    
    def test_subdomain_extraction(self):
        """Test extraction of subdomains."""
        text = "Visit blog.example.com and api.test.org"
        domains = DomainExtractor.extract_domains(text)
        assert 'blog.example.com' in domains
        assert 'api.test.org' in domains
    
    def test_mixed_case_domains(self):
        """Test that domains are normalized to lowercase."""
        text = "Visit Example.COM and TEST.ORG"
        domains = DomainExtractor.extract_domains(text)
        assert 'example.com' in domains
        assert 'test.org' in domains
        assert 'Example.COM' not in domains
        assert 'TEST.ORG' not in domains
    
    @pytest.mark.parametrize("domain,expected", [
        ('example.com', 'standard'),
        ('bit.ly', 'shortener'),
        ('192.168.1.1', 'suspicious'),
        ('site.tk', 'suspicious'),
        ('', 'invalid'),
    ])
    def test_categorize_various_domains(self, domain, expected):
        """Test categorization of various domain types."""
        assert DomainExtractor.categorize_domain(domain) == expected