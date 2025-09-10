# Sprint 7: Video Storage & AI Analysis Infrastructure

## Sprint Overview

Adding video download, storage, and compression capabilities to support team validation and future AI-powered domain extraction directly from video content.

## Problem Statement

- Promoted TikTok videos disappear quickly (often within hours/days)
- Team cannot verify domain mentions without seeing source videos
- Future goal: AI to extract domains from video/audio content, not just comments
- Current state: Only storing video URLs which become invalid

## Proposed Solution

### Phase 1: Video Capture & Storage (3-5 days)

#### Core Components

1. **Video Download During Harvest**
   - Integrate with existing Playwright worker
   - Download only when domains found in comments
   - Capture during same session as comment extraction

2. **Video Compression Pipeline**
   - Compress immediately after download
   - Reduce from 1080p to 480p/720p
   - Maintain full duration (never trim content)
   - 70-85% storage reduction

3. **Storage Management**
   - Supabase Storage bucket with 7-day TTL
   - Auto-cleanup via Inngest daily job
   - Optional: Extend retention for high-value videos

4. **UI Integration**
   - Embed video player in domain detail page
   - Show "Archived for review (expires in X days)" badge
   - Fallback to TikTok URL if expired

### Phase 2: AI Analysis Infrastructure (Future)

#### Capabilities Enabled

1. **Text Extraction**
   - OCR for overlay text and captions
   - Frame-by-frame analysis for domain mentions
   - Logo/brand detection

2. **Audio Transcription**
   - Speech-to-text using Whisper
   - Verbal domain mention detection
   - Multi-language support

3. **Batch Processing**
   - Process stored videos in parallel
   - Test multiple AI models
   - Ensemble results for accuracy

## Technical Implementation

### Video Download Methods

#### Method 1: Playwright Network Interception (Recommended)

```python
async def download_video_via_interception(page, video_url):
    video_data = None

    async def handle_response(response):
        if 'v16-webapp' in response.url or '.mp4' in response.url:
            video_data = await response.body()

    page.on('response', handle_response)
    await page.goto(video_url)
    await page.wait_for_timeout(3000)  # Let video start playing
    return video_data
```

#### Method 2: yt-dlp Integration (Backup)

```python
import yt_dlp

ydl_opts = {
    'outtmpl': 'videos/%(id)s.%(ext)s',
    'quiet': True,
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([video_url])
```

### Compression Strategy

```python
import subprocess

async def compress_video_for_ai(input_path: str, video_id: str):
    output_path = f"/tmp/{video_id}_compressed.mp4"

    # FFmpeg command optimized for AI analysis
    cmd = [
        'ffmpeg', '-i', input_path,
        '-vf', 'scale=854:480',      # 480p resolution
        '-c:v', 'libx264',           # H.264 codec
        '-preset', 'veryfast',       # Fast encoding (2-3 seconds)
        '-crf', '28',                # Quality factor (23-28 good for AI)
        '-c:a', 'aac',               # Keep audio for speech-to-text
        '-b:a', '64k',               # Reduce audio bitrate
        '-movflags', '+faststart',   # Optimize for streaming
        output_path
    ]

    # NEVER use duration-limiting flags like -t, -ss, or -to
    # Must preserve full video duration for complete analysis

    await subprocess.run(cmd)
    return output_path
```

### Database Schema Updates

```sql
-- Add to video table
ALTER TABLE video ADD COLUMN video_file_url TEXT;
ALTER TABLE video ADD COLUMN video_file_size BIGINT;
ALTER TABLE video ADD COLUMN video_duration INTEGER; -- seconds
ALTER TABLE video ADD COLUMN video_downloaded_at TIMESTAMPTZ;
ALTER TABLE video ADD COLUMN video_expires_at TIMESTAMPTZ;
ALTER TABLE video ADD COLUMN compression_ratio DECIMAL(3,2);
```

### Storage Strategy

#### Selective Storage Rules

1. **Priority 1**: Videos with confirmed domain mentions
2. **Priority 2**: High-engagement promoted videos
3. **Skip**: Videos with no domains after comment analysis

#### Retention Policy

- Default: 7 days for validation
- Extended: 30 days for high-value content
- Permanent: Training data for AI models

## Cost Analysis

### Storage Costs (Compressed)

- 200 videos/week × 2MB average = 400MB/week
- Monthly: ~1.6GB = ~$0.10 (Supabase)
- Bandwidth: ~$0.40/month for team reviews

### Processing Costs

- FFmpeg compression: ~$0.0001 per video
- Monthly: ~$0.08 for 200 videos/week

### Total Additional Cost

- **~$2-3/month** with compression
- **~$10-15/month** without compression

## Benefits

### Immediate Benefits (Validation)

- Team can verify domain mentions
- Quality control for 70% precision target
- Evidence preservation before videos disappear
- Debug extraction accuracy

### Future Benefits (AI Analysis)

- Foundation for AI-powered extraction
- Multiple analysis passes possible
- Training data accumulation
- Batch processing efficiency
- No dependency on TikTok availability

## Implementation Priority

### Week 1: Core Infrastructure

- [ ] Supabase Storage bucket setup
- [ ] Video download in worker
- [ ] FFmpeg compression pipeline
- [ ] Database schema updates

### Week 2: Integration & UI

- [ ] Storage upload/retrieval
- [ ] Video player component
- [ ] Domain detail page integration
- [ ] Cleanup job implementation

### Week 3: Optimization

- [ ] Selective storage rules
- [ ] Monitoring dashboard
- [ ] Cost tracking
- [ ] Performance tuning

## Risk Mitigation

### Technical Risks

- **Rate limiting**: Use existing token bucket
- **Storage overflow**: Hard caps and monitoring
- **Download failures**: Retry logic with backoff
- **Compression errors**: Fallback to original

### Legal Considerations

- Temporary storage for analysis (7 days)
- Not redistributing content
- Research/validation purposes
- Consider terms of service implications

## Success Metrics

- Video capture success rate: >90%
- Compression ratio: >70% size reduction
- Storage costs: <$5/month
- Validation efficiency: 5x faster than visiting TikTok
- AI readiness: 100% of videos suitable for ML processing

## Future Enhancements

### Phase 3: AI Domain Extraction

- Deploy GPU workers for video analysis
- Implement multi-modal extraction pipeline
- Compare AI vs comment-based extraction
- Feedback loop for model improvement

### Phase 4: Advanced Features

- Automatic highlight clips of domain mentions
- Thumbnail generation at mention timestamp
- Transcript generation with timestamps
- Domain mention confidence scoring

## Decision Points

### Compression Settings

- **For validation only**: 480p, CRF 30 (maximum compression)
- **For AI analysis**: 720p, CRF 26 (balanced quality)
- **For archival**: 1080p, CRF 23 (higher quality)

### Storage Provider Options

1. **Supabase Storage** (recommended for MVP)
   - Integrated with existing stack
   - Simple API
   - $0.021/GB stored

2. **Cloudflare R2** (consider for scale)
   - Cheaper at $0.015/GB
   - No egress fees
   - S3-compatible API

3. **AWS S3** (enterprise option)
   - Most expensive but most reliable
   - Advanced lifecycle policies
   - Global availability

## Conclusion

Video storage is not scope creep but essential infrastructure for:

1. Immediate validation needs (team can't verify without videos)
2. Future AI capabilities (foundation for automated extraction)
3. Quality assurance (meeting 70% precision target)

The 3-5 day investment provides immediate value while building toward the ultimate goal of AI-powered domain extraction directly from video content.

## Implementation Notes

- Never trim video duration - preserve all content
- Compress quality, not length
- Download during existing scrape session
- Store only videos with domains to minimize costs
- Plan for AI from day one (even if not implemented yet)
