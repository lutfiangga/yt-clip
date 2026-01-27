import sys
import json
import os
import shutil

try:
    import whisper
except ImportError:
    whisper = None

def detect_highlights(video_path):
    if not shutil.which("ffmpeg"):
         return {"error": "FFmpeg not found. Please install FFmpeg and add it to your System PATH."}

    if not whisper:
        return {"error": "Whisper module not found. Please install openai-whisper."}

    if not os.path.exists(video_path):
        return {"error": f"Video file not found at: {video_path}"}

    # Load model
    model = whisper.load_model("base")
    
    # Transcribe
    result = model.transcribe(video_path)
    
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
            # Save current
            clips.append({
                "start": current_clip["start"],
                "end": current_clip["end"],
                "text": current_clip["text"],
                "score": 0.8 # Placeholder
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
         clips.append({
            "start": current_clip["start"],
            "end": current_clip["end"],
            "text": current_clip["text"],
            "score": 0.8
        })
            
    return {
        "clips": clips
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video path provided"}))
        sys.exit(1)
        
    video_path = sys.argv[1]
    
    try:
        data = detect_highlights(video_path)
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
