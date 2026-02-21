// scanner.js
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from 'https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/+esm';
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// ---------------- Supabase Setup ----------------
const supabase = createClient(
  'https://mwsjvglbljyncdrivrtc.supabase.co',
  'sb_publishable_a_U12sK4KRvKiNFbscemOA_hK1_mRAn'
);

const sessionId = new URLSearchParams(window.location.search).get('session') || 'TEST_SESSION';

// ---------------- ZXing Setup ----------------
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX]);

let codeReader = new BrowserMultiFormatReader(hints);
let currentStream = null;
let selectedDeviceId = null;
let scanning = false;

// ---------------- Start Scanner ----------------
export async function startScanner(videoElement, statusElement) {
  if (scanning) return; // Prevent double-start
  scanning = true;
  statusElement.innerText = "Initializing scanner...";

  try {
    // Pick back camera once
    if (!selectedDeviceId) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      selectedDeviceId =
        videoDevices.find(d => d.label.toLowerCase().includes('back'))?.deviceId ||
        videoDevices[0]?.deviceId;

      if (!selectedDeviceId) throw new Error("No camera found");
    }

    // Request camera only once
    if (!currentStream) {
      currentStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedDeviceId } });
      videoElement.srcObject = currentStream;
      await videoElement.play();
    }

    statusElement.innerText = "Camera started. Scanning...";

    // Start decoding
    codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, async (result, err) => {
      if (result) {
        statusElement.innerText = "Decoded: " + result.text;

        // Send to Supabase
        const { error } = await supabase.from('scans').insert({
          session_id: sessionId,
          data: result.text
        });

        if (error) console.error("Supabase insert failed:", error);

        // Stop scanning after success
        stopScanner();
        statusElement.innerText = "Scan complete and sent!";
      } else if (err && !(err instanceof ZXing.NotFoundException)) {
        console.error("ZXing error:", err);
      }
    });

  } catch (err) {
    scanning = false;
    statusElement.innerText = "Error: " + err.message;
    console.error(err);
  }
}

// ---------------- Stop Scanner ----------------
export function stopScanner() {
  scanning = false;
  codeReader.reset();
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
}