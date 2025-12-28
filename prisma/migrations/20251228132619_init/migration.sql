-- CreateTable
CREATE TABLE "AdminClass" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER,
    "code" TEXT,
    "grade" TEXT,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "stdCount" INTEGER,
    "planCount" INTEGER,
    "enabled" BOOLEAN,
    "abbrZh" TEXT,
    "abbrEn" TEXT,

    CONSTRAINT "AdminClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "campusId" INTEGER,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassType" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "ClassType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "categoryId" INTEGER,
    "classTypeId" INTEGER,
    "classifyId" INTEGER,
    "educationLevelId" INTEGER,
    "gradationId" INTEGER,
    "typeId" INTEGER,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCategory" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseClassify" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "CourseClassify_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGradation" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "CourseGradation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseType" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "CourseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "isCollege" BOOLEAN,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationLevel" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamMode" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "ExamMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "floor" INTEGER,
    "virtual" BOOLEAN NOT NULL,
    "seatsForSection" INTEGER NOT NULL,
    "remark" TEXT,
    "seats" INTEGER NOT NULL,
    "buildingId" INTEGER,
    "roomTypeId" INTEGER,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "periods" INTEGER NOT NULL,
    "date" DATE,
    "weekday" INTEGER NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "experiment" TEXT,
    "customPlace" TEXT,
    "lessonType" TEXT,
    "weekIndex" INTEGER NOT NULL,
    "exerciseClass" BOOLEAN,
    "startUnit" INTEGER NOT NULL,
    "endUnit" INTEGER NOT NULL,
    "roomId" INTEGER,
    "sectionId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "scheduleGroupId" INTEGER NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleGroup" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "no" INTEGER NOT NULL,
    "limitCount" INTEGER NOT NULL,
    "stdCount" INTEGER NOT NULL,
    "actualPeriods" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "ScheduleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "bizTypeId" INTEGER,
    "credits" DOUBLE PRECISION,
    "period" INTEGER,
    "periodsPerWeek" INTEGER,
    "timesPerWeek" INTEGER,
    "stdCount" INTEGER,
    "limitCount" INTEGER,
    "graduateAndPostgraduate" BOOLEAN,
    "dateTimePlaceText" TEXT,
    "dateTimePlacePersonText" JSONB,
    "actualPeriods" INTEGER,
    "theoryPeriods" DOUBLE PRECISION,
    "practicePeriods" DOUBLE PRECISION,
    "experimentPeriods" DOUBLE PRECISION,
    "machinePeriods" DOUBLE PRECISION,
    "designPeriods" DOUBLE PRECISION,
    "testPeriods" DOUBLE PRECISION,
    "scheduleState" TEXT,
    "suggestScheduleWeeks" JSONB,
    "suggestScheduleWeekInfo" TEXT,
    "scheduleJsonParams" JSONB,
    "selectedStdCount" INTEGER,
    "remark" TEXT,
    "scheduleRemark" TEXT,
    "courseId" INTEGER NOT NULL,
    "semesterId" INTEGER,
    "campusId" INTEGER,
    "examModeId" INTEGER,
    "openDepartmentId" INTEGER,
    "teachLanguageId" INTEGER,
    "roomTypeId" INTEGER,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "examType" INTEGER,
    "startTime" INTEGER,
    "endTime" INTEGER,
    "examDate" DATE,
    "examTakeCount" INTEGER,
    "examMode" TEXT,
    "examBatchId" INTEGER,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamBatch" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "ExamBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRoom" (
    "id" SERIAL NOT NULL,
    "room" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,

    CONSTRAINT "ExamRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER,
    "teacherId" INTEGER,
    "code" TEXT,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "age" INTEGER,
    "email" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "postcode" TEXT,
    "qq" TEXT,
    "wechat" TEXT,
    "departmentId" INTEGER,
    "teacherTitleId" INTEGER,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachLanguage" (
    "id" SERIAL NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,

    CONSTRAINT "TeachLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherTitle" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN,

    CONSTRAINT "TeacherTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherLessonType" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "role" TEXT,
    "enabled" BOOLEAN,

    CONSTRAINT "TeacherLessonType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "role" TEXT,
    "period" INTEGER,
    "weekIndices" JSONB,
    "weekIndicesMsg" TEXT,
    "teacherLessonTypeId" INTEGER,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SectionAdminClasses" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SectionAdminClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SectionTeachers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SectionTeachers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminClass_jwId_key" ON "AdminClass"("jwId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminClass_nameCn_key" ON "AdminClass"("nameCn");

-- CreateIndex
CREATE INDEX "AdminClass_jwId_idx" ON "AdminClass"("jwId");

-- CreateIndex
CREATE INDEX "AdminClass_code_idx" ON "AdminClass"("code");

-- CreateIndex
CREATE INDEX "AdminClass_nameCn_idx" ON "AdminClass"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "Building_jwId_key" ON "Building"("jwId");

-- CreateIndex
CREATE INDEX "Building_jwId_idx" ON "Building"("jwId");

-- CreateIndex
CREATE INDEX "Building_nameCn_idx" ON "Building"("nameCn");

-- CreateIndex
CREATE INDEX "Building_nameEn_idx" ON "Building"("nameEn");

-- CreateIndex
CREATE INDEX "Building_campusId_idx" ON "Building"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_jwId_key" ON "Campus"("jwId");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_nameCn_key" ON "Campus"("nameCn");

-- CreateIndex
CREATE INDEX "Campus_jwId_idx" ON "Campus"("jwId");

-- CreateIndex
CREATE INDEX "Campus_code_idx" ON "Campus"("code");

-- CreateIndex
CREATE INDEX "Campus_nameCn_idx" ON "Campus"("nameCn");

-- CreateIndex
CREATE INDEX "Campus_nameEn_idx" ON "Campus"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "ClassType_nameCn_key" ON "ClassType"("nameCn");

-- CreateIndex
CREATE INDEX "ClassType_nameCn_idx" ON "ClassType"("nameCn");

-- CreateIndex
CREATE INDEX "ClassType_nameEn_idx" ON "ClassType"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Course_jwId_key" ON "Course"("jwId");

-- CreateIndex
CREATE INDEX "Course_jwId_idx" ON "Course"("jwId");

-- CreateIndex
CREATE INDEX "Course_code_idx" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Course_nameCn_idx" ON "Course"("nameCn");

-- CreateIndex
CREATE INDEX "Course_nameEn_idx" ON "Course"("nameEn");

-- CreateIndex
CREATE INDEX "Course_categoryId_idx" ON "Course"("categoryId");

-- CreateIndex
CREATE INDEX "Course_classTypeId_idx" ON "Course"("classTypeId");

-- CreateIndex
CREATE INDEX "Course_classifyId_idx" ON "Course"("classifyId");

-- CreateIndex
CREATE INDEX "Course_educationLevelId_idx" ON "Course"("educationLevelId");

-- CreateIndex
CREATE INDEX "Course_gradationId_idx" ON "Course"("gradationId");

-- CreateIndex
CREATE INDEX "Course_typeId_idx" ON "Course"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCategory_nameCn_key" ON "CourseCategory"("nameCn");

-- CreateIndex
CREATE INDEX "CourseCategory_nameCn_idx" ON "CourseCategory"("nameCn");

-- CreateIndex
CREATE INDEX "CourseCategory_nameEn_idx" ON "CourseCategory"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "CourseClassify_nameCn_key" ON "CourseClassify"("nameCn");

-- CreateIndex
CREATE INDEX "CourseClassify_nameCn_idx" ON "CourseClassify"("nameCn");

-- CreateIndex
CREATE INDEX "CourseClassify_nameEn_idx" ON "CourseClassify"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "CourseGradation_nameCn_key" ON "CourseGradation"("nameCn");

-- CreateIndex
CREATE INDEX "CourseGradation_nameCn_idx" ON "CourseGradation"("nameCn");

-- CreateIndex
CREATE INDEX "CourseGradation_nameEn_idx" ON "CourseGradation"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "CourseType_nameCn_key" ON "CourseType"("nameCn");

-- CreateIndex
CREATE INDEX "CourseType_nameCn_idx" ON "CourseType"("nameCn");

-- CreateIndex
CREATE INDEX "CourseType_nameEn_idx" ON "CourseType"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_code_idx" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_nameCn_idx" ON "Department"("nameCn");

-- CreateIndex
CREATE INDEX "Department_nameEn_idx" ON "Department"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "EducationLevel_nameCn_key" ON "EducationLevel"("nameCn");

-- CreateIndex
CREATE INDEX "EducationLevel_nameCn_idx" ON "EducationLevel"("nameCn");

-- CreateIndex
CREATE INDEX "EducationLevel_nameEn_idx" ON "EducationLevel"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "ExamMode_nameCn_key" ON "ExamMode"("nameCn");

-- CreateIndex
CREATE INDEX "ExamMode_nameCn_idx" ON "ExamMode"("nameCn");

-- CreateIndex
CREATE INDEX "ExamMode_nameEn_idx" ON "ExamMode"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Room_jwId_key" ON "Room"("jwId");

-- CreateIndex
CREATE INDEX "Room_jwId_idx" ON "Room"("jwId");

-- CreateIndex
CREATE INDEX "Room_nameCn_idx" ON "Room"("nameCn");

-- CreateIndex
CREATE INDEX "Room_nameEn_idx" ON "Room"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Room_buildingId_code_key" ON "Room"("buildingId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_jwId_key" ON "RoomType"("jwId");

-- CreateIndex
CREATE INDEX "RoomType_jwId_idx" ON "RoomType"("jwId");

-- CreateIndex
CREATE INDEX "RoomType_nameCn_idx" ON "RoomType"("nameCn");

-- CreateIndex
CREATE INDEX "RoomType_nameEn_idx" ON "RoomType"("nameEn");

-- CreateIndex
CREATE INDEX "Schedule_date_idx" ON "Schedule"("date");

-- CreateIndex
CREATE INDEX "Schedule_roomId_idx" ON "Schedule"("roomId");

-- CreateIndex
CREATE INDEX "Schedule_sectionId_idx" ON "Schedule"("sectionId");

-- CreateIndex
CREATE INDEX "Schedule_teacherId_idx" ON "Schedule"("teacherId");

-- CreateIndex
CREATE INDEX "Schedule_scheduleGroupId_idx" ON "Schedule"("scheduleGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleGroup_jwId_key" ON "ScheduleGroup"("jwId");

-- CreateIndex
CREATE INDEX "ScheduleGroup_jwId_idx" ON "ScheduleGroup"("jwId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_jwId_key" ON "Section"("jwId");

-- CreateIndex
CREATE INDEX "Section_jwId_idx" ON "Section"("jwId");

-- CreateIndex
CREATE INDEX "Section_code_idx" ON "Section"("code");

-- CreateIndex
CREATE INDEX "Section_bizTypeId_idx" ON "Section"("bizTypeId");

-- CreateIndex
CREATE INDEX "Section_period_idx" ON "Section"("period");

-- CreateIndex
CREATE INDEX "Section_graduateAndPostgraduate_idx" ON "Section"("graduateAndPostgraduate");

-- CreateIndex
CREATE INDEX "Section_courseId_idx" ON "Section"("courseId");

-- CreateIndex
CREATE INDEX "Section_semesterId_idx" ON "Section"("semesterId");

-- CreateIndex
CREATE INDEX "Section_examModeId_idx" ON "Section"("examModeId");

-- CreateIndex
CREATE INDEX "Section_campusId_idx" ON "Section"("campusId");

-- CreateIndex
CREATE INDEX "Section_openDepartmentId_idx" ON "Section"("openDepartmentId");

-- CreateIndex
CREATE INDEX "Section_roomTypeId_idx" ON "Section"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_jwId_key" ON "Exam"("jwId");

-- CreateIndex
CREATE INDEX "Exam_jwId_idx" ON "Exam"("jwId");

-- CreateIndex
CREATE INDEX "Exam_examType_idx" ON "Exam"("examType");

-- CreateIndex
CREATE INDEX "Exam_examDate_idx" ON "Exam"("examDate");

-- CreateIndex
CREATE INDEX "Exam_examBatchId_idx" ON "Exam"("examBatchId");

-- CreateIndex
CREATE INDEX "Exam_sectionId_idx" ON "Exam"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBatch_nameCn_key" ON "ExamBatch"("nameCn");

-- CreateIndex
CREATE INDEX "ExamBatch_nameCn_idx" ON "ExamBatch"("nameCn");

-- CreateIndex
CREATE INDEX "ExamRoom_examId_idx" ON "ExamRoom"("examId");

-- CreateIndex
CREATE INDEX "ExamRoom_room_idx" ON "ExamRoom"("room");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_jwId_key" ON "Semester"("jwId");

-- CreateIndex
CREATE INDEX "Semester_jwId_idx" ON "Semester"("jwId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_personId_key" ON "Teacher"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_teacherId_key" ON "Teacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_code_key" ON "Teacher"("code");

-- CreateIndex
CREATE INDEX "Teacher_code_idx" ON "Teacher"("code");

-- CreateIndex
CREATE INDEX "Teacher_nameCn_idx" ON "Teacher"("nameCn");

-- CreateIndex
CREATE INDEX "Teacher_nameEn_idx" ON "Teacher"("nameEn");

-- CreateIndex
CREATE INDEX "Teacher_teacherTitleId_idx" ON "Teacher"("teacherTitleId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_nameCn_departmentId_key" ON "Teacher"("nameCn", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachLanguage_nameCn_key" ON "TeachLanguage"("nameCn");

-- CreateIndex
CREATE INDEX "TeachLanguage_nameCn_idx" ON "TeachLanguage"("nameCn");

-- CreateIndex
CREATE INDEX "TeachLanguage_nameEn_idx" ON "TeachLanguage"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherTitle_jwId_key" ON "TeacherTitle"("jwId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherTitle_nameCn_key" ON "TeacherTitle"("nameCn");

-- CreateIndex
CREATE INDEX "TeacherTitle_jwId_idx" ON "TeacherTitle"("jwId");

-- CreateIndex
CREATE INDEX "TeacherTitle_nameCn_idx" ON "TeacherTitle"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherLessonType_jwId_key" ON "TeacherLessonType"("jwId");

-- CreateIndex
CREATE INDEX "TeacherLessonType_jwId_idx" ON "TeacherLessonType"("jwId");

-- CreateIndex
CREATE INDEX "TeacherLessonType_nameCn_idx" ON "TeacherLessonType"("nameCn");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherId_idx" ON "TeacherAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_sectionId_idx" ON "TeacherAssignment"("sectionId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherLessonTypeId_idx" ON "TeacherAssignment"("teacherLessonTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_sectionId_key" ON "TeacherAssignment"("teacherId", "sectionId");

-- CreateIndex
CREATE INDEX "_SectionAdminClasses_B_index" ON "_SectionAdminClasses"("B");

-- CreateIndex
CREATE INDEX "_SectionTeachers_B_index" ON "_SectionTeachers"("B");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "ClassType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_classifyId_fkey" FOREIGN KEY ("classifyId") REFERENCES "CourseClassify"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_gradationId_fkey" FOREIGN KEY ("gradationId") REFERENCES "CourseGradation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "CourseType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_scheduleGroupId_fkey" FOREIGN KEY ("scheduleGroupId") REFERENCES "ScheduleGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleGroup" ADD CONSTRAINT "ScheduleGroup_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_examModeId_fkey" FOREIGN KEY ("examModeId") REFERENCES "ExamMode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_openDepartmentId_fkey" FOREIGN KEY ("openDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_teachLanguageId_fkey" FOREIGN KEY ("teachLanguageId") REFERENCES "TeachLanguage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examBatchId_fkey" FOREIGN KEY ("examBatchId") REFERENCES "ExamBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoom" ADD CONSTRAINT "ExamRoom_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_teacherTitleId_fkey" FOREIGN KEY ("teacherTitleId") REFERENCES "TeacherTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherLessonTypeId_fkey" FOREIGN KEY ("teacherLessonTypeId") REFERENCES "TeacherLessonType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionAdminClasses" ADD CONSTRAINT "_SectionAdminClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "AdminClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionAdminClasses" ADD CONSTRAINT "_SectionAdminClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionTeachers" ADD CONSTRAINT "_SectionTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionTeachers" ADD CONSTRAINT "_SectionTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
