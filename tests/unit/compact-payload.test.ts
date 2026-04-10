import { describe, expect, it } from "vitest";
import { compactMcpPayload } from "@/lib/mcp/compact-payload";

describe("compactMcpPayload", () => {
  describe("primitives and arrays", () => {
    it("passes through null", () => {
      expect(compactMcpPayload(null)).toBeNull();
    });

    it("passes through undefined", () => {
      expect(compactMcpPayload(undefined)).toBeUndefined();
    });

    it("passes through strings", () => {
      expect(compactMcpPayload("hello")).toBe("hello");
    });

    it("passes through numbers", () => {
      expect(compactMcpPayload(42)).toBe(42);
    });

    it("passes through booleans", () => {
      expect(compactMcpPayload(true)).toBe(true);
    });

    it("returns empty array for empty array", () => {
      expect(compactMcpPayload([])).toEqual([]);
    });

    it("returns array of primitives unchanged", () => {
      expect(compactMcpPayload([1, "a", null])).toEqual([1, "a", null]);
    });

    it("recursively compacts arrays of objects", () => {
      const input = [{ todos: [{ id: "1", title: "T", extra: "x" }] }];
      const result = compactMcpPayload(input) as Record<string, unknown>[];
      expect(result).toHaveLength(1);
      expect(
        (result[0].todos as Record<string, unknown>[])[0],
      ).not.toHaveProperty("extra");
    });
  });

  describe("todos", () => {
    it("compacts todo items, keeping only expected fields", () => {
      const input = {
        todos: [
          {
            id: "t1",
            title: "Buy groceries",
            content: "Milk, eggs",
            priority: 1,
            dueAt: "2024-01-01",
            completed: false,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
            userId: "u1",
            extraField: "should be removed",
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const todos = result.todos as Record<string, unknown>[];
      expect(todos[0]).toEqual({
        id: "t1",
        title: "Buy groceries",
        content: "Milk, eggs",
        priority: 1,
        dueAt: "2024-01-01",
        completed: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });
    });

    it("preserves sibling fields on the wrapper object", () => {
      const input = { todos: [], totalCount: 5 };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      expect(result.totalCount).toBe(5);
    });
  });

  describe("courses", () => {
    it("compacts course items", () => {
      const input = {
        courses: [
          {
            id: "c1",
            jwId: "J1",
            code: "CS101",
            namePrimary: "Intro CS",
            nameSecondary: "计算机导论",
            credit: 3,
            hours: 48,
            description: "removed",
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const courses = result.courses as Record<string, unknown>[];
      expect(courses[0]).toEqual({
        id: "c1",
        jwId: "J1",
        code: "CS101",
        namePrimary: "Intro CS",
        nameSecondary: "计算机导论",
        credit: 3,
        hours: 48,
      });
    });
  });

  describe("sections", () => {
    it("compacts sections with nested course and semester", () => {
      const input = {
        sections: [
          {
            id: "s1",
            jwId: "J1",
            code: "S101",
            namePrimary: "Section A",
            nameSecondary: "A组",
            campusId: "campus1",
            openDepartmentId: "dept1",
            extraField: "removed",
            course: {
              id: "c1",
              jwId: "J1",
              code: "CS101",
              namePrimary: "Intro CS",
              nameSecondary: "计算机导论",
              credit: 3,
              hours: 48,
              description: "removed",
            },
            semester: {
              id: "sem1",
              jwId: "SJ1",
              code: "2024S",
              nameCn: "2024春",
              namePrimary: "Spring 2024",
              extra: "removed",
            },
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const sections = result.sections as Record<string, unknown>[];
      expect(sections[0]).toHaveProperty("course");
      expect(sections[0]).toHaveProperty("semester");
      expect(sections[0].course as Record<string, unknown>).not.toHaveProperty(
        "description",
      );
      expect(
        sections[0].semester as Record<string, unknown>,
      ).not.toHaveProperty("extra");
    });
  });

  describe("homeworks", () => {
    it("compacts homeworks with nested description and users", () => {
      const input = {
        homeworks: [
          {
            id: "h1",
            sectionId: "s1",
            title: "HW1",
            isMajor: false,
            requiresTeam: false,
            publishedAt: "2024-01-01",
            submissionStartAt: "2024-01-01",
            submissionDueAt: "2024-01-15",
            deletedAt: null,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
            extraField: "removed",
            description: {
              id: "d1",
              content: "Do problems 1-5",
              lastEditedAt: "2024-01-01",
              lastEditedById: "u1",
              extraField: "removed",
            },
            createdBy: {
              id: "u1",
              name: "Teacher",
              username: "teacher",
              image: "img.png",
              email: "removed",
            },
            updatedBy: null,
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const homeworks = result.homeworks as Record<string, unknown>[];
      const hw = homeworks[0];
      expect(hw).not.toHaveProperty("extraField");
      expect(hw.description as Record<string, unknown>).not.toHaveProperty(
        "extraField",
      );
      expect(hw.createdBy as Record<string, unknown>).not.toHaveProperty(
        "email",
      );
      expect(hw.updatedBy).toBeNull();
    });

    it("does not add missing optional nested fields", () => {
      const input = {
        homeworks: [
          {
            id: "h1",
            sectionId: "s1",
            title: "HW2",
            isMajor: false,
            requiresTeam: false,
            publishedAt: null,
            submissionStartAt: null,
            submissionDueAt: null,
            deletedAt: null,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const hw = (result.homeworks as Record<string, unknown>[])[0];
      expect(hw).not.toHaveProperty("description");
      expect(hw).not.toHaveProperty("section");
      expect(hw).not.toHaveProperty("createdBy");
    });
  });

  describe("schedules", () => {
    it("compacts schedules with nested section, room with building, and teachers", () => {
      const input = {
        schedules: [
          {
            id: "sch1",
            jwId: "J1",
            date: "2024-03-01",
            weekday: 1,
            startTime: "08:00",
            endTime: "09:35",
            weekIndex: 3,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
            extraField: "removed",
            section: {
              id: "s1",
              jwId: "J1",
              code: "S101",
              namePrimary: "Section A",
              nameSecondary: "A组",
              campusId: "c1",
              openDepartmentId: "d1",
            },
            room: {
              id: "r1",
              jwId: "RJ1",
              namePrimary: "Room 101",
              nameSecondary: "101教室",
              extraField: "removed",
              building: {
                id: "b1",
                jwId: "BJ1",
                namePrimary: "Science Building",
                nameSecondary: "理科楼",
                address: "removed",
              },
            },
            teachers: [
              {
                id: "t1",
                jwId: "TJ1",
                namePrimary: "Dr. Smith",
                nameSecondary: "史密斯",
                email: "removed",
              },
            ],
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const sch = (result.schedules as Record<string, unknown>[])[0];
      expect(sch).not.toHaveProperty("extraField");
      const room = sch.room as Record<string, unknown>;
      expect(room).not.toHaveProperty("extraField");
      const building = room.building as Record<string, unknown>;
      expect(building).not.toHaveProperty("address");
      const teachers = sch.teachers as Record<string, unknown>[];
      expect(teachers[0]).not.toHaveProperty("email");
    });
  });

  describe("exams", () => {
    it("compacts exams with examBatch and examRooms", () => {
      const input = {
        exams: [
          {
            id: "e1",
            jwId: "EJ1",
            examDate: "2024-06-15",
            startTime: "14:00",
            endTime: "16:00",
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
            extraField: "removed",
            examBatch: {
              id: "eb1",
              jwId: "EBJ1",
              namePrimary: "Final Exam Batch 1",
              nameSecondary: "期末考试第一批",
              extraField: "removed",
            },
            examRooms: [
              {
                id: "er1",
                jwId: "ERJ1",
                roomName: "Room 301",
                buildingName: "Exam Hall",
                capacity: 100,
              },
            ],
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const exam = (result.exams as Record<string, unknown>[])[0];
      expect(exam).not.toHaveProperty("extraField");
      expect(exam.examBatch as Record<string, unknown>).not.toHaveProperty(
        "extraField",
      );
      expect(
        (exam.examRooms as Record<string, unknown>[])[0],
      ).not.toHaveProperty("capacity");
    });
  });

  describe("events", () => {
    it("routes schedule events through compactSchedule", () => {
      const input = {
        events: [
          {
            type: "schedule",
            at: "2024-03-01T08:00:00Z",
            payload: {
              id: "sch1",
              jwId: "J1",
              date: "2024-03-01",
              weekday: 1,
              startTime: "08:00",
              endTime: "09:35",
              weekIndex: 3,
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
              extra: "removed",
            },
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const events = result.events as Record<string, unknown>[];
      expect(events[0]).toHaveProperty("type", "schedule");
      expect(events[0]).toHaveProperty("at");
      expect(events[0].payload as Record<string, unknown>).not.toHaveProperty(
        "extra",
      );
    });

    it("routes homework_due events through compactHomework", () => {
      const input = {
        events: [
          {
            type: "homework_due",
            at: "2024-01-15T23:59:00Z",
            payload: {
              id: "h1",
              sectionId: "s1",
              title: "HW1",
              isMajor: false,
              requiresTeam: false,
              publishedAt: null,
              submissionStartAt: null,
              submissionDueAt: "2024-01-15",
              deletedAt: null,
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
              extraField: "removed",
            },
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const events = result.events as Record<string, unknown>[];
      expect(events[0].payload as Record<string, unknown>).not.toHaveProperty(
        "extraField",
      );
    });

    it("routes exam events through compactExam", () => {
      const input = {
        events: [
          {
            type: "exam",
            at: "2024-06-15T14:00:00Z",
            payload: {
              id: "e1",
              jwId: "EJ1",
              examDate: "2024-06-15",
              startTime: "14:00",
              endTime: "16:00",
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
              extra: "removed",
            },
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const events = result.events as Record<string, unknown>[];
      expect(events[0].payload as Record<string, unknown>).not.toHaveProperty(
        "extra",
      );
    });

    it("routes todo_due events through compactTodo", () => {
      const input = {
        events: [
          {
            type: "todo_due",
            at: "2024-01-01T00:00:00Z",
            payload: {
              id: "t1",
              title: "Buy groceries",
              content: "Milk",
              priority: 1,
              dueAt: "2024-01-01",
              completed: false,
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
              userId: "removed",
            },
          },
        ],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const events = result.events as Record<string, unknown>[];
      expect(events[0].payload as Record<string, unknown>).not.toHaveProperty(
        "userId",
      );
    });

    it("handles events without payload", () => {
      const input = {
        events: [{ type: "schedule", at: "2024-01-01" }],
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      const events = result.events as Record<string, unknown>[];
      expect(events[0]).toEqual({ type: "schedule", at: "2024-01-01" });
    });
  });

  describe("fallback singular keys", () => {
    it("compacts singular 'course' key", () => {
      const input = {
        course: { id: "c1", code: "CS101", namePrimary: "CS", extra: "x" },
        otherField: "preserved",
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      expect(result.course as Record<string, unknown>).not.toHaveProperty(
        "extra",
      );
      expect(result.otherField).toBe("preserved");
    });

    it("compacts singular 'todo' key", () => {
      const input = {
        todo: { id: "t1", title: "T", userId: "removed" },
      };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      expect(result.todo as Record<string, unknown>).not.toHaveProperty(
        "userId",
      );
    });

    it("preserves unknown fields in output", () => {
      const input = { unknownField: "value", anotherField: 42 };
      const result = compactMcpPayload(input) as Record<string, unknown>;
      expect(result).toEqual({ unknownField: "value", anotherField: 42 });
    });
  });
});
