"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formSelectClass } from "@/components/forms/shipment-package-metrics-panel";
import { getGovernmentIdTypeOptions, ID_DOCUMENT_MAX_BYTES } from "@/lib/id-document";
import { GovernmentIdType } from "@/types/enums";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = ".jpg,.jpeg,.png,.webp,.pdf";

type IdDocumentUploadFieldProps = {
  idDocumentType: GovernmentIdType | "";
  onIdDocumentTypeChange: (value: GovernmentIdType | "") => void;
  selectedFile: File | null;
  onSelectedFileChange: (file: File | null) => void;
  error?: string;
};

export function IdDocumentUploadField({
  idDocumentType,
  onIdDocumentTypeChange,
  selectedFile,
  onSelectedFileChange,
  error,
}: IdDocumentUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const options = useMemo(() => getGovernmentIdTypeOptions(), []);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onSelectedFileChange(file);
    event.target.value = "";
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div>
        <p className="text-base font-medium">Government-issued ID</p>
        <p className="text-sm text-muted-foreground">
          Upload a clear photo or scan of your international passport, driver&apos;s license, or
          other government ID (JPG, PNG, WEBP, or PDF, max 5 MB).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="idDocumentType">ID type</Label>
        <select
          id="idDocumentType"
          className={formSelectClass}
          value={idDocumentType}
          onChange={(event) =>
            onIdDocumentTypeChange(event.target.value as GovernmentIdType | "")
          }
        >
          <option value="">Select ID type</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="idDocumentFile">Upload document</Label>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="idDocumentFile"
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-base font-medium hover:bg-muted/50",
              !idDocumentType && "pointer-events-none opacity-50"
            )}
          >
            <Upload className="size-4" />
            Choose file
          </label>
          <input
            id="idDocumentFile"
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="sr-only"
            disabled={!idDocumentType}
            onChange={handleFileChange}
          />
          {selectedFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectedFileChange(null)}
            >
              <X className="size-4" />
              Remove
            </Button>
          )}
        </div>

        {selectedFile ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="ID preview"
                  className="h-20 w-28 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-20 w-28 items-center justify-center rounded-md border bg-background">
                  <FileText className="size-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 text-base">
                <p className="truncate font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · max{" "}
                  {(ID_DOCUMENT_MAX_BYTES / 1024 / 1024).toFixed(0)} MB
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No file selected yet.</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export async function uploadCustomerIdDocument(file: File, idDocumentType: GovernmentIdType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("idDocumentType", idDocumentType);

  const res = await fetch("/api/shipments/id-document", {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.message ?? "Failed to upload ID document");
  }
  return json.data as {
    storageKey: string;
    idDocumentType: GovernmentIdType;
    originalName: string;
    mimeType: string;
  };
}
