import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Converts any audio Blob (WebM, Ogg, MP4, WAV) to a standard valid MP3 Blob
 * suitable for WhatsApp Meta Cloud API audio/mpeg delivery.
 * @param {Blob} audioBlob 
 * @returns {Promise<Blob>}
 */
export async function convertBlobToMp3(audioBlob) {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return audioBlob;
    }

    const audioContext = new AudioContextClass();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channels = 1; // mono voice note
    const sampleRate = audioBuffer.sampleRate;
    const mp3encoder = new Mp3Encoder(channels, sampleRate, 128);
    const mp3Data = [];

    // Get PCM samples from first channel (Float32Array)
    const samples = audioBuffer.getChannelData(0);
    const sampleBlockSize = 1152;
    const sampleInt16 = new Int16Array(samples.length);

    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      sampleInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Feed chunks into LAME encoder
    for (let i = 0; i < sampleInt16.length; i += sampleBlockSize) {
      const chunk = sampleInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf && endBuf.length > 0) {
      mp3Data.push(endBuf);
    }

    await audioContext.close();
    return new Blob(mp3Data, { type: 'audio/mpeg' });
  } catch (err) {
    console.warn('⚠️ MP3 conversion failed, using original audio blob:', err);
    return audioBlob;
  }
}
