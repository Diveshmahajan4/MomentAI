import cv2
import subprocess
import numpy as np
from moviepy.editor import *
from Components.Speaker import detect_faces_and_speakers, Frames
global Fps

def crop_to_vertical(input_video_path, output_video_path):
    print("Cropping to vertical")
    detect_faces_and_speakers(input_video_path, "DecOut.mp4")
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    print("Face Cascade loaded")
    cap = cv2.VideoCapture(input_video_path, cv2.CAP_FFMPEG)
    print("Video Captured")
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    vertical_height = int(original_height)
    vertical_width = int(vertical_height * 9 / 16)
    print(vertical_height, vertical_width)


    if original_width < vertical_width:
        print("Error: Original video width is less than the desired vertical width.")
        return

    x_start = (original_width - vertical_width) // 2
    x_end = x_start + vertical_width
    print(f"start and end - {x_start} , {x_end}")
    print(x_end-x_start)
    half_width = vertical_width // 2

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (vertical_width, vertical_height))
    global Fps
    Fps = fps
    print(fps)
    count = 0
    for _ in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame.")
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        if len(faces) >-1:
            if len(faces) == 0:
                (x, y, w, h) = Frames[count]

            # (x, y, w, h) = faces[0]  
            try:
                #check if face 1 is active
                (X, Y, W, H) = Frames[count]
            except Exception as e:
                print(e)
                (X, Y, W, H) = Frames[count][0]
                print(Frames[count][0])
            
            for f in faces:
                x1, y1, w1, h1 = f
                center = x1+ w1//2
                if center > X and center < X+W:
                    x = x1
                    y = y1
                    w = w1
                    h = h1
                    break

            # print(faces[0])
            centerX = x+(w//2)
            print(centerX)
            print(x_start - (centerX - half_width))
            if count == 0 or (x_start - (centerX - half_width)) <1 :
                ## IF dif from prev fram is low then no movement is done
                pass #use prev vals
            else:
                x_start = centerX - half_width
                x_end = centerX + half_width


                if int(cropped_frame.shape[1]) != x_end- x_start:
                    if x_end < original_width:
                        x_end += int(cropped_frame.shape[1]) - (x_end-x_start)
                        if x_end > original_width:
                            x_start -= int(cropped_frame.shape[1]) - (x_end-x_start)
                    else:
                        x_start -= int(cropped_frame.shape[1]) - (x_end-x_start)
                        if x_start < 0:
                            x_end += int(cropped_frame.shape[1]) - (x_end-x_start)
                    print("Frame size inconsistant")
                    print(x_end- x_start)

        count += 1
        cropped_frame = frame[:, x_start:x_end]
        if cropped_frame.shape[1] == 0:
            x_start = (original_width - vertical_width) // 2
            x_end = x_start + vertical_width
            cropped_frame = frame[:, x_start:x_end]
        
        print(cropped_frame.shape)

        out.write(cropped_frame)

    cap.release()
    out.release()
    print("Cropping complete. The video has been saved to", output_video_path, count)



def combine_videos(video_with_audio, video_without_audio, output_filename):
    try:
        # Load video clips
        clip_with_audio = VideoFileClip(video_with_audio)
        clip_without_audio = VideoFileClip(video_without_audio)

        audio = clip_with_audio.audio

        combined_clip = clip_without_audio.set_audio(audio)

        global Fps
        combined_clip.write_videofile(output_filename, codec='libx264', audio_codec='aac', fps=Fps, preset='medium', bitrate='3000k')
        print(f"Combined video saved successfully as {output_filename}")
    
    except Exception as e:
        print(f"Error combining video and audio: {str(e)}")



def letterbox_to_portrait(input_path, output_path, target_width=1080, target_height=1920):
    """
    Place a landscape video centered in a 9:16 portrait frame with black bars.
    Uses ffmpeg directly for speed (no re-encode of the video stream where possible).
    """
    print(f"Letterboxing {input_path} to {target_width}x{target_height}")
    try:
        # Scale video so width = target_width, then pad to target_height with black
        vf = (
            f"scale={target_width}:-2,"
            f"pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:black"
        )
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"ffmpeg letterbox error: {result.stderr[-500:]}")
            return None
        print(f"Letterboxed video saved to {output_path}")
        return output_path
    except Exception as e:
        print(f"Error in letterbox_to_portrait: {e}")
        return None


if __name__ == "__main__":
    input_video_path = r'Out.mp4'
    output_video_path = 'Croped_output_video.mp4'
    final_video_path = 'final_video_with_audio.mp4'
    detect_faces_and_speakers(input_video_path, "DecOut.mp4")
    crop_to_vertical(input_video_path, output_video_path)
    combine_videos(input_video_path, output_video_path, final_video_path)



