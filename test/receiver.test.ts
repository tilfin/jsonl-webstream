import { describe, expect, it, vi } from "vitest";
import { createJsonLinesReceiver } from "../src/receiver";

describe("JSONLines receiver", () => {
  it("should resume LF search from the appended position", async () => {
    const encoder = new TextEncoder();
    const first = '{"n"';
    const second = ":1}\n";
    const indexOf = String.prototype.indexOf;
    const calls: { text: string; searchString: string; position?: number }[] = [];
    const spy = vi.spyOn(String.prototype, "indexOf").mockImplementation(function (
      this: string,
      searchString: string,
      position?: number,
    ) {
      calls.push({ text: String(this), searchString, position });
      return indexOf.call(this, searchString, position);
    });

    try {
      const source = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(first));
          controller.enqueue(encoder.encode(second));
          controller.close();
        },
      });
      const stream = createJsonLinesReceiver<{ n: number }>(source.getReader());

      const items: { n: number }[] = [];
      for await (const item of stream) {
        items.push(item);
      }

      expect(items).toEqual([{ n: 1 }]);
      expect(calls).toContainEqual({
        text: `${first}${second}`,
        searchString: "\n",
        position: first.length,
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("should scan remaining fragment from the beginning after parsing a line", async () => {
    const encoder = new TextEncoder();
    const first = '{"a":1}\n{"b"';
    const second = ":2}\n";
    const third = '{"c":3}\n';
    const source = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(first));
        controller.enqueue(encoder.encode(second));
        controller.enqueue(encoder.encode(third));
        controller.close();
      },
    });
    const stream = createJsonLinesReceiver<{ a?: number; b?: number; c?: number }>(source.getReader());

    const items: { a?: number; b?: number; c?: number }[] = [];
    for await (const item of stream) {
      items.push(item);
    }

    expect(items).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });
});
