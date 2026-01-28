import sys
import json
import os
import shutil
import warnings

# Force UTF-8 encoding for stdout/stderr to handle Emoji/Non-ASCII chars in Windows console
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

try:
    import whisper
except ImportError:
    whisper = None

# Suppress FP16 warning
warnings.filterwarnings("ignore", message="FP16 is not supported on CPU; using FP32 instead")

def detect_highlights(video_path, ffmpeg_path=None):
    # Add FFmpeg to PATH if provided
    if ffmpeg_path:
        ffmpeg_dir = os.path.dirname(ffmpeg_path)
        os.environ["PATH"] += os.pathsep + ffmpeg_dir

    if not shutil.which("ffmpeg") and not (ffmpeg_path and os.path.exists(ffmpeg_path)):
         return {"error": "FFmpeg not found. Please install FFmpeg and add it to your System PATH."}

    if not whisper:
        return {"error": "Whisper module not found. Please install openai-whisper."}

    if not os.path.exists(video_path):
        return {"error": f"Video file not found at: {video_path}"}

    # Load model
    print("Loading Whisper model...", flush=True)
    model = whisper.load_model("base")
    
    # Transcribe
    print("Starting transcription (this may take a while)...", flush=True)
    # verbose=True prints segments as they are transcribed
    result = model.transcribe(video_path, verbose=True)
    
    # Improved Segmentation Logic
    raw_segments = result['segments']
    clips = []
    
    current_clip = {
        "start": 0,
        "end": 0,
        "text": "",
        "segments": []
    }
    
    # Config
    MIN_DURATION = 15.0  # Minimum 15 seconds
    MAX_DURATION = 120.0 # Maximum 2 minutes
    PAUSE_THRESHOLD = 1.5 # Break if silence > 1.5s
    
    for i, seg in enumerate(raw_segments):
        start = seg['start']
        end = seg['end']
        text = seg['text'].strip()
        
        # Initialize if empty
        if not current_clip["segments"]:
            current_clip["start"] = start
            current_clip["end"] = end
            current_clip["text"] = text
            current_clip["segments"].append(seg)
            continue
            
        # Check gap
        gap = start - current_clip["end"]
        current_duration = current_clip["end"] - current_clip["start"]
        new_duration = end - current_clip["start"]
        
        # Deciding whether to merge
        should_split = False
        
        # 1. Hard limit
        if new_duration > MAX_DURATION:
            should_split = True
            
        # 2. Natural pause if we have enough content
        elif gap > PAUSE_THRESHOLD and current_duration > MIN_DURATION:
            should_split = True
            
        if should_split:
            # Calculate score based on average log probability of segments
            # avg_logprob is log(p), so exp(avg_logprob) is probability (0-1)
            # We'll take the average of all segments in this clip
            avg_score = 0
            if current_clip["segments"]:
                total_prob = sum([float(s.get('avg_logprob', -1)) for s in current_clip["segments"]])
                avg_score = total_prob / len(current_clip["segments"])
                # Normalize logprob to 0-1 range approx (it's usually -1 to 0) or just use exp
                # Using simple exp for now as a "confidence" metric
                import math
                avg_score = math.exp(avg_score)

            # Save current
            clips.append({
                "start": current_clip["start"],
                "end": current_clip["end"],
                "text": current_clip["text"],
                "score": round(avg_score * 100) # 0-100 scale
            })
            
            # Start new
            current_clip = {
                "start": start,
                "end": end,
                "text": text,
                "segments": [seg]
            }
        else:
            # Merge
            current_clip["end"] = end
            current_clip["text"] += " " + text
            current_clip["segments"].append(seg)
            
    # Add final clip
    if current_clip["segments"]:
         avg_score = 0
         if current_clip["segments"]:
            total_prob = sum([float(s.get('avg_logprob', -1)) for s in current_clip["segments"]])
            avg_score = total_prob / len(current_clip["segments"])
            import math
            avg_score = math.exp(avg_score)

         clips.append({
            "start": current_clip["start"],
            "end": current_clip["end"],
            "text": current_clip["text"],
            "score": round(avg_score * 100)
        })
            
    return {
        "clips": clips
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video path provided"}))
        sys.exit(1)
        
    video_path = sys.argv[1]
    ffmpeg_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        data = detect_highlights(video_path, ffmpeg_path)
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
