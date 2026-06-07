import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackStatus = "READY" | "NEEDS CLEAN";

type TrackItem = {
  fileName: string;
  titleGuess: string;
  relativePath: string;
  sourcePath: string;
  folder: string;
  subfolder: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  smartzjStatus: TrackStatus;
  statusNote: string;
  cleanUrl: string | null;
};

type FolderNode = {
  name: string;
  path: string;
  trackCount: number;
  children: Record<string, FolderNode>;
  tracks: TrackItem[];
};

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
  ".oga",
  ".opus",
]);

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "public",
  "backups",
  "backup",
]);

function isOwnerSafeRequest(req: NextRequest): boolean {
  const host = (req.headers.get("host") || "").toLowerCase();

  return (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("admin.") ||
    host.includes("admin.thacoreonlinerad.com")
  );
}

function getCandidateRoots(): string[] {
  const roots = [
    process.env.THACORE_MUSIC_LIBRARY_DIR,
    process.env.SMARTZJ_AZURA_SOURCE_CACHE_DIR,
    path.join(process.cwd(), ".data", "azura-source-cache"),
    path.join(process.cwd(), ".data", "azura-media"),
    "/var/lib/docker/volumes/azuracast_station_data/_data/tha-core-online/media",
  ];

  return roots
    .filter((root): root is string => Boolean(root && root.trim()))
    .map((root) => path.resolve(root));
}

function firstExistingDirectory(paths: string[]): string | null {
  for (const candidate of paths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // Keep checking other safe candidates.
    }
  }

  return null;
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function titleFromFile(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCleanIndex(): Map<string, string> {
  const cleanDir = path.join(process.cwd(), "public", "audio", "smartdj", "clean");
  const cleanIndex = new Map<string, string>();

  if (!fs.existsSync(cleanDir)) {
    return cleanIndex;
  }

  const stack = [cleanDir];
  let seen = 0;
  const maxCleanFiles = 15000;

  while (stack.length && seen < maxCleanFiles) {
    const current = stack.pop();
    if (!current) break;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!AUDIO_EXTENSIONS.has(ext)) continue;

      seen += 1;
      const key = normalizeKey(entry.name);
      const relativeCleanPath = path.relative(path.join(process.cwd(), "public"), fullPath).replace(/\\/g, "/");
      cleanIndex.set(key, "/" + relativeCleanPath);
    }
  }

  return cleanIndex;
}

function findCleanMatch(fileName: string, cleanIndex: Map<string, string>): string | null {
  const sourceKey = normalizeKey(fileName);
  if (!sourceKey) return null;

  for (const [cleanKey, cleanUrl] of cleanIndex.entries()) {
    if (cleanKey.includes(sourceKey) || sourceKey.includes(cleanKey)) {
      return cleanUrl;
    }
  }

  return null;
}

function createRootNode(): FolderNode {
  return {
    name: "Music Library",
    path: "",
    trackCount: 0,
    children: {},
    tracks: [],
  };
}

function addTrackToTree(root: FolderNode, track: TrackItem): void {
  const parts = track.relativePath.split(/[\\/]/).slice(0, -1);
  let cursor = root;
  cursor.trackCount += 1;

  let currentPath = "";

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    if (!cursor.children[part]) {
      cursor.children[part] = {
        name: part,
        path: currentPath,
        trackCount: 0,
        children: {},
        tracks: [],
      };
    }

    cursor = cursor.children[part];
    cursor.trackCount += 1;
  }

  cursor.tracks.push(track);
}

function scanMusic(rootDir: string, limit: number): { tracks: TrackItem[]; tree: FolderNode; capped: boolean } {
  const cleanIndex = buildCleanIndex();
  const tracks: TrackItem[] = [];
  const tree = createRootNode();
  const stack = [rootDir];
  let capped = false;

  while (stack.length) {
    const current = stack.pop();
    if (!current) break;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!AUDIO_EXTENSIONS.has(ext)) continue;

      if (tracks.length >= limit) {
        capped = true;
        break;
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
      const pathParts = relativePath.split("/");
      const folder = pathParts[0] || "";
      const subfolder = pathParts.length > 2 ? pathParts.slice(1, -1).join("/") : "";

      const cleanUrl = findCleanMatch(entry.name, cleanIndex);
      const smartzjStatus: TrackStatus = cleanUrl ? "READY" : "NEEDS CLEAN";

      const track: TrackItem = {
        fileName: entry.name,
        titleGuess: titleFromFile(entry.name),
        relativePath,
        sourcePath: fullPath,
        folder,
        subfolder,
        extension: ext.replace(".", ""),
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        smartzjStatus,
        statusNote: cleanUrl
          ? "Clean copy matched by filename. Link check will get smarter in Phase 2."
          : "No clean copy matched yet. Keep original safe; do not broadcast raw.",
        cleanUrl,
      };

      tracks.push(track);
      addTrackToTree(tree, track);
    }

    if (tracks.length >= limit) {
      capped = true;
      break;
    }
  }

  tracks.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { tracks, tree, capped };
}

export async function GET(req: NextRequest) {
  if (!isOwnerSafeRequest(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "OWNER_MUSIC_LIBRARY_BLOCKED",
        message: "Music library is owner/admin only.",
      },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") || "2500");
  const limit = Number.isFinite(limitParam) ? Math.max(25, Math.min(limitParam, 10000)) : 2500;

  const sourceRoot = firstExistingDirectory(getCandidateRoots());

  if (!sourceRoot) {
    return NextResponse.json(
      {
        ok: false,
        error: "MUSIC_SOURCE_NOT_FOUND",
        checkedRoots: getCandidateRoots(),
      },
      { status: 404 }
    );
  }

  const result = scanMusic(sourceRoot, limit);

  return NextResponse.json({
    ok: true,
    mode: "OWNER_MUSIC_LIBRARY_READ_ONLY_V1",
    readOnly: true,
    sourceRoot,
    limit,
    capped: result.capped,
    trackCount: result.tracks.length,
    folderCount: Object.keys(result.tree.children).length,
    tracks: result.tracks,
    tree: result.tree,
    nextSafeMission: "After folder tree is correct, add owner-only controls one by one.",
  });
}
