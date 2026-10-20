"""Says a line in the voice of a short recording, with Chatterbox (Resemble AI).

Why (2H.40, `00` C40): "and it's a goal" is a single clip from a free pack on
Freesound, not Jérôme's voice, and he wanted the Spark's line in the same
voice. Chatterbox clones a voice from a few seconds of reference audio, on the
GPU, offline. This script produced `assets/source/sounds/spark.wav` on
2026-10-20 from the voice alone of `goal.wav` (0.8 s to 4.2 s, mono, 24 kHz).

The tool lives outside the repository, in its own virtual environment:

    C:\\Users\\monti\\AppData\\Local\\boomball-tools\\chatterbox

made with Python 3.10 (`py -3.10 -m venv chatterbox`), then
`pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124`
and `pip install chatterbox-tts`. The first run downloads the model from
Hugging Face (about 2 GB). Usage, from the workspace root, in PowerShell:

    C:\\Users\\monti\\AppData\\Local\\boomball-tools\\chatterbox\\Scripts\\python.exe -I scripts\\voice\\clone-line.py `
      --text "And the Spark is caught! Twenty points on the board!" `
      --ref assets\\source\\sounds\\spark-takes\\reference-goal-voice.wav `
      --out assets\\source\\sounds\\spark-takes

Three takes come out, at rising intensity (`exaggeration` 0.5, 0.7, 0.9 and
`cfg_weight` 0.5, 0.4, 0.3), named after the reference and the settings. A
take is checked by ear, never by the script: whisper read "cut" for "caught"
on one of the six takes of the 20th. The chosen take is then copied to
`assets/source/sounds/<name>.wav` and encoded for the client with
`ffmpeg -i <name>.wav -ar 44100 -b:a 128k client/public/sounds/<name>.mp3`.

The reference matters more than the settings: a clip of the voice alone,
trimmed to the words, three to ten seconds. `goal.wav` has the crowd under the
voice; the raw cut and a denoised one (`afftdn=nf=-30:nr=20,highpass=f=120`)
both gave usable takes, and Jérôme chose a raw one.
"""

from __future__ import annotations

import argparse
import os

SETTINGS = [(0.5, 0.5), (0.7, 0.4), (0.9, 0.3)]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--text", required=True, help="the line to say")
    parser.add_argument("--ref", required=True, action="append", help="a reference WAV of the voice; repeatable")
    parser.add_argument("--out", required=True, help="the folder the takes are written to")
    parser.add_argument("--seed", type=int, default=100, help="base seed; take i uses seed + i")
    parser.add_argument("--device", default="cuda", help="cuda or cpu")
    args = parser.parse_args()

    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    os.makedirs(args.out, exist_ok=True)
    model = ChatterboxTTS.from_pretrained(device=args.device)
    for ref in args.ref:
        tag = os.path.splitext(os.path.basename(ref))[0]
        for i, (exaggeration, cfg) in enumerate(SETTINGS, 1):
            torch.manual_seed(args.seed + i)
            wav = model.generate(args.text, audio_prompt_path=ref, exaggeration=exaggeration, cfg_weight=cfg)
            path = os.path.join(args.out, f"{tag}-take{i}-ex{exaggeration}-cfg{cfg}.wav")
            ta.save(path, wav, model.sr)
            print("wrote", path, round(wav.shape[-1] / model.sr, 2), "s", flush=True)


if __name__ == "__main__":
    main()
