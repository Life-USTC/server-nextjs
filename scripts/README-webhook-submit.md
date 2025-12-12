# Webhook Data Submission Script

This Python script submits course and schedule data from the Life-USTC/static repository to the webhook API.

## Prerequisites

- Python 3.7+
- `requests` library

Install dependencies:
```bash
pip install requests
```

## Usage

### 1. Set Environment Variables

```bash
export WEBHOOK_SECRET="your_webhook_secret_token"
export WEBHOOK_URL="https://your-server.com/api/webhooks/load-data"
export CACHE_ROOT="./cache"  # Path to the static cache directory
```

### 2. Run the Script

Simply run:

```bash
python submit-via-webhook.py
```

The script will automatically:
- Load semester data from `cache/catalog/api/teach/semester/list.json`
- Submit semesters to the webhook API
- For each semester, load and submit sections and schedules using the semester's `jwId`
- No manual mapping required!

## Script Structure

The script includes a `WebhookSubmitter` class with the following methods:

### `submit_semesters()`
Loads and submits semester data from `cache/catalog/api/teach/semester/list.json`

### `submit_sections(semester_jw_id)`
Loads and submits section data for a specific semester using its `jwId` from:
`cache/catalog/api/teach/lesson/list-for-teach/{semester_jw_id}.json`

### `submit_schedules(semester_jw_id, section_jw_ids)`
Loads and submits schedule data for sections using the semester's `jwId` from:
`cache/jw/api/schedule-table/datum/{section_jw_id}.json`

### `submit_all()`
Orchestrates the submission of all data types in the correct order. No manual mapping required - the API handles semester lookup by `jwId` automatically.

## Example Output

```
=== Submitting Semesters ===
Found 10 semesters
Submitting semesters data...
✓ Success: Loaded 10 semesters

=== Processing Semester: 2024-2025学年第一学期 (jwId=123) ===
Submitting sections...
  Found 1500 sections
Submitting sections data...
✓ Success: Loaded 1500 sections for semester 2024-2025学年第一学期
Submitting schedules...
  Found schedules for 1450 sections
Submitting schedules data...
✓ Success: Loaded schedules for 1450 sections in semester 2024-2025学年第一学期

=== All data submitted successfully! ===
```

## Error Handling

The script will:
- Print detailed error messages if submission fails
- Show validation errors from the webhook API
- Continue processing other semesters if one fails
- Skip sections/schedules if files are not found

## Integration with Life-USTC/static

This script is designed to be placed in the Life-USTC/static repository and run as part of the data update workflow. It can be used to automatically push data to the Next.js server after updating the static cache.

### Suggested GitHub Actions Workflow

```yaml
name: Submit Data via Webhook

on:
  push:
    branches: [gh-pages]
    paths:
      - 'cache/**'

jobs:
  submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: pip install requests
      
      - name: Submit data to webhook
        env:
          WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
          WEBHOOK_URL: ${{ secrets.WEBHOOK_URL }}
          CACHE_ROOT: ./cache
        run: python submit-via-webhook.py
```

## Notes

- The script requires the `WEBHOOK_SECRET` to be set for authentication
- For production use, consider implementing retry logic and better error handling
- The semester ID mapping step is manual because the database assigns IDs dynamically
- Consider creating an API endpoint to query semester IDs by `jwId` to automate the mapping
