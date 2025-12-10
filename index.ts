/* Copyright 2019 Streampunk Media Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

//import bindings from 'bindings';
import {Duplex, Readable, Writable} from 'stream';

const portAudioBindings = require('./build/Release/naudiodon.node');


export const SampleFormatFloat32 = 1;
export const SampleFormat8Bit = 8;
export const SampleFormat16Bit = 16;
export const SampleFormat24Bit = 24;
export const SampleFormat32Bit = 32;

export const getDevices = portAudioBindings.getDevices;
export const getHostAPIs = portAudioBindings.getHostAPIs;

interface AudioOptions {
  deviceId?: number;
  sampleRate?: number;
  channelCount?: number;
  sampleFormat?: 1 | 8 | 16 | 24 | 32;
  maxQueue?: number;
  framesPerBuffer?: number;
  highwaterMark?: number;
  closeOnError?: boolean;
}

interface AudioIOResult {
  err?: Error;
  finished?: boolean;
  buf?: Buffer;
}

interface AudioIOAddon {
  read(size: number): Promise<AudioIOResult>;

  write(chunk: Buffer): Promise<Error | null>;

  start(): void;

  quit(mode: string): Promise<void>;
}

// Custom stream classes that extend Node.js streams with audio-specific methods
class AudioReadableStream extends Readable {
  private audioIOAddon: AudioIOAddon;

  constructor(audioIOAddon: AudioIOAddon, options: AudioOptions) {
    super({
      highWaterMark: options.highwaterMark || 16384,
      objectMode: false
    });
    this.audioIOAddon = audioIOAddon;
  }

  _read(size: number): void {
    this.doRead(size);
  }

  start(): void {
    this.audioIOAddon.start();
  }

  async quit(callback?: () => void): Promise<void> {
    await this.audioIOAddon.quit('WAIT');
    if (typeof callback === 'function') {
      callback();
    }
  }

  abort(callback?: () => void): void {
    this.audioIOAddon.quit('ABORT').then(() => {
      if (typeof callback === 'function') {
        callback();
      }
    });
  }

  private async doRead(size: number): Promise<void> {
    try {
      const result = await this.audioIOAddon.read(size);
      if (result.err) {
        this.destroy(result.err);
      } else {
        if (result.finished) {
          this.push(null);
        } else {
          this.push(result.buf);
        }
      }
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

class AudioWritableStream extends Writable {
  private audioIOAddon: AudioIOAddon;

  constructor(audioIOAddon: AudioIOAddon, options: AudioOptions) {
    super({
      highWaterMark: options.highwaterMark || 16384,
      decodeStrings: false,
      objectMode: false
    });
    this.audioIOAddon = audioIOAddon;
  }

  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.doWrite(chunk, encoding, callback);
  }

  start(): void {
    this.audioIOAddon.start();
  }

  async quit(callback?: () => void): Promise<void> {
    await this.audioIOAddon.quit('WAIT');
    if (typeof callback === 'function') {
      callback();
    }
  }

  abort(callback?: () => void): void {
    this.audioIOAddon.quit('ABORT').then(() => {
      if (typeof callback === 'function') {
        callback();
      }
    });
  }

  private async doWrite(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): Promise<void> {
    try {
      const error = await this.audioIOAddon.write(chunk);
      callback(error);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

class AudioDuplexStream extends Duplex {
  private audioIOAddon: AudioIOAddon;

  constructor(audioIOAddon: AudioIOAddon, inOptions: AudioOptions, outOptions: AudioOptions) {
    super({
      allowHalfOpen: false,
      readableObjectMode: false,
      writableObjectMode: false,
      readableHighWaterMark: inOptions.highwaterMark || 16384,
      writableHighWaterMark: outOptions.highwaterMark || 16384
    });
    this.audioIOAddon = audioIOAddon;
  }

  _read(size: number): void {
    this.doRead(size);
  }

  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.doWrite(chunk, encoding, callback);
  }

  start(): void {
    this.audioIOAddon.start();
  }

  async quit(callback?: () => void): Promise<void> {
    await this.audioIOAddon.quit('WAIT');
    if (typeof callback === 'function') {
      callback();
    }
  }

  abort(callback?: () => void): void {
    this.audioIOAddon.quit('ABORT').then(() => {
      if (typeof callback === 'function') {
        callback();
      }
    });
  }

  private async doRead(size: number): Promise<void> {
    try {
      const result = await this.audioIOAddon.read(size);
      if (result.err) {
        this.destroy(result.err);
      } else {
        if (result.finished) {
          this.push(null);
        } else {
          this.push(result.buf);
        }
      }
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async doWrite(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): Promise<void> {
    try {
      const error = await this.audioIOAddon.write(chunk);
      callback(error);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Type definitions for the return types
export type IoStreamRead = AudioReadableStream;
export type IoStreamWrite = AudioWritableStream;
export type IoStreamDuplex = AudioDuplexStream;

function AudioIO(options: { inOptions: AudioOptions }): IoStreamRead;
function AudioIO(options: { outOptions: AudioOptions }): IoStreamWrite;
function AudioIO(options: { inOptions: AudioOptions, outOptions: AudioOptions }): IoStreamDuplex;
function AudioIO(options: {
  inOptions?: AudioOptions,
  outOptions?: AudioOptions
}): IoStreamRead | IoStreamWrite | IoStreamDuplex {
  const audioIOAddon: AudioIOAddon = portAudioBindings.create(options);

  const readable = 'inOptions' in options && options.inOptions !== undefined;
  const writable = 'outOptions' in options && options.outOptions !== undefined;

  if (readable && writable) {
    const stream = new AudioDuplexStream(audioIOAddon, options.inOptions!, options.outOptions!);

    stream.on('close', async (): Promise<void> => {
      stream.emit('closed');
    });

    stream.on('finish', async (): Promise<void> => {
      await stream.quit();
      stream.emit('finished');
    });

    stream.on('error', (err: Error) => console.error('AudioIO:', err));

    return stream;
  } else if (readable) {
    const stream = new AudioReadableStream(audioIOAddon, options.inOptions!);

    stream.on('close', async (): Promise<void> => {
      stream.emit('closed');
    });

    stream.on('error', (err: Error) => console.error('AudioIO:', err));

    return stream;
  } else if (writable) {
    const stream = new AudioWritableStream(audioIOAddon, options.outOptions!);

    stream.on('close', async (): Promise<void> => {
      stream.emit('closed');
    });

    stream.on('finish', async (): Promise<void> => {
      await stream.quit();
      stream.emit('finished');
    });

    stream.on('error', (err: Error) => console.error('AudioIO:', err));

    return stream;
  } else {
    throw new Error('AudioIO requires either inOptions, outOptions, or both');
  }
}

export {AudioIO};
export default AudioIO;