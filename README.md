# @tokenring-ai/naudiodon3

A [Node.js](http://nodejs.org/) native addon that provides a wrapper around the [PortAudio](http://portaudio.com/) library, enabling applications to record and play audio with cross-platform support. This library creates Node.js streams that can be piped to or from other streams, such as files and network connections, with full back-pressure support.

## Features

- **Cross-platform audio I/O**: Works on macOS, Windows, and Linux (including ARM architectures like Raspberry Pi)
- **Stream-based API**: Integrates seamlessly with Node.js stream ecosystem
- **Multiple stream types**: 
  - Readable streams for audio input (recording)
  - Writable streams for audio output (playback)
  - Duplex streams for bidirectional audio processing
- **Flexible audio configuration**: Support for various sample rates, channel counts, and sample formats
- **Device enumeration**: List available audio devices and host APIs
- **Error handling**: Configurable error handling with graceful degradation options
- **N-API based**: Uses modern N-API for better Node.js version compatibility

## Installation

Install [Node.js](http://nodejs.org/) for your platform and ensure that node can build native modules with [node-gyp](https://github.com/nodejs/node-gyp). This package includes a copy of the PortAudio library, so no external dependencies are required.

```bash
npm install @tokenring-ai/naudiodon3
```

### Platform-specific notes

- **macOS**: Tested on macOS 10.11 and later
- **Windows**: Tested on Windows 10
- **Linux**: Tested on Ubuntu Trusty and Raspbian Jessie (armhf architecture)
- **Raspberry Pi**: Note that this library is not intended for use with the internal sound card. Please use an external USB sound card or GPIO breakout board.

## Usage

### Importing

```javascript
const { AudioIO, SampleFormatFloat32, SampleFormat16Bit, getDevices, getHostAPIs } = require('@tokenring-ai/naudiodon3');
```

### Listing Audio Devices

Get a list of available audio devices:

```javascript
const devices = getDevices();
console.log(devices);
```

Example output:
```javascript
[
  {
    id: 0,
    name: 'Built-in Microph',
    maxInputChannels: 2,
    maxOutputChannels: 0,
    defaultSampleRate: 44100,
    defaultLowInputLatency: 0.00199546485260771,
    defaultLowOutputLatency: 0.01,
    defaultHighInputLatency: 0.012154195011337868,
    defaultHighOutputLatency: 0.1,
    hostAPIName: 'Core Audio'
  },
  {
    id: 2,
    name: 'Built-in Output',
    maxInputChannels: 0,
    maxOutputChannels: 2,
    defaultSampleRate: 44100,
    defaultLowInputLatency: 0.01,
    defaultLowOutputLatency: 0.002108843537414966,
    defaultHighInputLatency: 0.1,
    defaultHighOutputLatency: 0.012267573696145125,
    hostAPIName: 'Core Audio'
  }
]
```

### Listing Host APIs

Get information about available audio host APIs:

```javascript
const hostAPIs = getHostAPIs();
console.log(hostAPIs);
```

Example output:
```javascript
{
  defaultHostAPI: 0,
  HostAPIs: [
    {
      id: 0,
      name: 'CoreAudio',
      type: 'CoreAudio',
      deviceCount: 3,
      defaultInput: 1,
      defaultOutput: 2
    }
  ]
}
```

### Playing Audio

Create a writable stream for audio output:

```javascript
const fs = require('fs');

// Create an AudioIO instance for output
const audioOutput = new AudioIO({
  outOptions: {
    channelCount: 2,
    sampleFormat: SampleFormat16Bit,
    sampleRate: 48000,
    deviceId: -1, // -1 for default device, or use device ID from getDevices()
    closeOnError: true // Close stream on audio errors
  }
});

// Create a read stream from an audio file
const audioFile = fs.createReadStream('audio.wav');

// Pipe the file to the audio output
audioFile.pipe(audioOutput);

// Start the audio playback
audioOutput.start();

// Handle cleanup
process.on('SIGINT', () => {
  audioOutput.quit(() => {
    console.log('Audio playback stopped');
    process.exit(0);
  });
});
```

### Recording Audio

Create a readable stream for audio input:

```javascript
const fs = require('fs');

// Create an AudioIO instance for input
const audioInput = new AudioIO({
  inOptions: {
    channelCount: 2,
    sampleFormat: SampleFormat16Bit,
    sampleRate: 44100,
    deviceId: -1, // -1 for default device, or use device ID from getDevices()
    closeOnError: true // Close stream on audio errors
  }
});

// Create a write stream to save the audio
const outputFile = fs.createWriteStream('recording.raw');

// Pipe the audio input to the output file
audioInput.pipe(outputFile);

// Start recording
audioInput.start();

// Handle cleanup
process.on('SIGINT', () => {
  audioInput.quit(() => {
    console.log('Audio recording stopped');
    process.exit(0);
  });
});
```

### Accessing Timestamps

For input streams, each buffer includes a timestamp property:

```javascript
audioInput.on('data', (buffer) => {
  console.log('Buffer timestamp:', buffer.timestamp);
  // The timestamp represents the time of the first sample in the buffer
});
```

### Bidirectional Audio Processing

Create a duplex stream for simultaneous input and output:

```javascript
// Create a bidirectional audio stream
const audioDuplex = new AudioIO({
  inOptions: {
    channelCount: 2,
    sampleFormat: SampleFormat16Bit,
    sampleRate: 44100,
    deviceId: 1 // Input device
  },
  outOptions: {
    channelCount: 2,
    sampleFormat: SampleFormat16Bit,
    sampleRate: 44100,
    deviceId: 2 // Output device
  }
});

// Start the duplex stream
audioDuplex.start();

// Example: Pass-through audio from input to output
audioDuplex.pipe(audioDuplex);

// Handle cleanup
process.on('SIGINT', () => {
  audioDuplex.quit(() => {
    console.log('Audio processing stopped');
    process.exit(0);
  });
});
```

## API Reference

### Sample Formats

- `SampleFormatFloat32` (1): 32-bit floating point samples
- `SampleFormat8Bit` (8): 8-bit integer samples
- `SampleFormat16Bit` (16): 16-bit integer samples
- `SampleFormat24Bit` (24): 24-bit integer samples
- `SampleFormat32Bit` (32): 32-bit integer samples

### AudioOptions Interface

```typescript
interface AudioOptions {
  deviceId?: number;           // Audio device ID (-1 for default)
  sampleRate?: number;         // Sample rate in Hz (default: 44100)
  channelCount?: number;       // Number of channels (default: 2)
  sampleFormat?: 1 | 8 | 16 | 24 | 32; // Sample format (default: 16)
  maxQueue?: number;           // Maximum queue size (default: 2)
  framesPerBuffer?: number;    // Frames per buffer (0 for auto)
  highwaterMark?: number;      // Stream highWaterMark (default: 16384)
  closeOnError?: boolean;      // Close stream on errors (default: true)
}
```

### Stream Methods

All stream types inherit from Node.js streams and provide these additional methods:

- `start()`: Start the audio stream
- `quit(callback)`: Gracefully stop the stream (callback optional)
- `abort(callback)`: Immediately stop the stream (callback optional)

### Stream Types

- **Readable Stream**: Returned when only `inOptions` is provided
- **Writable Stream**: Returned when only `outOptions` is provided  
- **Duplex Stream**: Returned when both `inOptions` and `outOptions` are provided

## Examples

### Basic Audio Playback

```javascript
const { AudioIO, SampleFormat16Bit } = require('@tokenring-ai/naudiodon3');
const { Readable } = require('stream');

// Create a simple sine wave generator
function createSineWave(sampleRate, duration) {
  const samples = [];
  const frequency = 440; // A4 note
  const amplitude = 0.5;
  
  for (let i = 0; i < sampleRate * duration; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
    // Convert to 16-bit integer
    samples.push(Math.round(sample * 32767));
  }
  
  return Buffer.from(samples);
}

// Create audio stream
const audioStream = new AudioIO({
  outOptions: {
    channelCount: 1,
    sampleFormat: SampleFormat16Bit,
    sampleRate: 44100,
    deviceId: -1
  }
});

// Generate 5 seconds of sine wave
const sineBuffer = createSineWave(44100, 5);

// Create a readable stream from the buffer
const sineStream = Readable.from([sineBuffer]);

// Pipe and start
sineStream.pipe(audioStream);
audioStream.start();

// Stop after playback
setTimeout(() => {
  audioStream.quit();
}, 6000);
```

### Audio Device Monitoring

```javascript
const { getDevices } = require('@tokenring-ai/naudiodon3');

function printDevices() {
  const devices = getDevices();
  console.log('\nAvailable Audio Devices:');
  console.log('='.repeat(50));
  
  devices.forEach((device, index) => {
    console.log(`${index + 1}. ${device.name}`);
    console.log(`   ID: ${device.id}`);
    console.log(`   Input Channels: ${device.maxInputChannels}`);
    console.log(`   Output Channels: ${device.maxOutputChannels}`);
    console.log(`   Sample Rate: ${device.defaultSampleRate} Hz`);
    console.log(`   Host API: ${device.hostAPIName}`);
    console.log();
  });
}

printDevices();
```

## Troubleshooting

### Linux - No Default Device Found

Ensure that when compiling PortAudio, the configure script indicates "ALSA" is enabled.

### macOS - Carbon Component Manager Warning

You may see a deprecation warning about Carbon Component Manager during initialization. This is expected and does not affect functionality. The included PortAudio library uses up-to-date Apple APIs.

### Build Issues

If you encounter build issues, ensure you have the necessary build tools:

- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools
- **Linux**: `build-essential` package

### Raspberry Pi Optimization

For Raspberry Pi users, the library automatically adjusts buffer sizes for optimal performance. Consider using external USB audio devices for better results.

## License

This software is released under the Apache 2.0 license. Copyright 2019 Streampunk Media Ltd.

This software uses libraries from the PortAudio project, which is released under an MIT license.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Support

For support, please check the [GitHub issues](https://github.com/csukuangfj/naudiodon2/issues) or contact the maintainers.