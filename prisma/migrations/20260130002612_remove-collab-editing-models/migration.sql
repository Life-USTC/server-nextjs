-- DropForeignKey
ALTER TABLE "DescriptionEdit" DROP CONSTRAINT "DescriptionEdit_descriptionId_fkey";

-- DropForeignKey
ALTER TABLE "DescriptionEdit" DROP CONSTRAINT "DescriptionEdit_editorId_fkey";

-- DropTable
DROP TABLE "DescriptionEdit";
