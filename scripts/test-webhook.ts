/**
 * Example script to test the webhook API
 * This demonstrates how to send data to the webhook endpoint
 */

import "dotenv/config";

const WEBHOOK_URL =
  process.env.WEBHOOK_URL || "http://localhost:3000/api/webhooks/load-data";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error("WEBHOOK_SECRET environment variable is required");
  process.exit(1);
}

async function sendWebhook(type: string, data: any, semesterId?: number) {
  const payload: any = {
    type,
    data,
  };

  if (semesterId) {
    payload.semesterId = semesterId;
  }

  console.log(`\nSending ${type} data to webhook...`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Error (${response.status}):`, result);
      return null;
    }

    console.log("Success:", result);
    return result;
  } catch (error) {
    console.error("Request failed:", error);
    return null;
  }
}

async function main() {
  console.log("Testing webhook API...");
  console.log(`Endpoint: ${WEBHOOK_URL}`);

  // Example 1: Load semesters
  const semestersData = [
    {
      id: 999999,
      nameZh: "测试学期",
      code: "TEST-2024-1",
      start: "2024-09-01",
      end: "2025-01-15",
    },
  ];

  const semesterResult = await sendWebhook("semesters", semestersData);

  if (!semesterResult) {
    console.error("Failed to load semesters");
    return;
  }

  // Get the semester ID from the database to use in the next requests
  // In a real scenario, you would query the database or use the returned data
  console.log(
    "\nNote: To test sections and schedules, you need a valid semesterId",
  );
  console.log(
    "Example: await sendWebhook('sections', sectionsData, <semesterId>);",
  );

  // Example 2: Load sections (commented out - requires actual data)
  /*
  const sectionsData = [
    {
      id: 888888,
      code: "001",
      credits: 3.0,
      period: 48,
      periodsPerWeek: 3,
      stdCount: 50,
      limitCount: 60,
      graduateAndPostgraduate: false,
      dateTimePlaceText: "周一 1-2节",
      dateTimePlacePersonText: "周一 1-2节 东区1教101 张三",
      course: {
        id: 777777,
        code: "TEST101",
        cn: "测试课程",
        en: "Test Course"
      }
    }
  ];
  
  const sectionsResult = await sendWebhook('sections', sectionsData, 1);
  */

  // Example 3: Load schedules (commented out - requires actual data)
  /*
  const schedulesData = {
    "888888": {
      result: {
        scheduleGroupList: [...],
        scheduleList: [...]
      }
    }
  };
  
  const schedulesResult = await sendWebhook('schedules', schedulesData, 1);
  */

  console.log("\nTest completed!");
}

main();
