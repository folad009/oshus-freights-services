import { randomUUID } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { GovernmentIdType } from "@/types/enums";
import {
  ID_DOCUMENT_MIME_EXTENSION,
  validateIdDocumentFile,
} from "@/lib/id-document";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "id-documents");
const PENDING_ROOT = path.join(UPLOAD_ROOT, "pending");

type PendingDocumentMeta = {
  storageKey: string;
  userId: string;
  idDocumentType: GovernmentIdType;
  originalName: string;
  mimeType: string;
};

function pendingFilePath(storageKey: string) {
  return path.join(PENDING_ROOT, storageKey);
}

function pendingMetaPath(storageKey: string) {
  return `${pendingFilePath(storageKey)}.json`;
}

function shipmentDocumentPath(storageKey: string) {
  return path.join(UPLOAD_ROOT, storageKey);
}

function extensionForMime(mimeType: string) {
  const ext = ID_DOCUMENT_MIME_EXTENSION[mimeType];
  if (!ext) throw new Error("Unsupported file type. Upload JPG, PNG, WEBP, or PDF.");
  return ext;
}

export async function savePendingIdDocument(params: {
  userId: string;
  file: File;
  idDocumentType: GovernmentIdType;
}) {
  validateIdDocumentFile(params.file);

  const ext = extensionForMime(params.file.type);
  const storageKey = `${params.userId}/${randomUUID()}.${ext}`;
  const filePath = pendingFilePath(storageKey);
  const metaPath = pendingMetaPath(storageKey);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(await params.file.arrayBuffer()));

  const meta: PendingDocumentMeta = {
    storageKey,
    userId: params.userId,
    idDocumentType: params.idDocumentType,
    originalName: params.file.name,
    mimeType: params.file.type,
  };

  await writeFile(metaPath, JSON.stringify(meta), "utf8");
  return meta;
}

export async function attachPendingIdDocument(params: {
  storageKey: string;
  userId: string;
  shipmentId: string;
  idDocumentType: GovernmentIdType;
}) {
  if (!params.storageKey.startsWith(`${params.userId}/`)) {
    throw new Error("Invalid ID document upload.");
  }

  const metaPath = pendingMetaPath(params.storageKey);
  const pendingPath = pendingFilePath(params.storageKey);

  let metaRaw: string;
  try {
    metaRaw = await readFile(metaPath, "utf8");
  } catch {
    throw new Error("ID document upload expired or not found. Please upload again.");
  }

  const meta = JSON.parse(metaRaw) as PendingDocumentMeta;
  if (meta.userId !== params.userId || meta.idDocumentType !== params.idDocumentType) {
    throw new Error("ID document details do not match the uploaded file.");
  }

  const ext = path.extname(pendingPath);
  const finalStorageKey = `${params.shipmentId}/id-document${ext}`;
  const finalPath = shipmentDocumentPath(finalStorageKey);

  await mkdir(path.dirname(finalPath), { recursive: true });
  await rename(pendingPath, finalPath);
  await unlink(metaPath).catch(() => undefined);

  return {
    idDocumentType: params.idDocumentType,
    idDocumentStorageKey: finalStorageKey,
    idDocumentOriginalName: meta.originalName,
    idDocumentMimeType: meta.mimeType,
    idDocumentUploadedAt: new Date(),
  };
}

export async function readShipmentIdDocument(storageKey: string) {
  const filePath = shipmentDocumentPath(storageKey);
  const buffer = await readFile(filePath);
  return buffer;
}

export function getIdDocumentAbsolutePath(storageKey: string) {
  return shipmentDocumentPath(storageKey);
}
