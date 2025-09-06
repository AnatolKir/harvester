#!/usr/bin/env python3
"""
TikTok Domain Harvester - Database Seeder
Generates realistic test data for development and demo environments.
"""

import os
import sys
import random
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import json

# Third-party imports (these need to be installed)
try:
    from supabase import create_client, Client
    from faker import Faker
    from tqdm import tqdm
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Error: Missing required dependencies: {e}")
    print("Please install: pip install supabase faker tqdm python-dotenv")
    sys.exit(1)

# Load environment variables from .env file
from pathlib import Path
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    print(f"Looking for .env at: {env_path}")
    sys.exit(1)

# Initialize clients
fake = Faker()
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Seed configuration
SEED_CONFIG = {
    'videos': 75,           # Number of videos to create
    'comments_per_video': (5, 20),  # Min/max comments per video
    'domains_pool': 150,    # Total unique domains to create
    'domain_mention_rate': 0.15,  # Percentage of comments that mention domains
    'suspicious_domain_rate': 0.20,  # Percentage of domains marked as suspicious
    'verified_domain_rate': 0.10,   # Percentage of domains marked as verified
    'days_back': 30,        # Generate data for last N days
}

# Realistic TikTok data patterns
TIKTOK_USERNAMES = [
    'fashionista_maya', 'techbro_jake', 'foodie_sarah', 'traveler_alex',
    'fitness_guru23', 'makeup_queen', 'gamer_mike', 'plantmom_lisa',
    'entrepreneur_sam', 'dancer_zoe', 'photographer_ben', 'chef_maria',
    'musiclover_ty', 'artist_emma', 'blogger_kate', 'runner_jason',
    'bookworm_anna', 'comedian_ryan', 'yogi_jen', 'creator_max',
    'lifestyle_lucy', 'teacher_omar', 'nurse_kim', 'student_alex',
    'designer_nina', 'writer_david', 'model_sophia', 'actor_noah',
    'singer_grace', 'developer_leo', 'photographer_mia', 'chef_carlos',
    'dancer_aisha', 'artist_ethan', 'blogger_olivia', 'runner_marcus',
    'fashionista_zara', 'gamer_lily', 'foodie_james', 'traveler_ruby',
]

VIDEO_CAPTIONS = [
    "Just dropped my latest skincare routine! Link in bio 💫 #skincare #beauty",
    "Try this amazing weight loss supplement that changed my life! 🔥 #fitness #weightloss",
    "Found the best deals on fashion items! Check it out 👗 #fashion #deals",
    "This crypto investment strategy is insane! 💰 #crypto #investment #finance",
    "New dropshipping course available now! Start earning today 📈 #entrepreneur #business",
    "Amazing gadgets that will blow your mind! 🤯 #tech #gadgets #amazon",
    "Best travel deals I've found this year! ✈️ #travel #deals #vacation",
    "This makeup tutorial is everything! Products linked 💄 #makeup #beauty #tutorial",
    "Finally found a side hustle that actually works! 💸 #sidehustle #money #workfromhome",
    "These supplements changed my energy levels! 💊 #health #wellness #supplements",
    "New online course launched! Limited time offer 📚 #education #onlinecourse #skills",
    "Best productivity apps for entrepreneurs! 📱 #productivity #business #apps",
    "This investment opportunity is incredible! 📊 #investing #stocks #finance",
    "Found the perfect work from home setup! 🏠 #workfromhome #setup #productivity",
    "New affiliate program with amazing commissions! 💰 #affiliate #marketing #income",
]

COMMENT_TEMPLATES = [
    # Comments with domains
    "Check out {domain} for amazing deals!",
    "I got mine from {domain} and it's incredible",
    "Visit {domain} for the best prices",
    "Found this on {domain} - game changer!",
    "Use code SAVE20 at {domain}",
    "{domain} has the best selection",
    "Just ordered from {domain} - can't wait!",
    "Link: {domain}/special-offer",
    "Go to {domain} now before it's sold out",
    "I work with {domain} and love their products",
    
    # Regular comments without domains
    "This is so helpful, thank you!",
    "I need to try this ASAP",
    "Love your content! Keep it up 💕",
    "Where did you get this info?",
    "This changed my life!",
    "Can you make a tutorial about this?",
    "I've been looking for something like this",
    "Amazing results! How long did it take?",
    "Is this actually legit?",
    "First! Love your videos",
    "This is exactly what I needed",
    "Thank you for sharing this!",
    "How much does it cost?",
    "I'm definitely trying this",
    "Your content is always so good",
    "Been following you for years!",
    "This looks too good to be true",
    "I'm so inspired by you",
    "Please make more videos like this",
    "You're my favorite creator",
]

# Domain patterns for realistic generation
DOMAIN_PATTERNS = {
    'ecommerce': [
        'shop', 'store', 'mart', 'deals', 'buy', 'sale', 'market', 'bazaar',
        'outlet', 'wholesale', 'retail', 'express', 'direct', 'online'
    ],
    'health': [
        'health', 'wellness', 'fit', 'nutrition', 'supplement', 'vitamin',
        'organic', 'natural', 'pure', 'bio', 'life', 'care', 'med'
    ],
    'business': [
        'biz', 'pro', 'success', 'wealth', 'money', 'profit', 'income',
        'entrepreneur', 'startup', 'venture', 'invest', 'trade', 'earn'
    ],
    'tech': [
        'tech', 'digital', 'cyber', 'web', 'net', 'app', 'soft', 'sys',
        'data', 'cloud', 'smart', 'ai', 'crypto', 'blockchain'
    ],
    'fashion': [
        'style', 'fashion', 'trend', 'chic', 'glamour', 'boutique',
        'couture', 'design', 'wear', 'closet', 'outfit', 'look'
    ]
}

TLDS = ['.com', '.org', '.net', '.shop', '.store', '.online', '.xyz', '.io', 
        '.co', '.biz', '.info', '.pro', '.club', '.site', '.space', '.top']

SUSPICIOUS_KEYWORDS = [
    'get-rich', 'make-money-fast', 'crypto-gains', 'instant-profit',
    'weight-loss-miracle', 'anti-aging-secret', 'free-money',
    'bitcoin-doubler', 'investment-scam', 'fake-reviews'
]


class DatabaseSeeder:
    """Handles seeding realistic test data into the TikTok Domain Harvester database."""
    
    def __init__(self):
        self.videos_data = []
        self.comments_data = []
        self.domains_data = []
        self.domain_mentions_data = []
        self.domain_lookup = {}  # domain_name -> domain_id mapping
        
    def clear_existing_data(self):
        """Clear all existing data from tables (idempotent operation)."""
        print("🧹 Clearing existing data...")
        
        # Delete in order to respect foreign key constraints
        tables = ['domain_mention', 'comment', 'domain', 'video']
        
        for table in tables:
            try:
                result = supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                print(f"   Cleared {len(result.data) if result.data else 0} records from {table}")
            except Exception as e:
                print(f"   Warning: Could not clear {table}: {e}")
    
    def generate_video_data(self) -> List[Dict[str, Any]]:
        """Generate realistic TikTok video data."""
        print(f"📹 Generating {SEED_CONFIG['videos']} videos...")
        
        videos = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=SEED_CONFIG['days_back'])
        
        for i in tqdm(range(SEED_CONFIG['videos']), desc="Videos"):
            posted_at = fake.date_time_between(start_date=start_date, end_date=end_date)
            discovered_at = posted_at + timedelta(minutes=random.randint(5, 120))
            last_crawled = discovered_at + timedelta(minutes=random.randint(10, 300))
            
            video = {
                'video_id': str(random.randint(7000000000000000000, 7999999999999999999)),
                'username': random.choice(TIKTOK_USERNAMES),
                'caption': random.choice(VIDEO_CAPTIONS),
                'video_url': f"https://www.tiktok.com/@{random.choice(TIKTOK_USERNAMES)}/video/{random.randint(7000000000000000000, 7999999999999999999)}",
                'thumbnail_url': f"https://p16-sign-sg.tiktokcdn.com/obj/{fake.uuid4()}",
                'view_count': random.randint(1000, 5000000),
                'like_count': random.randint(50, 500000),
                'comment_count': random.randint(10, 10000),
                'share_count': random.randint(5, 50000),
                'is_promoted': True,
                'is_active': True,
                'posted_at': posted_at.isoformat(),
                'discovered_at': discovered_at.isoformat(),
                'last_crawled_at': last_crawled.isoformat(),
                'metadata': json.dumps({
                    'region': random.choice(['US', 'US-WEST', 'US-EAST']),
                    'ad_type': random.choice(['promoted', 'spark_ads', 'brand_takeover']),
                    'campaign_id': fake.uuid4()[:8]
                })
            }
            videos.append(video)
            
        return videos
    
    def generate_domains(self) -> List[Dict[str, Any]]:
        """Generate realistic domain data."""
        print(f"🌐 Generating {SEED_CONFIG['domains_pool']} domains...")
        
        domains = []
        domain_names = set()
        
        # Generate a mix of domain types
        for i in tqdm(range(SEED_CONFIG['domains_pool']), desc="Domains"):
            category = random.choice(list(DOMAIN_PATTERNS.keys()))
            keyword = random.choice(DOMAIN_PATTERNS[category])
            
            # Create domain variations
            variations = [
                f"{keyword}{random.randint(1, 999)}",
                f"get{keyword}",
                f"best{keyword}",
                f"{keyword}now",
                f"{keyword}pro",
                f"my{keyword}",
                f"{keyword}hub",
                f"{keyword}zone"
            ]
            
            domain_base = random.choice(variations)
            tld = random.choice(TLDS)
            domain_name = f"{domain_base}{tld}"
            
            # Ensure uniqueness
            counter = 1
            while domain_name in domain_names:
                domain_name = f"{domain_base}{counter}{tld}"
                counter += 1
            
            domain_names.add(domain_name)
            
            # Determine if domain is suspicious
            is_suspicious = (
                random.random() < SEED_CONFIG['suspicious_domain_rate'] or
                any(sus in domain_name for sus in SUSPICIOUS_KEYWORDS)
            )
            
            # Verified domains are never suspicious
            is_verified = (
                random.random() < SEED_CONFIG['verified_domain_rate'] and
                not is_suspicious
            )
            
            first_seen = fake.date_time_between(
                start_date=datetime.now() - timedelta(days=SEED_CONFIG['days_back']),
                end_date=datetime.now()
            )
            
            domain = {
                'domain_name': domain_name,
                'tld': tld.replace('.', ''),
                'subdomain': 'www' if random.random() < 0.3 else None,
                'is_suspicious': is_suspicious,
                'is_verified': is_verified,
                'mention_count': 0,  # Will be updated by triggers
                'first_seen_at': first_seen.isoformat(),
                'last_seen_at': first_seen.isoformat(),
                'notes': f"Auto-generated {category} domain" if is_suspicious else None,
                'metadata': json.dumps({
                    'category': category,
                    'auto_generated': True,
                    'risk_score': random.randint(1, 10) if is_suspicious else random.randint(1, 3)
                })
            }
            domains.append(domain)
            
        return domains
    
    def generate_comments_and_mentions(self, video_ids: List[str], domain_ids: List[str]) -> Tuple[List[Dict], List[Dict]]:
        """Generate comments and domain mentions."""
        print("💬 Generating comments and domain mentions...")
        
        comments = []
        mentions = []
        
        total_comments = 0
        for video_id in video_ids:
            num_comments = random.randint(*SEED_CONFIG['comments_per_video'])
            total_comments += num_comments
            
        pbar = tqdm(total=total_comments, desc="Comments & Mentions")
        
        for video_id in video_ids:
            num_comments = random.randint(*SEED_CONFIG['comments_per_video'])
            
            for _ in range(num_comments):
                # Decide if this comment will mention a domain
                will_mention_domain = random.random() < SEED_CONFIG['domain_mention_rate']
                
                if will_mention_domain and domain_ids:
                    # Choose a domain and create comment with domain mention
                    domain_id = random.choice(domain_ids)
                    domain_name = self.domain_lookup[domain_id]
                    
                    # Choose a template that includes domain
                    template = random.choice([t for t in COMMENT_TEMPLATES if '{domain}' in t])
                    comment_text = template.format(domain=domain_name)
                else:
                    # Regular comment without domain
                    comment_text = random.choice([t for t in COMMENT_TEMPLATES if '{domain}' not in t])
                
                posted_at = fake.date_time_between(
                    start_date=datetime.now() - timedelta(days=SEED_CONFIG['days_back']),
                    end_date=datetime.now()
                )
                discovered_at = posted_at + timedelta(minutes=random.randint(1, 60))
                
                comment = {
                    'video_id': video_id,
                    'comment_id': str(random.randint(7000000000000000000, 7999999999999999999)),
                    'username': fake.user_name(),
                    'text': comment_text,
                    'like_count': random.randint(0, 1000),
                    'reply_count': random.randint(0, 50),
                    'is_reply': random.random() < 0.2,
                    'posted_at': posted_at.isoformat(),
                    'discovered_at': discovered_at.isoformat(),
                    'metadata': json.dumps({
                        'language': 'en',
                        'platform': 'tiktok',
                        'extraction_method': 'api'
                    })
                }
                comments.append(comment)
                
                # Create domain mention if applicable
                if will_mention_domain and domain_ids:
                    # Find domain position in text
                    domain_name = self.domain_lookup[domain_id]
                    match = re.search(re.escape(domain_name), comment_text, re.IGNORECASE)
                    
                    if match:
                        mention = {
                            'domain_id': domain_id,
                            'comment_id': None,  # Will be set after comment insertion
                            'video_id': video_id,
                            'mention_text': domain_name,
                            'position_start': match.start(),
                            'position_end': match.end(),
                            'context': comment_text[max(0, match.start()-20):match.end()+20],
                            'confidence_score': round(random.uniform(0.8, 1.0), 2),
                            'extraction_method': 'regex',
                            'discovered_at': discovered_at.isoformat()
                        }
                        mentions.append(mention)
                
                pbar.update(1)
        
        pbar.close()
        return comments, mentions
    
    def insert_data_batch(self, table_name: str, data: List[Dict], batch_size: int = 100):
        """Insert data in batches with progress tracking."""
        if not data:
            return []
        
        print(f"💾 Inserting {len(data)} records into {table_name}...")
        inserted_records = []
        
        pbar = tqdm(total=len(data), desc=f"Inserting {table_name}")
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            try:
                result = supabase.table(table_name).insert(batch).execute()
                inserted_records.extend(result.data)
                pbar.update(len(batch))
            except Exception as e:
                print(f"\nError inserting batch {i//batch_size + 1}: {e}")
                # Try inserting records one by one
                for record in batch:
                    try:
                        result = supabase.table(table_name).insert(record).execute()
                        inserted_records.extend(result.data)
                        pbar.update(1)
                    except Exception as record_error:
                        print(f"Failed to insert record: {record_error}")
                        pbar.update(1)
        
        pbar.close()
        return inserted_records
    
    def create_domain_lookup(self, domains: List[Dict]):
        """Create lookup mapping for domain_id -> domain_name."""
        for domain in domains:
            self.domain_lookup[domain['id']] = domain['domain_name']
    
    def update_mention_comment_ids(self, mentions: List[Dict], comments: List[Dict]):
        """Update domain mentions with actual comment IDs after insertion."""
        if not mentions or not comments:
            return mentions
        
        print("🔗 Linking domain mentions to comments...")
        
        # Create lookup: video_id + text -> comment_id
        comment_lookup = {}
        for comment in comments:
            key = f"{comment['video_id']}:{comment['text']}"
            comment_lookup[key] = comment['id']
        
        # Update mentions with comment IDs
        updated_mentions = []
        for mention in mentions:
            # Find matching comment
            for comment in comments:
                if (comment['video_id'] == mention['video_id'] and 
                    mention['mention_text'] in comment['text']):
                    mention['comment_id'] = comment['id']
                    updated_mentions.append(mention)
                    break
        
        return updated_mentions
    
    def generate_seed_data(self):
        """Main method to generate and insert all seed data."""
        print("🌱 Starting database seeding process...\n")
        
        # Step 1: Clear existing data
        self.clear_existing_data()
        print()
        
        # Step 2: Generate and insert videos
        videos_data = self.generate_video_data()
        videos = self.insert_data_batch('video', videos_data)
        video_ids = [video['id'] for video in videos]
        print()
        
        # Step 3: Generate and insert domains
        domains_data = self.generate_domains()
        domains = self.insert_data_batch('domain', domains_data)
        domain_ids = [domain['id'] for domain in domains]
        self.create_domain_lookup(domains)
        print()
        
        # Step 4: Generate comments and domain mentions
        comments_data, mentions_data = self.generate_comments_and_mentions(video_ids, domain_ids)
        
        # Step 5: Insert comments
        comments = self.insert_data_batch('comment', comments_data)
        print()
        
        # Step 6: Update mentions with comment IDs and insert
        updated_mentions = self.update_mention_comment_ids(mentions_data, comments)
        if updated_mentions:
            mentions = self.insert_data_batch('domain_mention', updated_mentions)
        print()
        
        # Final statistics
        print("✅ Seed data generation completed!")
        print(f"   📹 Videos: {len(videos)}")
        print(f"   💬 Comments: {len(comments)}")
        print(f"   🌐 Domains: {len(domains)}")
        print(f"   🔗 Domain Mentions: {len(updated_mentions) if updated_mentions else 0}")
        
        # Additional stats
        suspicious_domains = sum(1 for d in domains if d.get('is_suspicious'))
        verified_domains = sum(1 for d in domains if d.get('is_verified'))
        comments_with_domains = len(updated_mentions) if updated_mentions else 0
        
        print(f"\n📊 Additional Statistics:")
        print(f"   🚨 Suspicious domains: {suspicious_domains}")
        print(f"   ✅ Verified domains: {verified_domains}")
        print(f"   💬 Comments with domain mentions: {comments_with_domains}")
        print(f"   📈 Domain mention rate: {(comments_with_domains/len(comments)*100):.1f}%")


def main():
    """Main entry point for the seed script."""
    print("🌱 TikTok Domain Harvester - Database Seeder")
    print("=" * 50)
    
    try:
        seeder = DatabaseSeeder()
        seeder.generate_seed_data()
        print("\n🎉 Database seeding completed successfully!")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Seeding interrupted by user")
        sys.exit(1)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()