import { GoogleGenAI, Type } from "@google/genai";
import type { TranscriptionResult } from '../types/transcription';

// Using the same API key as the live audio system
const GEMINI_API_KEY = 'AIzaSyAUHP34aS7UPglJDl64pub4kR7m59IZcTw';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the data url prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

const systemInstruction = `You are a voice assistant that transcribes English audio and identifies user commands. 

TRANSCRIPTION RULES:
- Transcribe exactly what you hear in English
- If you hear non-English, translate it to English 
- Only transcribe clear, intelligible speech with actual words
- Do not transcribe background noise, music, unclear sounds, or ambient sounds
- Do not transcribe random phrases like "I feel cold", "I feel hot" unless they are clearly and explicitly spoken by a user
- If the audio is completely unclear, just noise, or contains no clear speech, respond with an empty transcription
- Ignore mouth sounds, breathing, or non-verbal audio

TASK IDENTIFICATION:
Look for these command types in the transcription:

1. OPEN_APP: Opening applications/websites
   - Keywords: "open", "launch", "start", "show me"
   - Examples: "open YouTube", "launch Netflix", "start Spotify"
   - JSON: {"type": "open_app", "payload": {"name": "YouTube"}}

2. TIMER: Setting timers or alarms
   - Keywords: "set timer", "timer for", "remind me", "alarm"
   - Examples: "set timer for 5 minutes", "timer for 30 seconds"
   - JSON: {"type": "timer", "payload": {"duration": "5 minutes"}}

3. ENVIRONMENT_CONTROL: Room/device control (ONLY for explicit commands)
   - Keywords: "turn on/off", "set temperature", "dim lights", "adjust"
   - Examples: "turn on the lights", "set temperature to 72"
   - JSON: {"type": "environment_control", "payload": {"device": "lights", "action": "turn on"}}

4. SERVICE_REQUEST: Information or service requests
   - Keywords: "what's", "show me", "find", "search for"
   - Examples: "what's the weather", "show me the menu", "search for action movies"
   - JSON: {"type": "service_request", "payload": {"request": "weather", "query": "current weather"}}

5. NONE: No clear command detected
   - For general conversation, unclear audio, non-commands, or ambient sounds
   - JSON: {"type": "none"}

OUTPUT FORMAT (JSON only):
{
  "transcription": "exact words heard",
  "task": {
    "type": "open_app",
    "payload": {
      "name": "YouTube"
    }
  }
}

Be very strict: only identify clear, intentional commands. Casual conversation, ambient sounds, or unclear audio should be "none".

Your entire response must be ONLY the JSON object and nothing else.`;

export const transcribeAndIdentifyTask = async (audioBlob: Blob): Promise<TranscriptionResult> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
            parts: [{
                inlineData: {
                    mimeType: "audio/webm",
                    data: base64Audio,
                }
            }]
        }],
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    transcription: {
                        type: Type.STRING,
                        description: "The English transcription of the audio."
                    },
                    task: {
                        type: Type.OBJECT,
                        description: "The identified command object.",
                        properties: {
                            type: {
                                type: Type.STRING,
                                description: "The category of the command (e.g., 'none', 'open_app', 'timer')."
                            },
                            payload: {
                                type: Type.OBJECT,
                                description: "An object containing command-specific details.",
                                properties: {
                                    name: { type: Type.STRING, description: "Name of the app to open." },
                                    duration: { type: Type.STRING, description: "Duration for a timer." },
                                    device: { type: Type.STRING, description: "Device for environment control." },
                                    action: { type: Type.STRING, description: "Action for environment control." },
                                    value: { type: Type.STRING, description: "Value for an action (e.g., scene name)." },
                                    request: { type: Type.STRING, description: "The specific service request." },
                                    search_query: { type: Type.STRING, description: "Search query for content within apps." },
                                    query: { type: Type.STRING, description: "Alternative search query field." }
                                }
                            }
                        },
                        required: ["type"]
                    }
                },
                required: ["transcription", "task"]
            },
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as TranscriptionResult;
    
    if(!result || typeof result.transcription !== 'string' || typeof result.task?.type !== 'string') {
        throw new Error('Invalid JSON response format from API.');
    }
    
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while communicating with the Gemini API.");
  }
};