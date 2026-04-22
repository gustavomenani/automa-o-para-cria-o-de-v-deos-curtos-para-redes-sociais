import argparse
import json
import sys


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper.")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--language", default="pt")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": f"Dependencia do faster-whisper ausente: {error}. Rode: pip install -r requirements-whisper.txt",
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 2

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(
        args.audio,
        language=args.language,
        vad_filter=True,
        beam_size=5,
        word_timestamps=True,
    )

    output_segments = []

    for segment in segments:
        words = []
        for word in segment.words or []:
            if word.word.strip():
                words.append(
                    {
                        "word": word.word.strip(),
                        "start": round(float(word.start), 3),
                        "end": round(float(word.end), 3),
                        "confidence": getattr(word, "probability", None),
                    }
                )

        if segment.text.strip():
            output_segments.append(
                {
                    "start": round(float(segment.start), 3),
                    "end": round(float(segment.end), 3),
                    "text": segment.text.strip(),
                    "words": words,
                }
            )

    payload = {
        "ok": True,
        "language": info.language,
        "language_probability": info.language_probability,
        "segments": output_segments,
    }

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
