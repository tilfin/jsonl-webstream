type JsonPrimitive = string | number | boolean | null | undefined;

type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue } | { toJSON(): JsonValue };

/**
 * Interface for writing JSON Lines data to a stream.
 * Provides methods to write data, close the stream, handle errors, and manage cancellation.
 */
export interface JsonLinesWriter {
  /**
   * Writes a JSON value to the stream.
   * @param data The JSON data to write
   */
  write(data: JsonValue): void;

  /**
   * Closes the stream normally, indicating successful completion.
   */
  close(): void;

  /**
   * Registers a callback to be called when the stream is cancelled.
   * @param callback Function to execute on cancellation
   */
  onCancel(callback: () => void): void;
}

class JsonLinesWriterImpl implements JsonLinesWriter {
  onWrite?: (data: JsonValue) => void;
  onComplete?: (err?: Error) => void;
  #onCancel?: () => void;

  write(data: JsonValue): void {
    if (this.onWrite) {
      this.onWrite(data);
    }
  }

  close(err?: Error): void {
    if (this.onComplete) {
      this.onComplete(err);
    }
  }

  onCancel(callback: () => void): void {
    this.#onCancel = callback;
  }

  cancel(): void {
    if (this.#onCancel) {
      this.#onCancel();
    }
  }
}

/**
 * Creates a paired ReadableStream and writer for JSON Lines streaming.
 *
 * This function establishes a bidirectional pipeline for sending JSON data as newline-delimited JSON:
 * 1. Creates a writer interface that accepts JSON values
 * 2. Sets up a binary ReadableStream that encodes JSON objects to UTF-8 text
 * 3. Connects the writer's events to the stream's controller
 * 4. Handles proper stream termination (completion, errors, and cancellation)
 *
 * @returns An object containing:
 *   - stream: A binary ReadableStream that emits UTF-8 encoded JSON lines
 *   - writer: A JsonLinesWriter interface for sending JSON objects to the client
 *
 * @example
 * // In an HTTP handler:
 * const { stream, writer } = createJsonLinesSender();
 * response.header("Content-Type", "application/jsonl");
 * response.send(stream);
 *
 * // Send data at any time:
 * writer.write({ message: "Hello" });
 * writer.close(); // When finished
 */
export function createJsonLinesSender(): {
  stream: ReadableStream<Uint8Array<ArrayBufferLike>>;
  writer: JsonLinesWriter;
} {
  const writer = new JsonLinesWriterImpl();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    type: "bytes",
    start(controller) {
      writer.onWrite = (data) => {
        const bytes = encoder.encode(`${JSON.stringify(data)}\n`);
        controller.enqueue(bytes);
      };
      writer.onComplete = () => {
        controller.close();
      };
    },
    cancel() {
      writer.cancel();
    },
  });

  return { stream, writer };
}
