import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function saveFile(
  applicationId: number,
  file: File
): Promise<{ storedName: string; size: number }> {
  const dir = path.join(UPLOADS_DIR, String(applicationId));
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const filePath = path.join(dir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return { storedName, size: buffer.length };
}

export async function deleteFile(
  applicationId: number,
  storedName: string
): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, String(applicationId), storedName);
  await fs.unlink(filePath).catch(() => {});
}

export function getFilePath(applicationId: number, storedName: string): string {
  return path.join(UPLOADS_DIR, String(applicationId), storedName);
}
