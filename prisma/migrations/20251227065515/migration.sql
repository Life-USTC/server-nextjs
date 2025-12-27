-- CreateTable
CREATE TABLE "AdminClass" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),

    CONSTRAINT "AdminClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "code" VARCHAR(20) NOT NULL,
    "campusId" INTEGER,
    "jwId" INTEGER NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "jwId" INTEGER,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassType" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),

    CONSTRAINT "ClassType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100) NOT NULL,
    "classTypeId" INTEGER,
    "categoryId" INTEGER,
    "classifyId" INTEGER,
    "gradationId" INTEGER,
    "typeId" INTEGER,
    "educationLevelId" INTEGER,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCategory" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),

    CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseClassify" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),

    CONSTRAINT "CourseClassify_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGradation" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),

    CONSTRAINT "CourseGradation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseType" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),

    CONSTRAINT "CourseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "isCollege" BOOLEAN NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationLevel" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(50) NOT NULL,
    "nameEn" VARCHAR(50),

    CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamMode" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(200) NOT NULL,
    "nameEn" VARCHAR(200),

    CONSTRAINT "ExamMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "code" VARCHAR(20) NOT NULL,
    "floor" INTEGER NOT NULL,
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
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "code" VARCHAR(20) NOT NULL,
    "jwId" INTEGER NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "periods" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "experiment" TEXT,
    "customPlace" TEXT,
    "lessonType" TEXT,
    "weekIndex" INTEGER NOT NULL,
    "exerciseClass" BOOLEAN NOT NULL,
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
    "code" VARCHAR(20) NOT NULL,
    "credits" DOUBLE PRECISION,
    "period" INTEGER,
    "periodsPerWeek" INTEGER,
    "stdCount" INTEGER,
    "limitCount" INTEGER,
    "graduateAndPostgraduate" BOOLEAN,
    "dateTimePlaceText" TEXT,
    "dateTimePlacePersonText" JSONB,
    "courseId" INTEGER NOT NULL,
    "semesterId" INTEGER,
    "campusId" INTEGER,
    "examModeId" INTEGER,
    "openDepartmentId" INTEGER,
    "teachLanguageId" INTEGER,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" SERIAL NOT NULL,
    "jwId" INTEGER NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "startDate" DATE,
    "endDate" DATE,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "departmentId" INTEGER,
    "personId" INTEGER,
    "teacherId" INTEGER,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachLanguage" (
    "id" SERIAL NOT NULL,
    "nameCn" VARCHAR(50) NOT NULL,
    "nameEn" VARCHAR(50),

    CONSTRAINT "TeachLanguage_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "AdminClass_nameCn_key" ON "AdminClass"("nameCn");

-- CreateIndex
CREATE INDEX "AdminClass_nameCn_idx" ON "AdminClass"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "Building_jwId_key" ON "Building"("jwId");

-- CreateIndex
CREATE INDEX "Building_campusId_idx" ON "Building"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_nameCn_key" ON "Campus"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_jwId_key" ON "Campus"("jwId");

-- CreateIndex
CREATE INDEX "Campus_nameCn_idx" ON "Campus"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "ClassType_nameCn_key" ON "ClassType"("nameCn");

-- CreateIndex
CREATE INDEX "ClassType_nameCn_idx" ON "ClassType"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "Course_jwId_key" ON "Course"("jwId");

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
CREATE UNIQUE INDEX "CourseClassify_nameCn_key" ON "CourseClassify"("nameCn");

-- CreateIndex
CREATE INDEX "CourseClassify_nameCn_idx" ON "CourseClassify"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "CourseGradation_nameCn_key" ON "CourseGradation"("nameCn");

-- CreateIndex
CREATE INDEX "CourseGradation_nameCn_idx" ON "CourseGradation"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "CourseType_nameCn_key" ON "CourseType"("nameCn");

-- CreateIndex
CREATE INDEX "CourseType_nameCn_idx" ON "CourseType"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_nameCn_key" ON "Department"("nameCn");

-- CreateIndex
CREATE INDEX "Department_code_idx" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_nameCn_idx" ON "Department"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "EducationLevel_nameCn_key" ON "EducationLevel"("nameCn");

-- CreateIndex
CREATE INDEX "EducationLevel_nameCn_idx" ON "EducationLevel"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "ExamMode_nameCn_key" ON "ExamMode"("nameCn");

-- CreateIndex
CREATE INDEX "ExamMode_nameCn_idx" ON "ExamMode"("nameCn");

-- CreateIndex
CREATE UNIQUE INDEX "Room_jwId_key" ON "Room"("jwId");

-- CreateIndex
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");

-- CreateIndex
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_jwId_key" ON "RoomType"("jwId");

-- CreateIndex
CREATE INDEX "Schedule_roomId_idx" ON "Schedule"("roomId");

-- CreateIndex
CREATE INDEX "Schedule_scheduleGroupId_idx" ON "Schedule"("scheduleGroupId");

-- CreateIndex
CREATE INDEX "Schedule_sectionId_idx" ON "Schedule"("sectionId");

-- CreateIndex
CREATE INDEX "Schedule_teacherId_idx" ON "Schedule"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleGroup_jwId_key" ON "ScheduleGroup"("jwId");

-- CreateIndex
CREATE INDEX "ScheduleGroup_sectionId_idx" ON "ScheduleGroup"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_jwId_key" ON "Section"("jwId");

-- CreateIndex
CREATE INDEX "Section_campusId_idx" ON "Section"("campusId");

-- CreateIndex
CREATE INDEX "Section_courseId_idx" ON "Section"("courseId");

-- CreateIndex
CREATE INDEX "Section_examModeId_idx" ON "Section"("examModeId");

-- CreateIndex
CREATE INDEX "Section_openDepartmentId_idx" ON "Section"("openDepartmentId");

-- CreateIndex
CREATE INDEX "Section_semesterId_idx" ON "Section"("semesterId");

-- CreateIndex
CREATE INDEX "Section_teachLanguageId_idx" ON "Section"("teachLanguageId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_jwId_key" ON "Semester"("jwId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_name_key" ON "Semester"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_code_key" ON "Semester"("code");

-- CreateIndex
CREATE INDEX "Semester_code_idx" ON "Semester"("code");

-- CreateIndex
CREATE INDEX "Semester_name_idx" ON "Semester"("name");

-- CreateIndex
CREATE INDEX "Teacher_departmentId_idx" ON "Teacher"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachLanguage_nameCn_key" ON "TeachLanguage"("nameCn");

-- CreateIndex
CREATE INDEX "TeachLanguage_nameCn_idx" ON "TeachLanguage"("nameCn");

-- CreateIndex
CREATE INDEX "_SectionAdminClasses_B_index" ON "_SectionAdminClasses"("B");

-- CreateIndex
CREATE INDEX "_SectionTeachers_B_index" ON "_SectionTeachers"("B");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "ClassType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_classifyId_fkey" FOREIGN KEY ("classifyId") REFERENCES "CourseClassify"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_gradationId_fkey" FOREIGN KEY ("gradationId") REFERENCES "CourseGradation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "CourseType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_scheduleGroupId_fkey" FOREIGN KEY ("scheduleGroupId") REFERENCES "ScheduleGroup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ScheduleGroup" ADD CONSTRAINT "ScheduleGroup_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_examModeId_fkey" FOREIGN KEY ("examModeId") REFERENCES "ExamMode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_openDepartmentId_fkey" FOREIGN KEY ("openDepartmentId") REFERENCES "Department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_teachLanguageId_fkey" FOREIGN KEY ("teachLanguageId") REFERENCES "TeachLanguage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_SectionAdminClasses" ADD CONSTRAINT "_SectionAdminClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "AdminClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionAdminClasses" ADD CONSTRAINT "_SectionAdminClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionTeachers" ADD CONSTRAINT "_SectionTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionTeachers" ADD CONSTRAINT "_SectionTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
