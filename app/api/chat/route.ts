import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type ChatMessage = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "chat-messages.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf8");
  }
}

async function readMessages(): Promise<ChatMessage[]> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeMessages(messages: ChatMessage[]) {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(messages, null, 2), "utf8");
}

export async function GET() {
  try {
    const messages = await readMessages();

    return NextResponse.json({
      messages,
      listeners: 1,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load chat messages",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name =
      typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
    const message =
      typeof body?.message === "string"
        ? body.message.trim().slice(0, 300)
        : "";

    if (!name || !message) {
      return NextResponse.json(
        { error: "Name and message are required." },
        { status: 400 }
      );
    }

    const messages = await readMessages();

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      name,
      message,
      created_at: new Date().toISOString(),
    };

    messages.push(newMessage);
    await writeMessages(messages);

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}