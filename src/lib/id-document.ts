import { GovernmentIdType } from "@/types/enums";

export const ID_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export const ID_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const GOVERNMENT_ID_TYPE_LABELS: Record<GovernmentIdType, string> = {
  INTERNATIONAL_PASSPORT: "International passport",
  DRIVERS_LICENSE: "Driver's license",
  NATIONAL_ID: "National ID card",
  OTHER_GOVERNMENT_ID: "Other government-issued ID",
};

export function getGovernmentIdTypeOptions() {
  return (Object.keys(GovernmentIdType) as GovernmentIdType[]).map((value) => ({
    value,
    label: GOVERNMENT_ID_TYPE_LABELS[value],
  }));
}

export function getGovernmentIdTypeLabel(type: GovernmentIdType | string | null | undefined) {
  if (!type) return "—";
  return GOVERNMENT_ID_TYPE_LABELS[type as GovernmentIdType] ?? type;
}

export function validateIdDocumentFile(file: File) {
  if (!ID_DOCUMENT_ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Invalid file type. Upload a JPG, PNG, WEBP, or PDF.");
  }
  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }
  if (file.size > ID_DOCUMENT_MAX_BYTES) {
    throw new Error("File is too large. Maximum size is 5 MB.");
  }
}

export function isGovernmentIdType(value: string): value is GovernmentIdType {
  return Object.values(GovernmentIdType).includes(value as GovernmentIdType);
}

export const ID_DOCUMENT_MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
