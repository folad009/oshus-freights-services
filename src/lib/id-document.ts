import { GovernmentIdType } from "@/types/enums";

export const ID_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export const ID_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** ID types customers can upload when booking a shipment. */
export const CUSTOMER_GOVERNMENT_ID_TYPES = [
  GovernmentIdType.NIN,
  GovernmentIdType.DRIVERS_LICENSE,
  GovernmentIdType.INTERNATIONAL_PASSPORT,
] as const;

export const GOVERNMENT_ID_TYPE_LABELS: Record<GovernmentIdType, string> = {
  NIN: "NIN (National Identification Number)",
  INTERNATIONAL_PASSPORT: "International passport",
  DRIVERS_LICENSE: "Driver's license",
  NATIONAL_ID: "National ID card",
  OTHER_GOVERNMENT_ID: "Other government-issued ID",
};

export const ID_NUMBER_PLACEHOLDERS: Partial<Record<GovernmentIdType, string>> = {
  [GovernmentIdType.NIN]: "12345678901",
  [GovernmentIdType.NATIONAL_ID]: "12345678901",
  [GovernmentIdType.DRIVERS_LICENSE]: "ABC-12345678",
  [GovernmentIdType.INTERNATIONAL_PASSPORT]: "A1234567",
};

export function getGovernmentIdTypeOptions() {
  return CUSTOMER_GOVERNMENT_ID_TYPES.map((value) => ({
    value,
    label: GOVERNMENT_ID_TYPE_LABELS[value],
  }));
}

export function getGovernmentIdTypeLabel(type: GovernmentIdType | string | null | undefined) {
  if (!type) return "—";
  return GOVERNMENT_ID_TYPE_LABELS[type as GovernmentIdType] ?? type;
}

export function getIdNumberPlaceholder(type: GovernmentIdType | "") {
  if (!type) return "Enter ID number";
  return ID_NUMBER_PLACEHOLDERS[type] ?? "Enter ID number";
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

export function isCustomerGovernmentIdType(value: string): value is GovernmentIdType {
  return (CUSTOMER_GOVERNMENT_ID_TYPES as readonly string[]).includes(value);
}

export function normalizeIdDocumentNumber(type: GovernmentIdType, raw: string) {
  const trimmed = raw.trim();
  if (type === GovernmentIdType.NIN || type === GovernmentIdType.NATIONAL_ID) {
    return trimmed.replace(/\D/g, "");
  }
  return trimmed.toUpperCase().replace(/\s+/g, "");
}

export function validateIdDocumentNumber(type: GovernmentIdType, raw: string) {
  const value = normalizeIdDocumentNumber(type, raw);

  if (!value) {
    throw new Error("ID number is required");
  }

  switch (type) {
    case GovernmentIdType.NIN:
    case GovernmentIdType.NATIONAL_ID:
      if (!/^\d{11}$/.test(value)) {
        throw new Error("NIN must be exactly 11 digits");
      }
      break;
    case GovernmentIdType.DRIVERS_LICENSE:
      if (!/^[A-Z0-9-]{5,20}$/i.test(value)) {
        throw new Error("Driver's license number must be 5–20 letters, numbers, or hyphens");
      }
      break;
    case GovernmentIdType.INTERNATIONAL_PASSPORT:
      if (!/^[A-Z0-9]{6,9}$/i.test(value)) {
        throw new Error("Passport number must be 6–9 letters or numbers");
      }
      break;
    default:
      if (value.length < 4 || value.length > 32) {
        throw new Error("ID number must be between 4 and 32 characters");
      }
  }

  return value;
}

export function validateGovernmentIdUpload(params: {
  type: GovernmentIdType;
  file: File;
  idNumber: string;
}) {
  validateIdDocumentFile(params.file);
  return validateIdDocumentNumber(params.type, params.idNumber);
}

export function maskIdDocumentNumber(type: GovernmentIdType | string, value: string | null | undefined) {
  if (!value) return "—";
  const normalized = normalizeIdDocumentNumber(type as GovernmentIdType, value);
  if (normalized.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

export const ID_DOCUMENT_MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
