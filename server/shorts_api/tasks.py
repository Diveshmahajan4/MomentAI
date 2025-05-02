import os
import threading
import re
import requests
from urllib.parse import urlparse
from .models import VideoProcessing, LanguageDubbing
from .utils import upload_to_cloudinary, update_supabase
from Components.YoutubeDownloader import download_youtube_video
from Components.Edit import extractAudio, crop_video, extractAudioDubbed
from Components.Transcription import transcribeAudio
from Components.LanguageTasks import GetHighlight
from Components.FaceCrop import crop_to_vertical, combine_videos
from Components.GenerateCaptions import add_captions
from Components.Translation import translate_transcript_with_timestamps
from Components.TextToSpeech import transcript_to_speech, merge_audio_with_video

def ensure_directories():
    """Ensure all necessary directories exist"""
    directories = ['media', 'videos', 'media/captioned']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)

def process_video_task(video_processing_id):
    """
    Process a video in a background thread
    """
    video_processing = VideoProcessing.objects.get(id=video_processing_id)
    
    try:
        video_processing.status = 'PROCESSING'
        video_processing.save()
        
        # Ensure directories exist
        ensure_directories()
        
        # For testing without processing the entire pipeline
        test_mode = False
        
        if test_mode:
            # In test mode, we'll generate multiple fake shorts
            for i in range(video_processing.num_shorts):
                final_path = f"media/final_{video_processing_id}_{i}.mp4"
                
                # Try to use an existing video file
                if not os.path.exists(final_path):
                    # Find existing videos to copy
                    existing_videos = []
                    for vid_file in os.listdir('videos'):
                        if vid_file.endswith('.mp4'):
                            existing_videos.append(os.path.join('videos', vid_file))
                    
                    # If any videos exist, copy the first one
                    if existing_videos:
                        import shutil
                        shutil.copy(existing_videos[0], final_path)
                        print(f"Copied {existing_videos[0]} to {final_path} for testing")
                    else:
                        video_processing.error_message = f"Test file not found and no existing videos to copy."
                        video_processing.status = 'FAILED'
                        video_processing.save()
                        return
                
                # Upload to Cloudinary
                upload_result = upload_to_cloudinary(final_path, f"user_{video_processing.username}_{i}")
                if upload_result:
                    # Add this URL to the list
                    video_processing.add_cloudinary_url(upload_result['url'], upload_result['public_id'])
                    print(f"Uploaded short {i+1}/{video_processing.num_shorts} to Cloudinary: {upload_result['url']}")
                else:
                    video_processing.error_message = f"Failed to upload short {i+1} to Cloudinary"
                    video_processing.status = 'FAILED'
                    video_processing.save()
            
            # If we get here, all uploads were successful
            video_processing.status = 'COMPLETED'
            video_processing.add_captions = "True"
            video_processing.save()
             # Add captions to the video if enabled
            if video_processing.add_captions:
                try:
                    captioned_path = f"media/captioned/final_{video_processing_id}_{i}_captioned.mp4"
                    
                    # Generate captions using the local Whisper model for better accuracy
                    add_captions(
                        final_path,
                        captioned_path,
                        font="PoetsenOne-Regular.ttf",
                        font_size=30,
                        font_color="white",
                        stroke_width=2,
                        stroke_color="black",
                        highlight_current_word=True,
                        word_highlight_color="#29BFFF",
                        line_count=2,
                        padding=40,
                        shadow_strength=1.0,
                        shadow_blur=0.1,
                        use_local_whisper=True,
                        print_info=True
                    )
                    
                    # Use the captioned video if it was created successfully
                    if os.path.exists(captioned_path):
                        final_path = captioned_path
                        print(f"Successfully added captions to short {i+1}")
                    else:
                        print(f"Failed to add captions to short {i+1}, using original video")
                except Exception as e:
                    print(f"Error adding captions to short {i+1}: {str(e)}, using original video")
            else:
                print(f"Captions disabled for this processing task, skipping caption generation")
            
            # Update Supabase with all URLs
            if video_processing.cloudinary_urls:
                urls = [item['url'] for item in video_processing.cloudinary_urls]
                update_supabase(
                    video_processing.username,
                    video_processing.youtube_url,
                    urls
                )
            return
        
        else:
            # Download the video
            vid = download_youtube_video(video_processing.youtube_url)
            if not vid:
                video_processing.error_message = "Unable to download the video"
                video_processing.status = 'FAILED'
                video_processing.save()
                return
                
            vid = vid.replace(".webm", ".mp4")
            video_processing.original_video_path = vid
            video_processing.save()
            
            # Extract audio
            audio = extractAudio(vid)
            if not audio:
                video_processing.error_message = "No audio file found"
                video_processing.status = 'FAILED'
                video_processing.save()
                return
                
            # Transcribe audio
            transcriptions = transcribeAudio(audio)
            if len(transcriptions) == 0:
                video_processing.error_message = "No transcriptions found"
                video_processing.status = 'FAILED'
                video_processing.save()
                return
                
            trans_text = ""
            for text, start, end in transcriptions:
                trans_text += (f"{start} - {end}: {text}")
            
            # Generate multiple highlights
            for i in range(video_processing.num_shorts):
                print(f"Generating short {i+1}/{video_processing.num_shorts}")
                
                # Get highlight timestamps - we add a different prompt for each short to get variety
                start, stop = GetHighlight(trans_text + f" (Generate highlight {i+1}, different from previous ones)")
                if start == 0 or stop == 0:
                    # Skip this highlight but continue with others
                    print(f"Error in getting highlight {i+1}, skipping")
                    continue
                    
                # Create output paths
                output = f"media/Out_{i}.mp4"
                
                # Crop video to highlight section
                crop_video(vid, output, start, stop)
                
                # Crop to vertical
                cropped = f"media/cropped_{i}.mp4"
                crop_to_vertical(output, cropped)
                
                # Combine videos
                final_path = f"media/final_{video_processing_id}_{i}.mp4"
                combine_videos(output, cropped, final_path)
                
                # Add captions to the video if enabled
                if video_processing.add_captions:
                    try:
                        captioned_path = f"media/captioned/final_{video_processing_id}_{i}_captioned.mp4"
                        
                        # Generate captions using the local Whisper model for better accuracy
                        add_captions(
                            final_path,
                            captioned_path,
                            font="PoetsenOne-Regular.ttf",
                            font_size=100,
                            font_color="white",
                            stroke_width=2,
                            stroke_color="black",
                            highlight_current_word=True,
                            word_highlight_color="#29BFFF",
                            line_count=2,
                            padding=40,
                            shadow_strength=1.0,
                            shadow_blur=0.1,
                            use_local_whisper=True,
                            print_info=True
                        )
                        
                        # Use the captioned video if it was created successfully
                        if os.path.exists(captioned_path):
                            final_path = captioned_path
                            print(f"Successfully added captions to short {i+1}")
                        else:
                            print(f"Failed to add captions to short {i+1}, using original video")
                    except Exception as e:
                        print(f"Error adding captions to short {i+1}: {str(e)}, using original video")
                else:
                    print(f"Captions disabled for this processing task, skipping caption generation")
                
                # Upload to Cloudinary
                upload_result = upload_to_cloudinary(final_path, f"user_{video_processing.username}_{i}")
                if upload_result:
                    # Add this URL to the list
                    video_processing.add_cloudinary_url(upload_result['url'], upload_result['public_id'])
                    print(f"Uploaded short {i+1}/{video_processing.num_shorts} to Cloudinary: {upload_result['url']}")
                else:
                    print(f"Failed to upload short {i+1} to Cloudinary, continuing with others")
            
            # If we have at least one successful upload, mark as completed
            if video_processing.cloudinary_urls:
                video_processing.status = 'COMPLETED'
                video_processing.save()
                
                # # Update Supabase with all URLs
                # urls = [item['url'] for item in video_processing.cloudinary_urls]
                # update_supabase(
                #     video_processing.username,
                #     video_processing.youtube_url,
                #     urls
                # )
                return
            else:
                video_processing.error_message = "Failed to create any shorts"
                video_processing.status = 'FAILED'
                video_processing.save()
    
    except Exception as e:
        video_processing.status = 'FAILED'
        video_processing.error_message = str(e)
        video_processing.save()

def start_processing_video(video_processing_id):
    """
    Start a background thread to process the video
    """
    thread = threading.Thread(target=process_video_task, args=(video_processing_id,))
    thread.daemon = True
    thread.start()
    return thread 

def is_cloudinary_url(url):
    """
    Check if a URL is a Cloudinary URL
    """
    parsed_url = urlparse(url)
    return 'cloudinary.com' in parsed_url.netloc or 'res.cloudinary.com' in parsed_url.netloc

def download_from_cloudinary(url, output_path):
    """
    Download a video file from Cloudinary
    """
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return output_path
    except Exception as e:
        print(f"Error downloading from Cloudinary: {e}")
        return None

def process_dubbing_task(dubbing_id):
    """
    Process a language dubbing task in a background thread
    
    Steps:
    1. Download the video (from YouTube or Cloudinary)
    2. Extract audio
    3. Transcribe audio
    4. Translate transcript
    5. Generate speech from translated transcript
    6. Merge speech with original video
    7. Add captions (optional)
    8. Upload to Cloudinary
    """
    dubbing = LanguageDubbing.objects.get(id=dubbing_id)
    
    try:
        dubbing.status = 'PROCESSING'
        dubbing.save()
        
        # Ensure directories exist
        ensure_directories()
        
        # Create directories for dubbed content if they don't exist
        if not os.path.exists('media/dubbed'):
            os.makedirs('media/dubbed')
        
        # Check if the URL is from Cloudinary or YouTube
        if is_cloudinary_url(dubbing.video_url):
            print(f"Detected Cloudinary URL: {dubbing.video_url}")
            vid_output_path = f"videos/cloudinary_video_{dubbing_id}.mp4"
            vid = download_from_cloudinary(dubbing.video_url, vid_output_path)
            if not vid:
                dubbing.error_message = "Unable to download the video from Cloudinary"
                dubbing.status = 'FAILED'
                dubbing.save()
                return
        else:
            print(f"Detected YouTube or other URL: {dubbing.video_url}")
            # Download the video from YouTube
            vid = download_youtube_video(dubbing.video_url)
            if not vid:
                dubbing.error_message = "Unable to download the video"
                dubbing.status = 'FAILED'
                dubbing.save()
                return
            
            vid = vid.replace(".webm", ".mp4")
        
        dubbing.original_video_path = vid
        dubbing.save()
        
        # Extract audio
        audio = extractAudioDubbed(vid, dubbing_id)
        if not audio:
            dubbing.error_message = "No audio file found"
            dubbing.status = 'FAILED'
            dubbing.save()
            return
            
        # Transcribe audio
        transcriptions = transcribeAudio(audio)
        if len(transcriptions) == 0:
            dubbing.error_message = "No transcriptions found"
            dubbing.status = 'FAILED'
            dubbing.save()
            return
        
        # Translate transcript to target language
        print(f"Translating transcript from {dubbing.source_language} to {dubbing.target_language}")
        translated_transcript = translate_transcript_with_timestamps(
            transcriptions, 
            source_language=dubbing.source_language,
            target_language=dubbing.target_language
        )
        
        if not translated_transcript:
            dubbing.error_message = "Failed to translate transcript"
            dubbing.status = 'FAILED'
            dubbing.save()
            return
        
        # Generate speech from translated transcript
        dubbed_audio_path = f"media/dubbed/audio_{dubbing_id}.wav"
        print(f"Generating speech from translated transcript using voice: {dubbing.voice}")
        audio_result = transcript_to_speech(
            translated_transcript,
            dubbed_audio_path,
            voice=dubbing.voice
        )
        
        if not audio_result:
            dubbing.error_message = "Failed to generate speech from translated transcript"
            dubbing.status = 'FAILED'
            dubbing.save()
            return
        
        # Merge speech with original video
        dubbed_video_path = f"media/dubbed/video_{dubbing_id}.mp4"
        print("Merging translated audio with original video")
        merge_success = merge_audio_with_video(
            vid,
            dubbed_audio_path,
            dubbed_video_path
        )
        
        if not merge_success:
            dubbing.error_message = "Failed to merge audio with video"
            dubbing.status = 'FAILED'
            dubbing.save()
            return
        
        dubbing.dubbed_video_path = dubbed_video_path
        dubbing.save()
        
        # Add captions to the video if enabled
        final_path = dubbed_video_path
        if dubbing.add_captions:
            try:
                captioned_path = f"media/captioned/dubbed_{dubbing_id}_captioned.mp4"
                
                # Extract text from translated transcript for captions
                translated_text = []
                for text, start, end in translated_transcript:
                    translated_text.append({
                        "start": start,
                        "end": end,
                        "text": text
                    })
                
                # Generate captions
                add_captions(
                    dubbed_video_path,
                    captioned_path,
                    font="PoetsenOne-Regular.ttf",
                    font_size=100,
                    font_color="white",
                    stroke_width=2,
                    stroke_color="black",
                    highlight_current_word=True,
                    word_highlight_color="#29BFFF",
                    line_count=2,
                    padding=40,
                    shadow_strength=1.0,
                    shadow_blur=0.1,
                    use_local_whisper=False,  # Use provided segments instead
                    segments=translated_text,
                    print_info=True
                )
                
                # Use the captioned video if it was created successfully
                if os.path.exists(captioned_path):
                    final_path = captioned_path
                    print("Successfully added captions to dubbed video")
                else:
                    print("Failed to add captions to dubbed video, using non-captioned version")
            except Exception as e:
                print(f"Error adding captions to dubbed video: {str(e)}, using non-captioned version")
        else:
            print("Captions disabled for this dubbing task, skipping caption generation")
        
        # Upload to Cloudinary
        upload_result = upload_to_cloudinary(final_path, f"dubbed_{dubbing.username}_{dubbing.target_language}")
        if upload_result:
            # Add this URL
            dubbing.add_cloudinary_url(upload_result['url'], upload_result['public_id'])
            print(f"Uploaded dubbed video to Cloudinary: {upload_result['url']}")
            
            # Mark as completed
            dubbing.status = 'COMPLETED'
            dubbing.save()
            return
        else:
            dubbing.error_message = "Failed to upload dubbed video to Cloudinary"
            dubbing.status = 'FAILED'
            dubbing.save()
    
    except Exception as e:
        dubbing.status = 'FAILED'
        dubbing.error_message = str(e)
        dubbing.save()

def start_dubbing_process(dubbing_id):
    """
    Start a background thread to process the language dubbing
    """
    thread = threading.Thread(target=process_dubbing_task, args=(dubbing_id,))
    thread.daemon = True
    thread.start()
    return thread 