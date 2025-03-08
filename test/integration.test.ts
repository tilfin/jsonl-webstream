import { FastifyInstance } from "fastify";
import { assert, afterAll, beforeAll, describe, expect, it } from "vitest";
import { createJsonLinesReceiver } from "../src/receiver";
import { createServer } from "./server";

type Item = { timestamp: string; lineNumber: number; kind: string };

describe("JSONLines stream integration tests", () => {
  const port = 28080;
  const endpoint = `http://localhost:${port}`;
  let server: FastifyInstance;

  beforeAll(async () => {
    server = createServer();
    await server.listen({ port });
  });

  afterAll(async () => {
    await server.close();
  });

  it("should receive JSONLines stream", async () => {
    const res = await fetch(`${endpoint}/api/stream`, { method: "POST" });
    expect(res.ok).toBeTruthy();
    expect(res.headers.get("transfer-encoding")).eq("chunked");

    const reader = res.body!.getReader();
    const stream = createJsonLinesReceiver<Item>(reader);

    let lineNumber = 0;
    const items: Item[] = [];
    for await (const item of stream) {
      items.push(item);
      expect(item).toHaveProperty("timestamp");
      expect(item.lineNumber).eq(lineNumber++);
    }
    expect(items.at(0)?.kind).eq("start");
    expect(items.at(-1)?.kind).eq("end");
  });

  it("should receive JSONLines as a bulk", async () => {
    const res = await fetch(`${endpoint}/api/bulk`);
    expect(res.ok).toBeTruthy();
    expect(res.headers.get("transfer-encoding")).toBeNull();

    const reader = res.body!.getReader();
    const stream = createJsonLinesReceiver<Item>(reader);

    let lineNumber = 0;
    const items: Item[] = [];
    for await (const item of stream) {
      items.push(item);
      expect(item.lineNumber).eq(lineNumber++);
    }
    expect(items).toHaveLength(3);
    expect(items[0].kind).eq("start");
    expect(items[2].kind).eq("end");
  });

  it("should catch an error when server sends broken JSONLines", async () => {
    const res = await fetch(`${endpoint}/api/broken-stream`, { method: "POST" });
    expect(res.ok).toBeTruthy();
    expect(res.headers.get("transfer-encoding")).eq("chunked");

    try {
      const reader = res.body!.getReader();
      const stream = createJsonLinesReceiver(reader);

      for await (const item of stream) {
      }
      assert.fail("Expected an error to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SyntaxError); // JSON broken
    }
  });
});
