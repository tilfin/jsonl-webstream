class JsonLineScanner<T> {
  #fragment = "";

  constructor(
    private onChunk: (chunk: T) => void,
    private onError: (err: unknown) => void,
  ) {}

  append(buffer: string): void {
    this.#fragment += buffer;
    while (this.#scan());
  }

  #scan(): boolean {
    const lfPos = this.#fragment.indexOf("\n");
    if (lfPos === -1) return false;

    const json = this.#fragment.substring(0, lfPos);
    this.#fragment = this.#fragment.substring(lfPos + 1);

    try {
      const chunk = JSON.parse(json);
      this.onChunk(chunk);
      return true;
    } catch (err) {
      this.onError(err);
      return false;
    }
  }
}

/**
 * Creates a ReadableStream that parses JSON Lines from a binary stream.
 * Reads binary data from the provided reader, decodes it to text, and parses
 * each line as a JSON object of type T.
 *
 * @param reader A ReadableStreamDefaultReader providing binary data
 * @returns A ReadableStream that emits parsed JSON objects of type T
 */
export function createJsonLinesReceiver<T>(
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>>,
): ReadableStream<T> {
  return new ReadableStream({
    start(controller) {
      const decoder = new TextDecoder();
      const scanner = new JsonLineScanner<T>(
        (chunk) => {
          controller.enqueue(chunk);
        },
        (err) => {
          controller.error(err);
        },
      );

      const proceed = () => {
        return reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              scanner.append(decoder.decode());
              controller.close();
              return;
            }

            scanner.append(decoder.decode(value, { stream: true }));

            proceed();
          })
          .catch((err) => {
            controller.error(err);
          });
      };
      proceed();
    },
    cancel() {
      reader.cancel();
    },
  });
}
