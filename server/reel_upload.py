#!/usr/bin/env python
import os
import time
import argparse
from instagrapi import Client
from instagrapi.types import MediaType
import logging
import getpass
import json
from pathlib import Path

class InstagramReelsUploader:
    def __init__(self, credentials_file=None):
        """Initialize the Instagram Reels Uploader.
        
        Args:
            credentials_file: Path to JSON file with saved credentials
        """
        self.client = Client()
        self.credentials_file = credentials_file
        self.logger = self._setup_logger()
        
    def _setup_logger(self):
        """Set up logging configuration."""
        logger = logging.getLogger('instagram_uploader')
        logger.setLevel(logging.INFO)
        
        # Create console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(ch)
        
        return logger
    
    def login(self, username=None, password=None):
        """Login to Instagram account.
        
        If credentials_file exists, try to use saved session.
        Otherwise, use username/password to login.
        
        Args:
            username: Instagram username
            password: Instagram password
        
        Returns:
            bool: True if login successful, False otherwise
        """
        # Check if credentials file exists and try to load session
        if self.credentials_file and os.path.exists(self.credentials_file):
            try:
                self.logger.info(f"Loading session from {self.credentials_file}")
                with open(self.credentials_file, 'r') as f:
                    cached_settings = json.load(f)
                    self.client.set_settings(cached_settings)
                    self.client.login(username, password)
                    # Test if session is valid
                    self.client.get_timeline_feed()
                    self.logger.info("Successfully loaded session")
                    return True
            except Exception as e:
                self.logger.warning(f"Failed to load session: {e}")
                # Continue to regular login if session loading fails
        
        # Regular login with username and password
        if not username:
            username = input("Enter Instagram username: ")
        if not password:
            password = getpass.getpass("Enter Instagram password: ")
            
        try:
            self.logger.info(f"Logging in as {username}")
            login_success = self.client.login(username, password)
            
            # Save session for future use
            if login_success and self.credentials_file:
                self.logger.info(f"Saving session to {self.credentials_file}")
                Path(os.path.dirname(self.credentials_file)).mkdir(parents=True, exist_ok=True)
                with open(self.credentials_file, 'w') as f:
                    json.dump(self.client.get_settings(), f)
            
            return login_success
        except Exception as e:
            self.logger.error(f"Login failed: {e}")
            return False
            
    def upload_reel(self, video_path, caption="", thumbnail_path=None, 
                    location=None, mentions=None, hashtags=None):
        """Upload a video as Reel to Instagram.
        
        Args:
            video_path: Path to the video file
            caption: Caption for the Reel
            thumbnail_path: Path to custom thumbnail image (optional)
            location: Location information (optional)
            mentions: List of usernames to mention (optional)
            hashtags: List of hashtags to include (optional)
            
        Returns:
            media_id: ID of uploaded media if successful, None otherwise
        """
        if not os.path.exists(video_path):
            self.logger.error(f"Video file not found: {video_path}")
            return None
            
        # Process caption with mentions and hashtags
        full_caption = caption or ""
        
        if mentions:
            for username in mentions:
                full_caption += f" @{username}"
                
        if hashtags:
            for tag in hashtags:
                # Remove # if user included it
                tag = tag.strip("#")
                full_caption += f" #{tag}"
        
        try:
            self.logger.info(f"Uploading reel: {os.path.basename(video_path)}")
            
            # Upload with or without custom thumbnail
            if thumbnail_path and os.path.exists(thumbnail_path):
                self.logger.info(f"Using custom thumbnail: {thumbnail_path}")
                media = self.client.clip_upload(
                    video_path,
                    caption=full_caption,
                    thumbnail=thumbnail_path,
                    location=location
                )
            else:
                media = self.client.clip_upload(
                    video_path,
                    caption=full_caption,
                    location=location
                )
                
            self.logger.info(f"Successfully uploaded reel with ID: {media.id}")
            return media.id
            
        except Exception as e:
            self.logger.error(f"Failed to upload reel: {e}")
            return None
            
    def upload_multiple_reels(self, video_folder, caption_template=None, 
                              delay_between_uploads=60, hashtags=None):
        """Upload multiple videos from a folder as Reels.
        
        Args:
            video_folder: Path to folder containing videos
            caption_template: Template string for captions (optional)
            delay_between_uploads: Delay in seconds between uploads
            hashtags: List of hashtags to include in all uploads
            
        Returns:
            list: List of successful media IDs
        """
        if not os.path.isdir(video_folder):
            self.logger.error(f"Folder not found: {video_folder}")
            return []
            
        # Get all video files
        video_extensions = ['.mp4', '.mov', '.avi']
        video_files = [
            os.path.join(video_folder, f) for f in os.listdir(video_folder)
            if os.path.splitext(f)[1].lower() in video_extensions
        ]
        
        if not video_files:
            self.logger.warning(f"No video files found in {video_folder}")
            return []
            
        self.logger.info(f"Found {len(video_files)} videos to upload")
        
        successful_uploads = []
        for i, video_path in enumerate(video_files):
            # Generate caption
            video_name = os.path.basename(video_path)
            if caption_template:
                caption = caption_template.format(
                    number=i+1, 
                    total=len(video_files),
                    filename=video_name,
                    name=os.path.splitext(video_name)[0]
                )
            else:
                caption = ""
                
            # Check for matching thumbnail with same name
            thumbnail_path = None
            for ext in ['.jpg', '.jpeg', '.png']:
                potential_thumbnail = os.path.splitext(video_path)[0] + ext
                if os.path.exists(potential_thumbnail):
                    thumbnail_path = potential_thumbnail
                    break
                    
            # Upload the reel
            media_id = self.upload_reel(
                video_path=video_path,
                caption=caption,
                thumbnail_path=thumbnail_path,
                hashtags=hashtags
            )
            
            if media_id:
                successful_uploads.append(media_id)
                self.logger.info(f"Uploaded {i+1}/{len(video_files)}: {video_name}")
                
                # Delay before next upload (except for the last one)
                if i < len(video_files) - 1:
                    self.logger.info(f"Waiting {delay_between_uploads} seconds before next upload...")
                    time.sleep(delay_between_uploads)
            
        self.logger.info(f"Finished uploading {len(successful_uploads)}/{len(video_files)} reels")
        return successful_uploads
        
    def logout(self):
        """Logout from Instagram."""
        try:
            self.client.logout()
            self.logger.info("Logged out successfully")
            return True
        except Exception as e:
            self.logger.error(f"Logout failed: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Upload Reels to Instagram")
    parser.add_argument("--username", "-u", help="Instagram username")
    parser.add_argument("--password", "-p", help="Instagram password")
    parser.add_argument("--credentials", help="Path to credentials JSON file")
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Single upload parser
    upload_parser = subparsers.add_parser("upload", help="Upload a single reel")
    upload_parser.add_argument("video", help="Path to video file")
    upload_parser.add_argument("--caption", "-c", help="Caption for the reel")
    upload_parser.add_argument("--thumbnail", "-t", help="Path to thumbnail image")
    upload_parser.add_argument("--hashtags", nargs="+", help="Hashtags to include")
    
    # Batch upload parser
    batch_parser = subparsers.add_parser("batch", help="Upload multiple reels from a folder")
    batch_parser.add_argument("folder", help="Path to folder containing videos")
    batch_parser.add_argument("--caption-template", help="Caption template (use {name}, {filename}, {number}, {total})")
    batch_parser.add_argument("--delay", type=int, default=60, help="Delay between uploads in seconds")
    batch_parser.add_argument("--hashtags", nargs="+", help="Hashtags to include")
    
    args = parser.parse_args()
    
    # Initialize uploader
    uploader = InstagramReelsUploader(credentials_file=args.credentials)
    
    # Login
    if not uploader.login(args.username, args.password):
        print("Login failed. Exiting.")
        return 1
        
    try:
        # Execute command
        if args.command == "upload":
            uploader.upload_reel(
                video_path=args.video,
                caption=args.caption,
                thumbnail_path=args.thumbnail,
                hashtags=args.hashtags
            )
        elif args.command == "batch":
            uploader.upload_multiple_reels(
                video_folder=args.folder,
                caption_template=args.caption_template,
                delay_between_uploads=args.delay,
                hashtags=args.hashtags
            )
        else:
            parser.print_help()
    finally:
        # Logout
        uploader.logout()
    
    return 0

if __name__ == "__main__":
    exit(main())