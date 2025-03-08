import Fastify from "fastify";
import { createJsonLinesSender } from "../src/sender";

export function createServer() {
  let cancelFlag = true;

  const fastify = Fastify({ logger: true });

  fastify.get("/api/cancel-flag", async () => {
    return { cancelFlag };
  });

  fastify.post("/api/stream", (request, reply) => {
    const { stream, writer } = createJsonLinesSender();
    writer.onCancel(() => {
      cancelFlag = true;
    });

    reply.type("application/jsonl").send(stream);

    let lineNumber = 0;
    writer.write({
      timestamp: new Date().toISOString(),
      lineNumber,
      kind: "start",
    });

    const interval = setInterval(() => {
      writer.write({
        timestamp: new Date().toISOString(),
        lineNumber: ++lineNumber,
      });
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      writer.write({
        timestamp: new Date().toISOString(),
        lineNumber: ++lineNumber,
        kind: "end",
      });
      writer.close();
    }, 700);
  });

  fastify.get("/api/bulk", async (request, reply) => {
    return reply
      .type("application/jsonl")
      .send(
        JSON.stringify({ lineNumber: 0, kind: "start" }) +
          "\n" +
          JSON.stringify({ lineNumber: 1 }) +
          "\n" +
          JSON.stringify({ lineNumber: 2, kind: "end" }) +
          "\n",
      );
  });

  fastify.post("/api/broken-stream", (request, reply) => {
    const stream = new ReadableStream({
      start(controller) {
        let lineNumber = 0;
        controller.enqueue(JSON.stringify({ lineNumber, kind: "start" }) + "\n");

        setTimeout(() => {
          controller.enqueue("{broken json}\n");
          controller.close();
        }, 100);
      },
    });
    reply.type("application/jsonl").send(stream);
  });

  return fastify;
}
