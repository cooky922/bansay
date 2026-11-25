/* global AudioWorkletProcessor, registerProcessor, sampleRate */
class BansayPcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.outputRate = options.processorOptions.outputRate;
    this.samples = new Int16Array(this.outputRate / 50);
    this.offset = 0;
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
  }

  process(inputs) {
    const mono = inputs[0]?.[0];
    if (!mono) return true;
    for (const value of mono) {
      this.phase += this.outputRate;
      this.sum += value;
      this.count += 1;
      while (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        const sample = Math.max(-1, Math.min(1, this.sum / this.count));
        this.samples[this.offset++] = sample < 0 ? sample * 32768 : sample * 32767;
        if (this.offset === this.samples.length) {
          const pcm = this.samples.buffer;
          this.port.postMessage(pcm, [pcm]);
          this.samples = new Int16Array(this.outputRate / 50);
          this.offset = 0;
        }
      }
      if (this.phase < this.outputRate) {
        this.sum = 0;
        this.count = 0;
      }
    }
    return true;
  }
}

registerProcessor("bansay-pcm-capture", BansayPcmCapture);
