import argparse
import json
import os
import sys
from faster_whisper import WhisperModel

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default=os.environ.get("LOCAL_WHISPER_MODEL", "tiny.en"))
    args = parser.parse_args()

    audio_path = os.path.abspath(args.audio)
    output_path = os.path.abspath(args.output)

    if not os.path.exists(audio_path):
        result = {
            "ok": False,
            "status": "LOCAL_AUDIO_NOT_FOUND",
            "message": f"Audio file not found: {audio_path}"
        }
        print(json.dumps(result))
        return 2

    model_root = os.path.abspath(os.path.join(os.getcwd(), ".data", "local-whisper-models"))
    os.makedirs(model_root, exist_ok=True)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        model = WhisperModel(
            args.model,
            device="cpu",
            compute_type="int8",
            download_root=model_root
        )

        segments, info = model.transcribe(
            audio_path,
            language="en",
            beam_size=5,
            vad_filter=True,
            word_timestamps=True
        )

        words = []
        transcript_parts = []

        for segment in segments:
            transcript_parts.append(segment.text or "")

            if segment.words:
                for word in segment.words:
                    words.append({
                        "start": float(word.start),
                        "end": float(word.end),
                        "word": str(word.word).strip()
                    })

        result = {
            "ok": True,
            "status": "LOCAL_TRANSCRIPTION_READY",
            "model": args.model,
            "language": getattr(info, "language", "en"),
            "language_probability": float(getattr(info, "language_probability", 0) or 0),
            "transcript": " ".join(transcript_parts).strip(),
            "wordCount": len(words),
            "words": words
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)

        print(json.dumps(result))
        return 0

    except Exception as error:
        result = {
            "ok": False,
            "status": "LOCAL_WHISPER_FAILED",
            "message": str(error)
        }
        print(json.dumps(result))
        return 1

if __name__ == "__main__":
    sys.exit(main())
