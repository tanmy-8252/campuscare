import { get, head, put, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { seedWorkspace, type Workspace } from "@/app/domain";

type Record = { data: Workspace; version: string };
function remote() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
    return true;
  if (process.env.VERCEL === "1")
    throw new Error("Connect a private Vercel Blob store to CampusCare.");
  return false;
}
const keyFor = (id: string) => createHash("sha256").update(id).digest("hex");
const pathFor = (id: string) => "campuscare/workspaces/" + keyFor(id) + ".json";
const fileFor = (id: string) =>
  join(process.cwd(), ".campuscare-data", keyFor(id) + ".json");

async function localLock<T>(id: string, task: () => Promise<T>): Promise<T> {
  await mkdir(join(process.cwd(), ".campuscare-data"), {
    recursive: true,
    mode: 0o700,
  });
  const lock = fileFor(id) + ".lock";
  let acquired = false;
  for (let n = 0; n < 100; n++) {
    try {
      await mkdir(lock, { mode: 0o700 });
      acquired = true;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  if (!acquired)
    throw new Error(
      "Local workspace is busy. Retry or clear a stale development lock.",
    );
  try {
    return await task();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

export async function readWorkspace(id: string): Promise<Record> {
  if (remote()) {
    for (let attempt = 0; attempt < 4; attempt++) {
      let before;
      try {
        before = await head(pathFor(id));
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error;
      }
      const result = await get(pathFor(id), {
        access: "private",
        useCache: false,
      });
      if (result?.statusCode === 200 && result.stream) {
        const data = (await new Response(result.stream).json()) as Workspace;
        const after = await head(pathFor(id));
        // The delivery response can have a different ETag representation from
        // the write API. Pair the fresh body with a stable write-API version.
        if (before?.etag === after.etag)
          return { data, version: after.etag };
        continue;
      }
      const data = seedWorkspace();
      try {
        const created = await put(pathFor(id), JSON.stringify(data), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json",
          cacheControlMaxAge: 60,
        });
        return { data, version: created.etag };
      } catch (error) {
        // A concurrent first request may have already initialized this session.
        if (error instanceof BlobPreconditionFailedError) continue;
        // Another initializer may have created the object between our reads.
        try {
          await head(pathFor(id));
          continue;
        } catch {
          // Preserve the original write error when initialization did fail.
        }
        throw error;
      }
    }
    throw new Error("Unable to initialize the workspace.");
  }
  return localLock(id, async () => {
    try {
      return JSON.parse(await readFile(fileFor(id), "utf8")) as Record;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const record = { data: seedWorkspace(), version: randomUUID() };
      await writeFile(fileFor(id), JSON.stringify(record), { mode: 0o600 });
      return record;
    }
  });
}

export async function saveWorkspace(
  id: string,
  data: Workspace,
  expectedVersion: string,
): Promise<boolean> {
  if (remote()) {
    try {
      await put(pathFor(id), JSON.stringify(data), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        ifMatch: expectedVersion,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      return true;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) return false;
      throw error;
    }
  }
  return localLock(id, async () => {
    const current = JSON.parse(await readFile(fileFor(id), "utf8")) as Record;
    if (current.version !== expectedVersion) return false;
    const temp = fileFor(id) + "." + randomUUID() + ".tmp";
    await writeFile(temp, JSON.stringify({ data, version: randomUUID() }), {
      mode: 0o600,
    });
    await rename(temp, fileFor(id));
    return true;
  });
}
