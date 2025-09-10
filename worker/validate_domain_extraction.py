#!/usr/bin/env python3
"""
Domain extraction validation script.
Tests extraction against real TikTok comment patterns and calculates precision metrics.
"""
import os
import sys
import json
import re
from typing import List, Dict, Tuple
from datetime import datetime
from supabase import create_client, Client
from domain_extractor import DomainExtractor

# Real TikTok comment patterns for testing
TIKTOK_COMMENT_SAMPLES = [
    # Standard domain mentions
    ("Check out example.com for more info!", ["example.com"], "standard_mention"),
    ("Visit www.mysite.org today!", ["mysite.org"], "www_prefix"),
    ("Go to https://shop.example.com now", ["shop.example.com"], "subdomain_https"),
    
    # Multiple domains
    ("Try site1.com and site2.net for deals", ["site1.com", "site2.net"], "multiple_domains"),
    ("Visit example.com, test.org, and demo.net", ["example.com", "test.org", "demo.net"], "comma_separated"),
    
    # URL shorteners
    ("Link in bio: bit.ly/abc123", ["bit.ly"], "url_shortener"),
    ("Check tinyurl.com/deal", ["tinyurl.com"], "url_shortener"),
    
    # Complex URLs
    ("https://example.com/product?id=123#review", ["example.com"], "complex_url"),
    ("www.site.com/path/to/page", ["site.com"], "url_with_path"),
    
    # Edge cases - should NOT extract
    ("Email me at user@gmail.com", [], "email_not_domain"),
    ("The price is $19.99", [], "price_not_domain"),
    ("Version 2.0.1 released", [], "version_not_domain"),
    ("Meet me at 3.30pm", [], "time_not_domain"),
    
    # Social media mentions (blacklisted)
    ("Follow on instagram.com and facebook.com", [], "blacklisted_social"),
    ("Watch on youtube.com/channel", [], "blacklisted_platform"),
    
    # Mixed content
    ("🔥 Hot deals at myshop.store 🔥", ["myshop.store"], "emoji_content"),
    ("BUY NOW!!! example.com LIMITED TIME", ["example.com"], "caps_exclamation"),
    ("(example.com) <- best site ever", ["example.com"], "parentheses"),
    ("[Visit: test.org]", ["test.org"], "brackets"),
    
    # Typos and edge cases
    ("gmai.com is not gmail", ["gmai.com"], "typo_domain"),
    ("test..com is invalid", [], "double_dot"),
    ("example.c is too short TLD", [], "short_tld"),
    
    # International TLDs
    ("Visit example.co.uk for UK deals", ["example.co.uk"], "country_tld"),
    ("German site: beispiel.de", ["beispiel.de"], "german_tld"),
    
    # Suspicious patterns
    ("192.168.1.1 is local", [], "ip_address_local"),
    ("Visit 123.456.789.0", [], "invalid_ip"),
    ("Cheap stuff at site.tk", ["site.tk"], "suspicious_tld"),
    
    # Real-world TikTok patterns
    ("Link in my b10 💫", [], "bio_typo"),
    ("L1nk 1n bi0 (trying to avoid detection)", [], "leetspeak"),
    ("example dot com", [], "spelled_out"),
    ("example[.]com", [], "bracket_dot"),
    ("example(.)com", [], "paren_dot"),
    
    # Multiple sentences
    ("First visit example.com. Then go to test.org.", ["example.com", "test.org"], "multiple_sentences"),
    ("example.com is great! test.net has deals too!", ["example.com", "test.net"], "exclamation_separated"),
    
    # Subdomains
    ("api.example.com for developers", ["api.example.com"], "api_subdomain"),
    ("blog.site.org has articles", ["blog.site.org"], "blog_subdomain"),
    ("Use app.mobile.example.com", ["app.mobile.example.com"], "nested_subdomain"),
    
    # New TLDs
    ("Visit my.store online", ["my.store"], "new_tld_store"),
    ("Check out cool.app", ["cool.app"], "new_tld_app"),
    ("See our.tech solution", ["our.tech"], "new_tld_tech"),
]

# Additional patterns from real TikTok comments
REAL_TIKTOK_PATTERNS = [
    # Common spam patterns
    ("JOIN NOW & EARN $500 DAILY example.biz", ["example.biz"], "spam_earnings"),
    ("FREE GIVEAWAY 🎁 Enter at giveaway.site", ["giveaway.site"], "giveaway_spam"),
    
    # Affiliate marketing
    ("Use code SAVE20 at checkout: deals.shop", ["deals.shop"], "promo_code"),
    ("Amazon finds at mylinks.page", ["mylinks.page"], "affiliate_links"),
    
    # Creator promotion
    ("My merch at shopname.creator", ["shopname.creator"], "merch_promotion"),
    ("Full video on mysite.tv", ["mysite.tv"], "content_promotion"),
    
    # Crypto/NFT spam
    ("Join crypto.exchange for free BTC", ["crypto.exchange"], "crypto_spam"),
    ("NFT drop at mintsite.io", ["mintsite.io"], "nft_spam"),
]

def validate_extraction(text: str, expected: List[str], category: str) -> Dict:
    """Validate domain extraction for a single test case."""
    extracted = DomainExtractor.extract_domains(text)
    
    # Convert to sets for comparison
    expected_set = set(expected)
    extracted_set = set(extracted)
    
    # Calculate metrics
    true_positives = expected_set & extracted_set
    false_positives = extracted_set - expected_set
    false_negatives = expected_set - extracted_set
    
    is_correct = extracted_set == expected_set
    
    return {
        'text': text,
        'expected': expected,
        'extracted': extracted,
        'category': category,
        'is_correct': is_correct,
        'true_positives': list(true_positives),
        'false_positives': list(false_positives),
        'false_negatives': list(false_negatives),
        'precision': len(true_positives) / len(extracted_set) if extracted_set else 1.0 if not expected_set else 0.0,
        'recall': len(true_positives) / len(expected_set) if expected_set else 1.0 if not extracted_set else 0.0,
    }

def test_database_samples(supabase: Client, limit: int = 100) -> List[Dict]:
    """Test extraction on real database samples."""
    results = []
    
    try:
        # Query recent domain mentions with comments and domains
        response = supabase.from_('domain_mention') \
            .select('mention_text, domain:domain_id(domain_name), comment:comment_id(text)') \
            .order('created_at', desc=True) \
            .limit(limit) \
            .execute()
        
        if response.data:
            for item in response.data:
                if item.get('comment') and item['comment'].get('text') and item.get('domain'):
                    text = item['comment']['text']
                    stored_domain = item['domain']['domain_name']
                    
                    # Re-extract domains from the comment
                    extracted = DomainExtractor.extract_domains(text)
                    
                    # Check if stored domain was correctly extracted
                    result = {
                        'text': text[:200] + '...' if len(text) > 200 else text,
                        'stored_domain': stored_domain,
                        'extracted_domains': extracted,
                        'domain_found': stored_domain in extracted,
                        'extraction_count': len(extracted),
                        'category': 'database_sample'
                    }
                    results.append(result)
    except Exception as e:
        print(f"Database query error: {e}")
    
    return results

def calculate_overall_metrics(test_results: List[Dict]) -> Dict:
    """Calculate overall precision, recall, and F1 score."""
    total_tp = sum(len(r['true_positives']) for r in test_results)
    total_fp = sum(len(r['false_positives']) for r in test_results)
    total_fn = sum(len(r['false_negatives']) for r in test_results)
    
    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    # Category breakdown
    category_stats = {}
    for result in test_results:
        cat = result['category']
        if cat not in category_stats:
            category_stats[cat] = {'correct': 0, 'total': 0}
        category_stats[cat]['total'] += 1
        if result['is_correct']:
            category_stats[cat]['correct'] += 1
    
    return {
        'precision': precision,
        'recall': recall,
        'f1_score': f1_score,
        'total_tests': len(test_results),
        'correct_tests': sum(1 for r in test_results if r['is_correct']),
        'accuracy': sum(1 for r in test_results if r['is_correct']) / len(test_results) if test_results else 0,
        'category_stats': category_stats,
        'total_true_positives': total_tp,
        'total_false_positives': total_fp,
        'total_false_negatives': total_fn
    }

def identify_problem_patterns(test_results: List[Dict]) -> Dict:
    """Identify common patterns in failures."""
    failures = [r for r in test_results if not r['is_correct']]
    
    false_positive_patterns = {}
    false_negative_patterns = {}
    
    for failure in failures:
        # Analyze false positives
        for fp in failure['false_positives']:
            # Categorize the type of false positive
            if re.match(r'^\d+\.\d+\.\d+\.\d+$', fp):
                pattern = 'ip_address'
            elif len(fp.split('.')) > 3:
                pattern = 'excessive_dots'
            elif len(fp) < 5:
                pattern = 'too_short'
            elif re.search(r'\d{5,}', fp):
                pattern = 'excessive_numbers'
            else:
                pattern = 'other'
            
            false_positive_patterns[pattern] = false_positive_patterns.get(pattern, 0) + 1
        
        # Analyze false negatives
        for fn in failure['false_negatives']:
            if '@' in failure['text']:
                pattern = 'email_context'
            elif re.search(r'[^\x00-\x7F]', fn):
                pattern = 'non_ascii'
            elif ' dot ' in failure['text'].lower() or '[.]' in failure['text']:
                pattern = 'obfuscated'
            else:
                pattern = 'other'
            
            false_negative_patterns[pattern] = false_negative_patterns.get(pattern, 0) + 1
    
    return {
        'false_positive_patterns': false_positive_patterns,
        'false_negative_patterns': false_negative_patterns,
        'total_failures': len(failures)
    }

def main():
    """Run comprehensive domain extraction validation."""
    print("=" * 60)
    print("DOMAIN EXTRACTION VALIDATION")
    print("=" * 60)
    print()
    
    # Test with predefined samples
    print("Testing with predefined TikTok comment patterns...")
    test_results = []
    
    all_samples = TIKTOK_COMMENT_SAMPLES + REAL_TIKTOK_PATTERNS
    
    for text, expected, category in all_samples:
        result = validate_extraction(text, expected, category)
        test_results.append(result)
        
        if not result['is_correct']:
            print(f"\n❌ FAILED: {category}")
            print(f"   Text: {text}")
            print(f"   Expected: {expected}")
            print(f"   Extracted: {result['extracted']}")
            if result['false_positives']:
                print(f"   False Positives: {result['false_positives']}")
            if result['false_negatives']:
                print(f"   False Negatives: {result['false_negatives']}")
    
    # Calculate metrics
    metrics = calculate_overall_metrics(test_results)
    
    print("\n" + "=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)
    print(f"\nOverall Metrics:")
    print(f"  Precision: {metrics['precision']:.2%} {'✅ PASS' if metrics['precision'] >= 0.7 else '❌ FAIL (target: ≥70%)'}")
    print(f"  Recall: {metrics['recall']:.2%}")
    print(f"  F1 Score: {metrics['f1_score']:.2%}")
    print(f"  Accuracy: {metrics['accuracy']:.2%} ({metrics['correct_tests']}/{metrics['total_tests']} tests)")
    
    print(f"\nExtraction Statistics:")
    print(f"  True Positives: {metrics['total_true_positives']}")
    print(f"  False Positives: {metrics['total_false_positives']}")
    print(f"  False Negatives: {metrics['total_false_negatives']}")
    
    # Category breakdown
    print("\nAccuracy by Category:")
    for cat, stats in sorted(metrics['category_stats'].items()):
        accuracy = stats['correct'] / stats['total'] if stats['total'] > 0 else 0
        print(f"  {cat}: {accuracy:.1%} ({stats['correct']}/{stats['total']})")
    
    # Problem patterns
    problems = identify_problem_patterns(test_results)
    if problems['false_positive_patterns']:
        print("\nFalse Positive Patterns:")
        for pattern, count in sorted(problems['false_positive_patterns'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {pattern}: {count} occurrences")
    
    if problems['false_negative_patterns']:
        print("\nFalse Negative Patterns:")
        for pattern, count in sorted(problems['false_negative_patterns'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {pattern}: {count} occurrences")
    
    # Test with database samples if available
    if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_KEY'):
        print("\n" + "=" * 60)
        print("TESTING WITH DATABASE SAMPLES")
        print("=" * 60)
        
        supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_KEY')
        )
        
        db_results = test_database_samples(supabase, limit=50)
        if db_results:
            correct = sum(1 for r in db_results if r['domain_found'])
            print(f"\nDatabase Validation:")
            print(f"  Samples tested: {len(db_results)}")
            print(f"  Domains found: {correct}/{len(db_results)} ({correct/len(db_results):.1%})")
            
            # Show some examples
            print("\nSample Results:")
            for i, result in enumerate(db_results[:5]):
                status = "✅" if result['domain_found'] else "❌"
                print(f"  {status} Domain: {result['stored_domain']}")
                print(f"     Extracted: {result['extracted_domains']}")
                print(f"     Text: {result['text'][:100]}...")
                print()
    
    # Final verdict
    print("\n" + "=" * 60)
    print("FINAL VERDICT")
    print("=" * 60)
    
    if metrics['precision'] >= 0.7:
        print("✅ Domain extraction PASSES the 70% precision requirement!")
        print(f"   Achieved precision: {metrics['precision']:.1%}")
    else:
        print("❌ Domain extraction FAILS the 70% precision requirement")
        print(f"   Current precision: {metrics['precision']:.1%}")
        print(f"   Gap to target: {(0.7 - metrics['precision']):.1%}")
        print("\nRecommendations:")
        print("  1. Review and fix false positive patterns")
        print("  2. Improve domain validation logic")
        print("  3. Add more comprehensive blacklisting")
        print("  4. Consider context-aware extraction")
    
    # Save detailed results
    results_file = 'domain_validation_results.json'
    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'problem_patterns': problems,
            'test_results': test_results[:10],  # Save first 10 for reference
            'database_results': db_results[:10] if 'db_results' in locals() else []
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: {results_file}")
    
    return metrics['precision'] >= 0.7

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)