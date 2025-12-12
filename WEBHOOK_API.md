# Webhook API Documentation

## Overview

The webhook API provides a backend endpoint for loading course, schedule, and semester data directly into the database. This reduces network overhead compared to the script-based approach that clones the entire static repository.

## Endpoint

```
POST /api/webhooks/load-data
```

## Authentication

All webhook requests must include an authentication token in the `Authorization` header:

```
Authorization: Bearer <WEBHOOK_SECRET>
```

Or simply:

```
Authorization: <WEBHOOK_SECRET>
```

### Environment Variables

Set the `WEBHOOK_SECRET` environment variable in your `.env` or `.env.local` file:

```bash
WEBHOOK_SECRET=your_secure_random_token_here
```

Generate a secure token using:

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Request Format

### Payload Structure

```json
{
  "type": "semesters" | "sections" | "schedules",
  "data": <type-specific data>,
  "semesterId": <number> (optional, required for sections and schedules)
}
```

## Data Types

### 1. Semesters

Load semester information.

**Request:**
```json
{
  "type": "semesters",
  "data": [
    {
      "id": 123,
      "nameZh": "2024-2025学年第一学期",
      "code": "2024-2025-1",
      "start": "2024-09-01",
      "end": "2025-01-15"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loaded 1 semesters",
  "count": 1
}
```

### 2. Sections

Load course sections for a specific semester.

**Request:**
```json
{
  "type": "sections",
  "semesterId": 1,
  "data": [
    {
      "id": 456,
      "code": "001",
      "credits": 3.0,
      "period": 48,
      "periodsPerWeek": 3,
      "stdCount": 50,
      "limitCount": 60,
      "graduateAndPostgraduate": false,
      "dateTimePlaceText": "周一 1-2节",
      "dateTimePlacePersonText": "周一 1-2节 东区1教101 张三",
      "course": {
        "id": 789,
        "code": "CS101",
        "cn": "计算机科学导论",
        "en": "Introduction to Computer Science"
      },
      "education": {
        "cn": "本科",
        "en": "Undergraduate"
      },
      "courseCategory": {
        "cn": "专业必修",
        "en": "Major Required"
      },
      "openDepartment": {
        "code": "CS",
        "cn": "计算机科学与技术学院",
        "en": "School of Computer Science",
        "college": true
      },
      "teacherAssignmentList": [
        {
          "cn": "张三",
          "en": "Zhang San",
          "departmentCode": "CS"
        }
      ],
      "adminClasses": [
        {
          "cn": "CS2024",
          "en": "CS2024"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loaded 1 sections for semester 2024-2025学年第一学期",
  "count": 1,
  "semesterId": 1
}
```

### 3. Schedules

Load schedule data for sections in a specific semester.

**Request:**
```json
{
  "type": "schedules",
  "semesterId": 1,
  "data": {
    "456": {
      "result": {
        "scheduleGroupList": [
          {
            "id": 1001,
            "lessonId": 456,
            "no": 1,
            "limitCount": 60,
            "stdCount": 50,
            "actualPeriods": 48,
            "default": true
          }
        ],
        "scheduleList": [
          {
            "lessonId": 456,
            "scheduleGroupId": 1001,
            "teacherId": 100,
            "personId": 200,
            "personName": "张三",
            "periods": 2,
            "date": "2024-09-02",
            "weekday": 1,
            "startTime": "08:00",
            "endTime": "09:40",
            "weekIndex": 1,
            "startUnit": 1,
            "endUnit": 2,
            "exerciseClass": false,
            "room": {
              "id": 301,
              "code": "101",
              "nameZh": "东区1教101",
              "nameEn": "East Area Building 1 Room 101",
              "floor": 1,
              "virtual": false,
              "seatsForLesson": 60,
              "seats": 60,
              "building": {
                "id": 30,
                "code": "DQ1J",
                "nameZh": "东区第一教学楼",
                "nameEn": "East Area Building 1",
                "campus": {
                  "id": 3,
                  "nameZh": "东校区",
                  "nameEn": "East Campus"
                }
              },
              "roomType": {
                "id": 1,
                "code": "JXL",
                "nameZh": "教学楼",
                "nameEn": "Teaching Building"
              }
            }
          }
        ]
      }
    }
  }
}
```

**Note:** The `data` field for schedules is an object where keys are section `jwId` (as strings) and values contain the schedule data for that section.

**Response:**
```json
{
  "success": true,
  "message": "Loaded schedules for 1 sections in semester 2024-2025学年第一学期",
  "count": 1,
  "semesterId": 1
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized - Invalid or missing authentication token"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid payload",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["type"],
      "message": "Required"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Semester with id 999 not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## Example Usage

### Using curl

```bash
# Load semesters
curl -X POST https://your-server.com/api/webhooks/load-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_webhook_secret" \
  -d '{
    "type": "semesters",
    "data": [
      {
        "id": 123,
        "nameZh": "2024-2025学年第一学期",
        "code": "2024-2025-1",
        "start": "2024-09-01",
        "end": "2025-01-15"
      }
    ]
  }'

# Load sections
curl -X POST https://your-server.com/api/webhooks/load-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_webhook_secret" \
  -d '{
    "type": "sections",
    "semesterId": 1,
    "data": [...]
  }'
```

### Using JavaScript/TypeScript

```typescript
async function loadData(type: string, data: any, semesterId?: number) {
  const response = await fetch('https://your-server.com/api/webhooks/load-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WEBHOOK_SECRET}`
    },
    body: JSON.stringify({
      type,
      data,
      semesterId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to load data: ${error.error}`);
  }

  return response.json();
}

// Usage
const result = await loadData('semesters', semestersData);
console.log(result.message);
```

## Migration from Script-based Loading

The webhook approach offers several advantages over the script-based `load-from-static.ts`:

1. **Reduced Network Overhead**: No need to clone/download entire static repository
2. **Better Performance**: Direct data submission without file I/O
3. **Simplified Deployment**: No git operations or file system access needed
4. **Better Security**: Authenticated endpoint with validation
5. **Easier Integration**: Can be called from any HTTP client

The original `scripts/load-from-static.ts` script can still be used for local development or one-time imports.

## Security Considerations

1. **Keep WEBHOOK_SECRET secure**: Never commit it to version control
2. **Use HTTPS**: Always use HTTPS in production to protect the webhook secret
3. **Rate Limiting**: Consider implementing rate limiting for production deployments
4. **IP Whitelisting**: Optionally restrict webhook access to specific IP addresses
5. **Logging**: Monitor webhook requests for suspicious activity
