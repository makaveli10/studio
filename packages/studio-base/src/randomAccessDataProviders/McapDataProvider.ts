// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  detectVersion,
  DETECT_VERSION_BYTES_REQUIRED,
  Mcap0IndexedReader,
  Mcap0Types,
} from "@foxglove/mcap";
import { loadDecompressHandlers } from "@foxglove/mcap-support";
import { Time } from "@foxglove/rostime";
import {
  RandomAccessDataProvider,
  ExtensionPoint,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
} from "@foxglove/studio-base/randomAccessDataProviders/types";
import BrowserHttpReader from "@foxglove/studio-base/util/BrowserHttpReader";
import CachedFilelike from "@foxglove/studio-base/util/CachedFilelike";

import Mcap0IndexedDataProvider from "./Mcap0IndexedDataProvider";
import Mcap0StreamedDataProvider from "./Mcap0StreamedDataProvider";
import McapPre0DataProvider from "./McapPre0DataProvider";

type Options = { source: { type: "file"; file: File } | { type: "remote"; url: string } };

class FileReadable {
  constructor(private file: File) {}
  async size(): Promise<bigint> {
    return BigInt(this.file.size);
  }
  async read(offset: bigint, size: bigint): Promise<Uint8Array> {
    if (offset + size > this.file.size) {
      throw new Error(
        `Read of ${size} bytes at offset ${offset} exceeds file size ${this.file.size}`,
      );
    }
    return new Uint8Array(
      await this.file.slice(Number(offset), Number(offset + size)).arrayBuffer(),
    );
  }
}

async function tryCreateIndexedReader(readable: Mcap0Types.IReadable) {
  const decompressHandlers = await loadDecompressHandlers();
  const reader = await Mcap0IndexedReader.Initialize({ readable, decompressHandlers });

  let hasMissingSchemas = false;
  for (const channel of reader.channelsById.values()) {
    if (channel.schemaId !== 0 && !reader.schemasById.has(channel.schemaId)) {
      hasMissingSchemas = true;
      break;
    }
  }
  if (reader.chunkIndexes.length === 0 || reader.channelsById.size === 0 || hasMissingSchemas) {
    throw new Error("Summary does not contain chunk indexes, schemas, and channels");
  }
  return reader;
}

/**
 * Detect the version of an mcap file and delegate to the corresponding provider version.
 */
export default class McapDataProvider implements RandomAccessDataProvider {
  private options: Options;
  private provider?: RandomAccessDataProvider;
  constructor(options: Options) {
    this.options = options;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    const { source } = this.options;
    let makeReadable: () => Promise<Mcap0Types.IReadable>;
    let makeStream: () => Promise<{ size: number; stream: ReadableStream<Uint8Array> }>;
    let prefix: ArrayBuffer;
    switch (source.type) {
      case "file":
        prefix = await source.file.slice(0, DETECT_VERSION_BYTES_REQUIRED).arrayBuffer();
        makeReadable = async () => new FileReadable(source.file);
        makeStream = async () => ({ size: source.file.size, stream: source.file.stream() });
        break;

      case "remote": {
        prefix = await (
          await fetch(source.url, {
            headers: { range: `bytes=${0}-${DETECT_VERSION_BYTES_REQUIRED - 1}` },
          })
        ).arrayBuffer();
        makeStream = async () => {
          const response = await fetch(source.url);
          if (!response.body) {
            throw new Error(`Unable to stream remote file. <${source.url}>`);
          }
          const size = response.headers.get("content-length");
          if (size == undefined) {
            throw new Error(`Remote file is missing Content-Length header. <${source.url}>`);
          }

          return { size: parseInt(size), stream: response.body };
        };
        makeReadable = async () => {
          const fileReader = new BrowserHttpReader(source.url);
          const remoteReader = new CachedFilelike({
            fileReader,
            cacheSizeInBytes: 1024 * 1024 * 200, // 200MiB
            // eslint-disable-next-line @foxglove/no-boolean-parameters
            keepReconnectingCallback: (reconnecting: boolean) => {
              extensionPoint.reportMetadataCallback({
                type: "updateReconnecting",
                reconnecting,
              });
            },
          });
          await remoteReader.open(); // Important that we call this first, because it might throw an error if the file can't be read.
          return {
            async size(): Promise<bigint> {
              return BigInt(remoteReader.size());
            },
            async read(offset: bigint, size: bigint): Promise<Uint8Array> {
              if (offset + size > Number.MAX_SAFE_INTEGER) {
                throw new Error(`Read too large: offset ${offset}, size ${size}`);
              }
              return await remoteReader.read(Number(offset), Number(size));
            },
          };
        };
      }
    }

    switch (detectVersion(new DataView(prefix))) {
      case undefined:
        throw new Error(
          `File is not valid MCAP. Prefix bytes: <${Array.from(new Uint8Array(prefix), (byte) =>
            byte.toString().padStart(2, "0"),
          ).join(" ")}>`,
        );
      case "pre0":
        this.provider = new McapPre0DataProvider(await makeStream());
        return await this.provider.initialize(extensionPoint);
      case "0": {
        let reader: Mcap0IndexedReader;
        try {
          reader = await tryCreateIndexedReader(await makeReadable());
        } catch (error) {
          // Fall back to unindexed (streamed) reading
          this.provider = new Mcap0StreamedDataProvider(await makeStream());
          const result = await this.provider.initialize(extensionPoint);
          return {
            ...result,
            problems: [
              ...result.problems,
              {
                message: "MCAP file is unindexed, falling back to streamed reading",
                severity: "warn",
                error,
              },
            ],
          };
        }
        this.provider = new Mcap0IndexedDataProvider(reader);
        return await this.provider.initialize(extensionPoint);
      }
    }
  }

  async getMessages(
    start: Time,
    end: Time,
    subscriptions: GetMessagesTopics,
  ): Promise<GetMessagesResult> {
    if (!this.provider) {
      throw new Error("Data provider has not been initialized");
    }
    return await this.provider.getMessages(start, end, subscriptions);
  }

  async close(): Promise<void> {
    if (!this.provider) {
      throw new Error("Data provider has not been initialized");
    }
    await this.provider.close();
  }
}
