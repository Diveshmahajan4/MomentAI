from instagrapi import Client
from typing import Optional
import os
import requests
import tempfile
from urllib.parse import urlparse

class InstagramUploader:
    def __init__(self):
        self.client = Client()
        self.temp_dir = tempfile.mkdtemp()
        
    def login(self, username: str, password: str) -> bool:
        try:
            self.client.login(username, password)
            return True
        except Exception as e:
            print(f"Login failed: {str(e)}")
            return False
            
    def download_video(self, url: str) -> Optional[str]:
        try:
            # Generate a temporary file path
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            if not filename.endswith('.mp4'):
                filename = f"{filename}.mp4"
            
            temp_path = os.path.join(self.temp_dir, filename)
            
            # Download the video
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            return temp_path
        except Exception as e:
            print(f"Download failed: {str(e)}")
            return None
            
    def upload_reel(self, video_url: str, caption: str) -> Optional[dict]:
        try:
            # Download the video from Cloudinary
            video_path = self.download_video(video_url)
            if not video_path:
                raise Exception("Failed to download video from Cloudinary")
                
            # Upload to Instagram
            media = self.client.clip_upload(
                video_path,
                caption=caption
            )
            
            # Clean up the temporary file
            try:
                os.remove(video_path)
            except Exception as e:
                print(f"Failed to clean up temporary file: {str(e)}")
            
            return media.dict()
        except Exception as e:
            print(f"Upload failed: {str(e)}")
            return None
            
    def __del__(self):
        # Clean up temporary directory
        try:
            for file in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, file)
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                except Exception as e:
                    print(f"Failed to remove temporary file {file_path}: {str(e)}")
            os.rmdir(self.temp_dir)
        except Exception as e:
            print(f"Failed to clean up temporary directory: {str(e)}") 