# Validate Domain Extraction

## Objective

Perform manual validation of domain extraction precision to meet the 70% accuracy target and identify quality issues.

## Context

- Sprint: 8
- Dependencies: prompt_04_restart_data_pipeline.md completed
- Related files: `/worker/domain_extraction.py`, validation data, precision metrics

## Task

With the data pipeline restored, validate that domain extraction is meeting the MVP requirement of ≥70% precision on manual validation. Current extraction quality is unknown and may be contributing to low domain counts.

### Current Issues

1. **Unknown Precision Rate**
   - No recent manual validation performed
   - Quality of extracted domains uncertain
   - False positives may be inflating or deflating counts

2. **Extraction Algorithm Accuracy**
   - Domain extraction logic may have bugs
   - Edge cases not handled properly
   - URL normalization issues possible

3. **Data Quality Impact**
   - Poor precision affects user trust
   - Invalid domains waste storage and processing
   - Low precision may indicate systemic issues

### Required Actions

1. **Sample Collection**
   - Collect representative sample of 100 recent extractions
   - Include diverse comment types and sources
   - Document extraction context and reasoning

2. **Manual Validation**
   - Review each extracted domain manually
   - Classify as True Positive, False Positive, or Edge Case
   - Calculate precision rate and identify patterns

3. **Algorithm Analysis**
   - Review domain extraction code for bugs
   - Test edge cases identified during validation
   - Improve extraction logic if needed

4. **Quality Improvements**
   - Implement fixes for common false positives
   - Add validation rules for suspect domains
   - Create feedback loop for continuous improvement

## Subagent to Use

Invoke the **data-analyst** to:

- Collect statistically valid sample for validation
- Perform systematic manual review of extractions
- Calculate precision metrics and identify improvement areas
- Implement data quality improvements

## Success Criteria

- [ ] 100+ domain extractions manually validated
- [ ] Precision rate calculated and documented
- [ ] Precision meets or exceeds 70% target
- [ ] False positive patterns identified and fixed
- [ ] Extraction algorithm improvements implemented
- [ ] Quality metrics tracked for future monitoring
- [ ] Validation methodology documented
- [ ] Results committed with analysis notes

## Implementation Steps

1. **Sample Selection**
   ```sql
   -- Get recent diverse sample
   SELECT 
     dm.domain_name,
     c.text as comment_text,
     v.url as video_url,
     dm.created_at
   FROM domain_mention dm
   JOIN comment c ON dm.comment_id = c.id
   JOIN video v ON c.video_id = v.id
   WHERE dm.created_at > NOW() - INTERVAL '7 days'
   ORDER BY RANDOM()
   LIMIT 100;
   ```

2. **Validation Spreadsheet**
   - Domain | Comment Text | Valid? | Confidence | Notes
   - Track false positives and edge cases
   - Note extraction context and reasoning

3. **Precision Calculation**
   ```
   Precision = True Positives / (True Positives + False Positives)
   Target: ≥ 0.70 (70%)
   ```

4. **Pattern Analysis**
   - Common false positive patterns
   - Edge cases needing special handling
   - Algorithm weaknesses to address

## Validation Criteria

**True Positive**: Clear, intentional domain mention
- example.com mentioned for promotion
- Links to legitimate websites
- Domain clearly readable in context

**False Positive**: Extraction error or invalid domain
- Typos that form fake domains (e.g., "gmai.com")
- Fragments of longer text (e.g., "this.is" from "this is great")
- Non-domain text matched by regex

**Edge Case**: Ambiguous or borderline cases
- Domains in different languages
- Shortened URLs or redirects
- Platform-specific domains (instagram.com, etc.)

## Quality Improvement Areas

1. **Common False Positives**
   - Filter obviously fake domains
   - Improve context awareness
   - Add domain validation checks

2. **Extraction Logic**
   - Refine regex patterns
   - Add natural language processing
   - Improve normalization rules

3. **Monitoring Setup**
   - Track precision over time
   - Alert on quality degradation
   - Regular validation sampling

## Notes

- Use representative timeframe (recent week)
- Include variety of video types and sources
- Document methodology for repeatability
- Compare findings with user feedback if available

## Handoff Notes

After completion:
- Domain extraction precision validated and documented
- Quality improvements implemented
- Ready for monitoring setup in prompt_06