// scanner.js
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, NotFoundException } from 'https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/+esm';
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// ---------------- Supabase Setup ----------------
const supabase = createClient(
	'https://mwsjvglbljyncdrivrtc.supabase.co',
	'sb_publishable_a_U12sK4KRvKiNFbscemOA_hK1_mRAn'
);

let sessionId = new URLSearchParams(window.location.search).get('session') || 'TEST_SESSION';

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
		if (!selectedDeviceId) {
			selectedDeviceId = await getCameraDeviceId();
		}

		if (!currentStream) {
			currentStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedDeviceId } });
			videoElement.srcObject = currentStream;
			await videoElement.play();
		}

		statusElement.innerText = "Camera started. Scanning...";

		codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, err) => {
			handleResult(result, err, statusElement, videoElement);
		});

	} catch (err) {
		scanning = false;
		statusElement.innerText = "Error: " + err.message;
		console.error(err);
	}
}

// ---------------- Stop Scanner ----------------
export function stopScanner(videoElement) {
	scanning = false;
	codeReader.reset();

	if (currentStream) {
		// Stop all tracks
		currentStream.getTracks().forEach(track => track.stop());
		currentStream = null;
	}

	if (videoElement) {
		// Detach the stream from the video element
		videoElement.srcObject = null;
		videoElement.pause();
		videoElement.load(); // reset the element completely
	}
}

// ---------------- Handle Decoded Result ----------------
async function handleResult(result, err, statusElement, videoElement) {
	if (result) {
		statusElement.innerText = "Decoded: " + result.text;

		// Send to Supabase
		const { error } = await supabase.from('scans').insert({
			session_id: sessionId,
			data: result.text
		});

		if (error) console.error("Supabase insert failed:", error);

		// Stop scanner after first successful scan
		stopScanner(videoElement);
		statusElement.innerText = "Scan complete and sent!";
	} else if (err && !(err instanceof NotFoundException)) {
		console.error("ZXing error:", err);
	}
}

// ---------------- Get Camera Device ID ----------------
async function getCameraDeviceId() {
	// Request camera once to get permission & labels
	const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
	tempStream.getTracks().forEach(track => track.stop());

	// Enumerate devices now that permission is granted
	const devices = await navigator.mediaDevices.enumerateDevices();
	const videoDevices = devices.filter(d => d.kind === 'videoinput');

	if (videoDevices.length === 0) throw new Error("No camera found");

	// Pick back camera if possible
	const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
	return backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
}