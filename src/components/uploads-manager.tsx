"use client";

import { ArrowUpRight, Pencil, UploadCloud } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/format-bytes";
import { UploadFlowError, uploadFileWithPresign } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type UploadItem = {
  id: string;
  key: string;
  filename: string;
  size: number;
  createdAt: string;
};

type UploadsManagerProps = {
  initialUploads: UploadItem[];
  initialUsedBytes: number;
  maxFileSizeBytes: number;
  quotaBytes: number;
  accessUrl: string;
};

type UpdateResponse = {
  upload: UploadItem;
};

type DeleteResponse = {
  deletedId: string;
  deletedSize: number;
};

type UsageSummaryCardProps = {
  usageLabel: string;
  usagePercent: number;
  remainingLabel: string;
};

type UploadDropzoneProps = {
  isDragActive: boolean;
  isUploading: boolean;
  selectedFile: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: () => void;
  onDragActiveChange: (active: boolean) => void;
  onSelectFile: (file: File) => void;
  labels: {
    fileLimit: string;
    uploadCardDescription: string;
    uploadAction: string;
    uploading: string;
  };
};

type UploadsTableProps = {
  uploads: UploadItem[];
  editingId: string | null;
  editingName: string;
  isSaving: boolean;
  isDeleting: boolean;
  formatter: Intl.DateTimeFormat;
  onStartRename: (item: UploadItem) => void;
  onCancelRename: () => void;
  onRename: (item: UploadItem) => void;
  onEditNameChange: (value: string) => void;
  onOpen: (item: UploadItem) => void;
  onCopyLink: (item: UploadItem) => void;
  onDelete: (item: UploadItem) => void;
  labels: {
    emptyTitle: string;
    emptyDescription: string;
    tableName: string;
    tableSize: string;
    tableUploaded: string;
    tableActions: string;
    saveRenameAction: string;
    cancelRenameAction: string;
    renameAction: string;
    downloadAction: string;
    copyLinkAction: string;
    deleteAction: string;
  };
};

type UploadDeleteDialogProps = {
  filename: string;
  isDeleting: boolean;
  onConfirm: () => void;
  cancelLabel: string;
  confirmLabel: string;
  title: string;
  description: string;
};

function UsageSummaryCard({
  usageLabel,
  usagePercent,
  remainingLabel,
}: UsageSummaryCardProps) {
  return (
    <div className="rounded-2xl border bg-muted/10 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{usageLabel}</p>
          <p className="text-sm tabular-nums">{usagePercent}%</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-input">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-muted-foreground text-sm">{remainingLabel}</p>
      </div>
    </div>
  );
}

function UploadDropzone({
  isDragActive,
  isUploading,
  selectedFile,
  inputRef,
  onPickFile,
  onDragActiveChange,
  onSelectFile,
  labels,
}: UploadDropzoneProps) {
  return (
    <div className="space-y-3">
      <Card
        className={cn(
          "rounded-2xl border border-dashed bg-muted/20 p-5 transition-colors",
          isDragActive && "border-primary bg-primary/10",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          onDragActiveChange(true);
        }}
        onDragLeave={() => onDragActiveChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragActiveChange(false);
          const file = event.dataTransfer.files?.[0];
          if (file) {
            onSelectFile(file);
          }
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-muted-foreground text-sm">
            <span>{labels.fileLimit}</span>
            <span>{labels.uploadCardDescription}</span>
          </div>
          <Button onClick={onPickFile} disabled={isUploading}>
            <UploadCloud className="h-4 w-4" />
            {isUploading ? labels.uploading : labels.uploadAction}
          </Button>
          <Input
            id="upload-file"
            ref={inputRef}
            type="file"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onSelectFile(file);
              }
            }}
          />
        </div>
        {selectedFile && (
          <p className="mt-3 text-muted-foreground text-sm">
            {selectedFile.name} · {formatBytes(selectedFile.size)}
          </p>
        )}
      </Card>
    </div>
  );
}

function UploadsTable({
  uploads,
  editingId,
  editingName,
  isSaving,
  isDeleting,
  formatter,
  onStartRename,
  onCancelRename,
  onRename,
  onEditNameChange,
  onOpen,
  onCopyLink,
  onDelete,
  labels,
}: UploadsTableProps) {
  if (uploads.length === 0) {
    return (
      <Empty className="border-none bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UploadCloud className="h-4 w-4" />
          </EmptyMedia>
          <EmptyTitle>{labels.emptyTitle}</EmptyTitle>
          <EmptyDescription>{labels.emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.tableName}</TableHead>
          <TableHead>{labels.tableSize}</TableHead>
          <TableHead>{labels.tableUploaded}</TableHead>
          <TableHead className="text-right">{labels.tableActions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {uploads.map((upload) => (
          <TableRow key={upload.id}>
            <TableCell className="font-medium">
              {editingId === upload.id ? (
                <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                  <Input
                    value={editingName}
                    onChange={(event) => onEditNameChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onRename(upload);
                      }
                      if (event.key === "Escape") {
                        onCancelRename();
                      }
                    }}
                    className="w-auto min-w-[12rem] max-w-[24rem] flex-none"
                  />
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onRename(upload)}
                    disabled={isSaving}
                  >
                    {labels.saveRenameAction}
                  </Button>
                  <Button variant="ghost" size="xs" onClick={onCancelRename}>
                    {labels.cancelRenameAction}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                  <span className="whitespace-nowrap">{upload.filename}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onStartRename(upload)}
                    aria-label={labels.renameAction}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TableCell>
            <TableCell>{formatBytes(upload.size)}</TableCell>
            <TableCell>
              {formatter.format(new Date(upload.createdAt))}
            </TableCell>
            <TableCell className="text-right">
              {editingId === upload.id ? null : (
                <div className="flex flex-nowrap justify-end gap-2 overflow-x-auto">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onOpen(upload)}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    {labels.downloadAction}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onCopyLink(upload)}
                  >
                    {labels.copyLinkAction}
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => onDelete(upload)}
                    disabled={isDeleting}
                  >
                    {labels.deleteAction}
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UploadDeleteDialog({
  filename: _filename,
  isDeleting,
  onConfirm,
  cancelLabel,
  confirmLabel,
  title,
  description,
}: UploadDeleteDialogProps) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogClose render={<Button variant="ghost" />}>
          {cancelLabel}
        </AlertDialogClose>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export function UploadsManager({
  initialUploads,
  initialUsedBytes,
  maxFileSizeBytes,
  quotaBytes,
  accessUrl: _accessUrl,
}: UploadsManagerProps) {
  const t = useTranslations("uploads");
  const locale = useLocale();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadItem[]>(initialUploads);
  const [usedBytes, setUsedBytes] = useState(initialUsedBytes);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UploadItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const usagePercent = quotaBytes
    ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100))
    : 0;

  const usageLabel = t("usageLabel", {
    used: formatBytes(usedBytes),
    total: formatBytes(quotaBytes),
  });

  const remainingLabel = t("remainingLabel", {
    remaining: formatBytes(Math.max(quotaBytes - usedBytes, 0)),
  });

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSelectedFile(null);
  };

  const handleUpload = async (file: File) => {
    if (isUploading) return;

    setSelectedFile(file);
    setIsUploading(true);

    try {
      const { upload, summary } = await uploadFileWithPresign<UploadItem>({
        file,
        maxFileSizeBytes,
      });
      setUploads((current) => [upload, ...current]);
      setUsedBytes((current) => summary.usedBytes ?? current + file.size);

      toast({
        title: t("toastUploadSuccessTitle"),
        description: t("toastUploadSuccessDescription", {
          name: upload.filename,
        }),
        variant: "success",
      });
    } catch (error) {
      if (error instanceof UploadFlowError) {
        if (error.code === "Quota exceeded") {
          toast({
            title: t("toastQuotaExceededTitle"),
            description: t("toastQuotaExceededDescription"),
            variant: "warning",
          });
          return;
        }
        if (error.code === "File too large") {
          toast({
            title: t("toastFileTooLargeTitle"),
            description: t("toastFileTooLargeDescription", {
              size: formatBytes(maxFileSizeBytes),
            }),
            variant: "destructive",
          });
          return;
        }
      }
      console.error("Upload failed", error);
      toast({
        title: t("toastUploadErrorTitle"),
        description: t("toastUploadErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      resetInput();
    }
  };

  const handleOpen = (item: UploadItem) => {
    const url = `/api/uploads/${item.id}/download`;
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Open failed", error);
      toast({
        title: t("toastDownloadErrorTitle"),
        description: t("toastDownloadErrorDescription"),
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (item: UploadItem) => {
    const url = new URL(
      `/api/uploads/${item.id}/download`,
      window.location.origin,
    ).href;

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: t("toastLinkCopiedTitle"),
        description: t("toastLinkCopiedDescription"),
        variant: "success",
      });
    } catch (error) {
      console.error("Copy failed", error);
      toast({
        title: t("toastLinkCopyErrorTitle"),
        description: t("toastLinkCopyErrorDescription"),
        variant: "destructive",
      });
    }
  };

  const startRename = (item: UploadItem) => {
    setEditingId(item.id);
    setEditingName(item.filename);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleRename = async (item: UploadItem) => {
    if (!editingName.trim()) {
      toast({
        title: t("toastRenameMissingTitle"),
        description: t("toastRenameMissingDescription"),
        variant: "warning",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/uploads/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: editingName }),
      });

      if (!response.ok) {
        throw new Error("Rename failed");
      }

      const data = (await response.json()) as UpdateResponse;
      setUploads((current) =>
        current.map((upload) =>
          upload.id === data.upload.id ? data.upload : upload,
        ),
      );
      cancelRename();
      toast({
        title: t("toastRenameSuccessTitle"),
        description: t("toastRenameSuccessDescription"),
        variant: "success",
      });
    } catch (error) {
      console.error("Rename failed", error);
      toast({
        title: t("toastRenameErrorTitle"),
        description: t("toastRenameErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (item: UploadItem) => {
    setDeleteTarget(item);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/uploads/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      const data = (await response.json()) as DeleteResponse;
      setUploads((current) =>
        current.filter((upload) => upload.id !== data.deletedId),
      );
      setUsedBytes((current) => Math.max(0, current - data.deletedSize));
      toast({
        title: t("toastDeleteSuccessTitle"),
        description: t("toastDeleteSuccessDescription"),
        variant: "success",
      });
    } catch (error) {
      console.error("Delete failed", error);
      toast({
        title: t("toastDeleteErrorTitle"),
        description: t("toastDeleteErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AlertDialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open) {
          setDeleteTarget(null);
        }
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("uploadCardTitle")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
              <UsageSummaryCard
                usageLabel={usageLabel}
                usagePercent={usagePercent}
                remainingLabel={remainingLabel}
              />
              <UploadDropzone
                isDragActive={isDragActive}
                isUploading={isUploading}
                selectedFile={selectedFile}
                inputRef={inputRef}
                onPickFile={() => inputRef.current?.click()}
                onDragActiveChange={setIsDragActive}
                onSelectFile={(file) => void handleUpload(file)}
                labels={{
                  fileLimit: t("fileLimit", {
                    size: formatBytes(maxFileSizeBytes),
                  }),
                  uploadCardDescription: t("uploadCardDescription"),
                  uploadAction: t("uploadAction"),
                  uploading: t("uploading"),
                }}
              />
            </div>

            <div className="space-y-4">
              <UploadsTable
                uploads={uploads}
                editingId={editingId}
                editingName={editingName}
                isSaving={isSaving}
                isDeleting={isDeleting}
                formatter={formatter}
                onStartRename={startRename}
                onCancelRename={cancelRename}
                onRename={handleRename}
                onEditNameChange={setEditingName}
                onOpen={handleOpen}
                onCopyLink={handleCopyLink}
                onDelete={openDeleteDialog}
                labels={{
                  emptyTitle: t("emptyTitle"),
                  emptyDescription: t("emptyDescription"),
                  tableName: t("tableName"),
                  tableSize: t("tableSize"),
                  tableUploaded: t("tableUploaded"),
                  tableActions: t("tableActions"),
                  saveRenameAction: t("saveRenameAction"),
                  cancelRenameAction: t("cancelRenameAction"),
                  renameAction: t("renameAction"),
                  downloadAction: t("downloadAction"),
                  copyLinkAction: t("copyLinkAction"),
                  deleteAction: t("deleteAction"),
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <UploadDeleteDialog
        filename={deleteTarget?.filename ?? ""}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        cancelLabel={t("cancelRenameAction")}
        confirmLabel={t("deleteAction")}
        title={t("deleteAction")}
        description={t("deleteConfirm", { name: deleteTarget?.filename ?? "" })}
      />
    </AlertDialog>
  );
}
