import sys
import json
import subprocess
import cv2
import os

def render_clip(video_path, start, end, ratio, output_path):
    """
    Render a clip with smart cropping using FFmpeg.
    Uses face detection to find the center point for cropping.
    """
    
    # 1. Analyze video for face positions
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Target width based on ratio
    target_width = int(height * ratio)
    if target_width > width:
        target_width = width
    
    # Face detection to find average center
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    start_frame = int(start * fps)
    end_frame = int(end * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    centers = []
    frame_idx = start_frame
    step = 10  # Sample every 10 frames
    
    while cap.isOpened() and frame_idx < min(end_frame, start_frame + 300):  # Max 300 frames
        success, image = cap.read()
        if not success:
            break
        
        if (frame_idx - start_frame) % step == 0:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))
            
            if len(faces) > 0:
                # Get largest face
                largest = max(faces, key=lambda f: f[2] * f[3])
                center_x = largest[0] + largest[2] // 2
                centers.append(center_x)
        
        frame_idx += 1
    
    cap.release()
    
    # Calculate crop position (average of detected faces, or center)
    if centers:
        avg_center = int(sum(centers) / len(centers))
    else:
        avg_center = width // 2
    
    # Calculate crop x position
    crop_x = avg_center - target_width // 2
    if crop_x < 0:
        crop_x = 0
    if crop_x + target_width > width:
        crop_x = width - target_width
    
    # 2. Use FFmpeg for the actual rendering (much faster and more reliable)
    duration = end - start
    
    # Build FFmpeg command
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start),
        '-i', video_path,
        '-t', str(duration),
        '-vf', f'crop={target_width}:{height}:{crop_x}:0',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        output_path
    ]
    
    print(f"Running FFmpeg: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        raise Exception(f"FFmpeg error: {result.stderr}")
    
    return {"output": output_path}

if __name__ == "__main__":
    try:
        if len(sys.argv) < 6:
            raise Exception("Usage: render_clip.py path start end ratio output")
            
        video_path = sys.argv[1]
        start = float(sys.argv[2])
        end = float(sys.argv[3])
        ratio = float(sys.argv[4])
        output_path = sys.argv[5]
        
        render_clip(video_path, start, end, ratio, output_path)
        print(json.dumps({"success": True, "file": output_path}))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(json.dumps({"error": str(e)}))
