import cv2
import mediapipe as mp
import sys
import json
import numpy as np

def analyze_video_for_cropping(video_path, target_ratio=9/16, start_time=0, end_time=None):
    """
    Analyzes a video to determine the best crop center for each frame based on face detection.
    """
    mp_face_detection = mp.solutions.face_detection
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"error": "Could not open video"}))
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    start_frame = int(start_time * fps)
    end_frame = int(end_time * fps) if end_time else total_frames
    
    if start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    # ... logic continues ...
    target_width = int(height * target_ratio)
    if target_width > width: 
        target_width = width
        target_height = int(width / target_ratio)
    else:
        target_height = height

    crop_data = []

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
        frame_idx = start_frame
        
        process_every = 5 
        last_center_x = width // 2
        
        while cap.isOpened() and frame_idx < end_frame:
            success, image = cap.read()
            if not success:
                break
            
            if frame_idx % process_every == 0:
                image.flags.writeable = False
                results = face_detection.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
                
                if results.detections:
                    max_area = 0
                    center_x = last_center_x
                    for detection in results.detections:
                        bboxC = detection.location_data.relative_bounding_box
                        h, w, y, x = bboxC.height, bboxC.width, bboxC.ymin, bboxC.xmin
                        area = h * w
                        if area > max_area:
                            max_area = area
                            center_x = int((x + w/2) * width)
                    last_center_x = center_x
                
                crop_data.append({
                    "frame": frame_idx,
                    "center_x": last_center_x
                })
            
            frame_idx += 1

    cap.release()
    
    result = {
        "original_width": width,
        "original_height": height,
        "target_width": target_width,
        "target_height": target_height,
        "fps": fps,
        "start_time": start_time,
        "end_time": end_time,
        "key_points": crop_data
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video path provided"}))
        sys.exit(1)
        
    video_path = sys.argv[1]
    ratio = 9/16
    start = 0
    end = None
    
    if len(sys.argv) > 2:
        try: ratio = float(sys.argv[2])
        except: pass
    if len(sys.argv) > 3:
        try: start = float(sys.argv[3])
        except: pass
    if len(sys.argv) > 4:
        try: end = float(sys.argv[4])
        except: pass
            
    try:
        analyze_video_for_cropping(video_path, ratio, start, end)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
