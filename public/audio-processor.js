// AudioWorklet processor for Gemini Live Audio
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 256;
    this.sampleBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputData = input[0]; // First channel
      
      for (let i = 0; i < inputData.length; i++) {
        this.sampleBuffer[this.bufferIndex] = inputData[i];
        this.bufferIndex++;
        
        // When buffer is full, send to main thread
        if (this.bufferIndex >= this.bufferSize) {
          // Create a copy of the buffer to send
          const bufferCopy = new Float32Array(this.sampleBuffer);
          this.port.postMessage(bufferCopy);
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);