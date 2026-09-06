import { describe, expect, it, vi } from "vitest";
import { createJsonLinesSender } from "../src/sender";

describe("createJsonLinesSender", () => {
  it("writes JSON Lines and closes normally", async () => {
    const { stream, writer } = createJsonLinesSender();
    const reader = stream.getReader();

    writer.write({ id: 1 });
    writer.close();

    const chunk = await reader.read();
    expect(new TextDecoder().decode(chunk.value)).toBe('{"id":1}\n');
    expect(await reader.read()).toEqual({ done: true, value: undefined });
  });

  it("ignores repeated close calls", () => {
    const { writer } = createJsonLinesSender();

    writer.close();

    expect(() => writer.close()).not.toThrow();
  });

  it("aborts the stream with the provided reason", async () => {
    const { stream, writer } = createJsonLinesSender();
    const reader = stream.getReader();
    const reason = new Error("upstream failed");

    writer.abort(reason);

    await expect(reader.read()).rejects.toBe(reason);
  });

  it("ignores writes, close, and repeated abort calls after aborting", () => {
    const { writer } = createJsonLinesSender();

    writer.abort(new Error("upstream failed"));

    expect(() => writer.write({ ignored: true })).not.toThrow();
    expect(() => writer.close()).not.toThrow();
    expect(() => writer.abort(new Error("ignored"))).not.toThrow();
  });

  it("ignores writes and close calls after cancellation", async () => {
    const { stream, writer } = createJsonLinesSender();
    const onCancel = vi.fn(() => {
      writer.write({ ignored: true });
      writer.close();
      writer.abort(new Error("ignored"));
    });
    writer.onCancel(onCancel);

    const reader = stream.getReader();
    await expect(reader.cancel()).resolves.toBeUndefined();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(() => writer.write({ ignored: true })).not.toThrow();
    expect(() => writer.close()).not.toThrow();
    expect(() => writer.abort(new Error("ignored"))).not.toThrow();
  });

  it("ignores writes after normal completion", () => {
    const { writer } = createJsonLinesSender();
    writer.close();

    expect(() => writer.write({ ignored: true })).not.toThrow();
  });
});
