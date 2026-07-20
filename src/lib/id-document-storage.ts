import { randomUUID } from "crypto";
import path from "path";
import { GovernmentIdType } from "@/types/enums";
import {
  ID_DOCUMENT_MIME_EXTENSION,
  validateGovernmentIdUpload,
  validateIdDocumentNumber,
} from "@/lib/id-document";
import { db } from "@/lib/db";

type PendingDocumentMeta = {
  storageKey: string;
  userId: string;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
  originalName: string;
  mimeType: string;
};

type IntakePendingDocumentMeta = {
  storageKey: string;
  intakeToken: string;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
  originalName: string;
  mimeType: string;
};

function extensionForMime(mimeType: string) {
  const ext = ID_DOCUMENT_MIME_EXTENSION[mimeType];
  if (!ext) throw new Error("Unsupported file type. Upload JPG, PNG, WEBP, or PDF.");
  return ext;
}

async function readStoredBlob(storageKey: string) {
  const record = await db.idDocumentBlob.findUnique({
    where: { storageKey },
  });
  if (!record) {
    throw new Error("ID document upload expired or not found. Please upload again.");
  }
  return record;
}

export async function deleteStoredBlobIfExists(storageKey: string | null | undefined) {
  if (!storageKey) return;
  await db.idDocumentBlob.delete({ where: { storageKey } }).catch(() => undefined);
}

async function writeStoredBlob(params: {
  storageKey: string;
  content: Buffer;
  mimeType: string;
  metaJson: string;
}) {
  await db.idDocumentBlob.create({
    data: {
      storageKey: params.storageKey,
      content: new Uint8Array(params.content),
      mimeType: params.mimeType,
      metaJson: params.metaJson,
    },
  });
}

async function moveStoredBlob(params: {
  sourceStorageKey: string;
  destinationStorageKey: string;
}) {
  const source = await readStoredBlob(params.sourceStorageKey);
  await db.idDocumentBlob.create({
    data: {
      storageKey: params.destinationStorageKey,
      content: source.content,
      mimeType: source.mimeType,
      metaJson: source.metaJson,
    },
  });
  await db.idDocumentBlob.delete({ where: { storageKey: params.sourceStorageKey } });
}

export async function savePendingIdDocument(params: {
  userId: string;
  file: File;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
}) {
  const normalizedNumber = validateGovernmentIdUpload({
    type: params.idDocumentType,
    file: params.file,
    idNumber: params.idDocumentNumber,
  });

  const ext = extensionForMime(params.file.type);
  const storageKey = `${params.userId}/${randomUUID()}.${ext}`;

  const meta: PendingDocumentMeta = {
    storageKey,
    userId: params.userId,
    idDocumentType: params.idDocumentType,
    idDocumentNumber: normalizedNumber,
    originalName: params.file.name,
    mimeType: params.file.type,
  };

  await writeStoredBlob({
    storageKey,
    content: Buffer.from(await params.file.arrayBuffer()),
    mimeType: params.file.type,
    metaJson: JSON.stringify(meta),
  });

  return meta;
}

export async function saveIntakePendingIdDocument(params: {
  intakeToken: string;
  file: File;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
}) {
  const normalizedNumber = validateGovernmentIdUpload({
    type: params.idDocumentType,
    file: params.file,
    idNumber: params.idDocumentNumber,
  });

  const ext = extensionForMime(params.file.type);
  const storageKey = `intake/${params.intakeToken}/${randomUUID()}.${ext}`;

  const meta: IntakePendingDocumentMeta = {
    storageKey,
    intakeToken: params.intakeToken,
    idDocumentType: params.idDocumentType,
    idDocumentNumber: normalizedNumber,
    originalName: params.file.name,
    mimeType: params.file.type,
  };

  await writeStoredBlob({
    storageKey,
    content: Buffer.from(await params.file.arrayBuffer()),
    mimeType: params.file.type,
    metaJson: JSON.stringify(meta),
  });

  return meta;
}

export async function attachPendingIdDocument(params: {
  storageKey: string;
  userId: string;
  shipmentId: string;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
}) {
  if (!params.storageKey.startsWith(`${params.userId}/`)) {
    throw new Error("Invalid ID document upload.");
  }

  const normalizedNumber = validateIdDocumentNumber(params.idDocumentType, params.idDocumentNumber);
  const record = await readStoredBlob(params.storageKey);
  const meta = JSON.parse(record.metaJson) as PendingDocumentMeta;

  if (
    meta.userId !== params.userId ||
    meta.idDocumentType !== params.idDocumentType ||
    meta.idDocumentNumber !== normalizedNumber
  ) {
    throw new Error("ID document details do not match the uploaded file.");
  }

  const ext = path.extname(params.storageKey);
  const finalStorageKey = `${params.shipmentId}/id-document${ext}`;
  await moveStoredBlob({
    sourceStorageKey: params.storageKey,
    destinationStorageKey: finalStorageKey,
  });

  return {
    idDocumentType: params.idDocumentType,
    idDocumentNumber: meta.idDocumentNumber,
    idDocumentStorageKey: finalStorageKey,
    idDocumentOriginalName: meta.originalName,
    idDocumentMimeType: meta.mimeType,
    idDocumentUploadedAt: new Date(),
  };
}

export async function attachIntakePendingIdDocument(params: {
  storageKey: string;
  intakeToken: string;
  shipmentId: string;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
}) {
  if (!params.storageKey.startsWith(`intake/${params.intakeToken}/`)) {
    throw new Error("Invalid ID document upload.");
  }

  const normalizedNumber = validateIdDocumentNumber(params.idDocumentType, params.idDocumentNumber);
  const record = await readStoredBlob(params.storageKey);
  const meta = JSON.parse(record.metaJson) as IntakePendingDocumentMeta;

  if (
    meta.intakeToken !== params.intakeToken ||
    meta.idDocumentType !== params.idDocumentType ||
    meta.idDocumentNumber !== normalizedNumber
  ) {
    throw new Error("ID document details do not match the uploaded file.");
  }

  const ext = path.extname(params.storageKey);
  const finalStorageKey = `${params.shipmentId}/id-document${ext}`;
  await moveStoredBlob({
    sourceStorageKey: params.storageKey,
    destinationStorageKey: finalStorageKey,
  });

  return {
    idDocumentType: params.idDocumentType,
    idDocumentNumber: meta.idDocumentNumber,
    idDocumentStorageKey: finalStorageKey,
    idDocumentOriginalName: meta.originalName,
    idDocumentMimeType: meta.mimeType,
    idDocumentUploadedAt: new Date(),
  };
}

export async function saveCustomerIdDocumentDirect(params: {
  customerId: string;
  file: File;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
}) {
  const normalizedNumber = validateGovernmentIdUpload({
    type: params.idDocumentType,
    file: params.file,
    idNumber: params.idDocumentNumber,
  });

  const ext = extensionForMime(params.file.type);
  const storageKey = `customers/${params.customerId}/id-document.${ext}`;

  await writeStoredBlob({
    storageKey,
    content: Buffer.from(await params.file.arrayBuffer()),
    mimeType: params.file.type,
    metaJson: JSON.stringify({
      storageKey,
      customerId: params.customerId,
      idDocumentType: params.idDocumentType,
      idDocumentNumber: normalizedNumber,
      originalName: params.file.name,
      mimeType: params.file.type,
    }),
  });

  return {
    idDocumentType: params.idDocumentType,
    idDocumentNumber: normalizedNumber,
    idDocumentStorageKey: storageKey,
    idDocumentOriginalName: params.file.name,
    idDocumentMimeType: params.file.type,
    idDocumentUploadedAt: new Date(),
  };
}

export async function attachPendingIdDocumentToCustomer(params: {
  storageKey: string;
  userId: string;
  customerId: string;
  idDocumentType: GovernmentIdType;
  idDocumentNumber: string;
}) {
  if (!params.storageKey.startsWith(`${params.userId}/`)) {
    throw new Error("Invalid ID document upload.");
  }

  const normalizedNumber = validateIdDocumentNumber(params.idDocumentType, params.idDocumentNumber);
  const record = await readStoredBlob(params.storageKey);
  const meta = JSON.parse(record.metaJson) as PendingDocumentMeta;

  if (
    meta.userId !== params.userId ||
    meta.idDocumentType !== params.idDocumentType ||
    meta.idDocumentNumber !== normalizedNumber
  ) {
    throw new Error("ID document details do not match the uploaded file.");
  }

  const ext = path.extname(params.storageKey);
  const finalStorageKey = `customers/${params.customerId}/id-document${ext}`;
  await moveStoredBlob({
    sourceStorageKey: params.storageKey,
    destinationStorageKey: finalStorageKey,
  });

  return {
    idDocumentType: params.idDocumentType,
    idDocumentNumber: meta.idDocumentNumber,
    idDocumentStorageKey: finalStorageKey,
    idDocumentOriginalName: meta.originalName,
    idDocumentMimeType: meta.mimeType,
    idDocumentUploadedAt: new Date(),
  };
}

export async function readCustomerIdDocument(storageKey: string) {
  return readShipmentIdDocument(storageKey);
}

export async function readShipmentIdDocument(storageKey: string) {
  const record = await readStoredBlob(storageKey);
  return Buffer.from(record.content);
}
