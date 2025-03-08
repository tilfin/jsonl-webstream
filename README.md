# jsonl-webstream

Lightweight library for JSON Lines web stream between browsers and Node.js environments

## Overview

This library provides utilities for processing [JSON Lines](https://jsonlines.org/) formatted data through the Web Streams API.
It enables efficient streaming of JSON Lines data with minimal memory overhead across browsers and Node.js environments.

## Installation

```bash
npm install jsonl-webstream
```

## Usage

### Reading JSON Lines

```js
import { createJsonLinesReceiver } from 'jsonl-webstream';

// With fetch API
async function processJsonLines() {
  const response = await fetch('https://example.com/stream');
  const reader = response.body.getReader();
  const jsonlStream = createJsonLinesReceiver(reader);

  for await (const jsonData of jsonlStream) {
    // Process each JSON object
    console.log(jsonData);
  }
}
```

### Writing JSON Lines

```js
import { createJsonLinesSender } from 'jsonl-webstream';

function handleRequest(reply) {
  // Create a JSON Lines writer and its associated stream
  const { stream, writer } = createJsonLinesSender();

  writer.onCancel(() => {
    // when a client closed the response stream
  });

  // Set appropriate headers
  reply.type('application/jsonl');

  // Send the stream as the response
  reply.send(stream);

  // Write data as needed
  writer.write({ id: 1, message: "First item" });
  writer.write({ id: 2, message: "Second item" });

  // Close when done
  writer.close();
}
```

## API Reference

### Functions

#### `createJsonLinesReceiver<T>(reader: ReadableStreamDefaultReader<Uint8Array>): ReadableStream<T>`

Creates a ReadableStream that parses JSON Lines from a binary stream.

- **Parameters:**
  - `reader`: A ReadableStreamDefaultReader providing binary data
  
- **Returns:** A ReadableStream that emits parsed JSON objects of type T

#### `createJsonLinesSender(): { stream: ReadableStream<Uint8Array>, writer: JsonLinesWriter }`

Creates a paired ReadableStream and writer for JSON Lines streaming.

- **Returns:** An object containing:
  - `stream`: A binary ReadableStream that emits UTF-8 encoded JSON lines
  - `writer`: A JsonLinesWriter interface for sending JSON objects

### Interfaces

#### `JsonLinesWriter`

Interface for writing JSON Lines data to a stream.

- **Methods:**
  - `write(data: JsonValue): void` - Writes a JSON value to the stream
  - `close(): void` - Closes the stream normally
  - `onCancel(callback: () => void): void` - Registers a callback for stream cancellation
