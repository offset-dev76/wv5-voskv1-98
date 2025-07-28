import queue
import sounddevice as sd
import vosk
import json
import os
import asyncio
import websockets

model_path = "vosk-model/vosk-model-small-en-us-0.15"

# Check model
if not os.path.exists(model_path):
    raise FileNotFoundError("Model path not found!")

# Setup
q = queue.Queue()
samplerate = 16000
WAKE_WORDS = ["hey atlas", "atlas"]
model = vosk.Model(model_path)
recognizer = vosk.KaldiRecognizer(model, samplerate, json.dumps(WAKE_WORDS))

# WebSocket clients
clients = set()

# Mic callback
def callback(indata, frames, time, status):
    if status:
        print(status, flush=True)
    q.put(bytes(indata))

async def notify_clients():
    if clients:
        print("Notifying clients: Wake word detected!")
        await asyncio.wait([client.send(json.dumps({"wakeword": True})) for client in clients])

async def listen_for_wakeword():
    print("🎙️ Listening for 'Hey Atlas' (WebSocket mode)...")
    loop = asyncio.get_event_loop()
    triggered = False
    with sd.RawInputStream(samplerate=samplerate, blocksize=8000, dtype='int16',
                           channels=1, callback=callback):
        while True:
            data = await loop.run_in_executor(None, q.get)
            if recognizer.AcceptWaveform(data):
                result = json.loads(recognizer.Result())
                text = result.get("text", "")
                print("🗣️ Heard:", text)
                # Only trigger if recognized text is exactly a wake word and not already triggered
                if not triggered and text.lower() in WAKE_WORDS:
                    print("✅ Wake word detected! 🔊")
                    triggered = True
                    await notify_clients()
                    # Wait for overlay to close (client disconnect) before resetting trigger
                # Reset trigger if no clients are connected (overlay closed)
                if triggered and not clients:
                    print("Resetting wake word trigger (no clients connected)")
                    triggered = False

async def ws_handler(websocket):
    print(f"Client connected: {websocket.remote_address}")
    clients.add(websocket)
    try:
        async for _ in websocket:
            pass  # We don't expect messages from client
    finally:
        clients.remove(websocket)
        print(f"Client disconnected: {websocket.remote_address}")


async def main():
    ws_server = await websockets.serve(ws_handler, "0.0.0.0", 8765)
    print("WebSocket server started on ws://0.0.0.0:8765")
    await listen_for_wakeword()
    await ws_server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
