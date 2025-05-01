import os
import cloudinary
import cloudinary.uploader
from supabase import create_client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def upload_to_cloudinary(file_path, public_id_prefix='shorts'):
    """
    Upload a video file to Cloudinary and return the URL
    """
    print("Uploading images in cloudinary.")
    try:
        # Get environment variables directly
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
        api_key = os.getenv('CLOUDINARY_API_KEY')
        api_secret = os.getenv('CLOUDINARY_API_SECRET')
        
        # Configure cloudinary with direct env vars
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        
        # Generate a unique public_id based on the filename
        filename = os.path.basename(file_path)
        public_id = f"{public_id_prefix}/{os.path.splitext(filename)[0]}"
        
        # Ensure the file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None
            
        # Upload the file
        upload_result = cloudinary.uploader.upload(
            file_path,
            resource_type="video",
            public_id=public_id,
            overwrite=True,
            folder="shorts"
        )
        print("Upload complete.")
        return {
            'url': upload_result['secure_url'],
            'public_id': upload_result['public_id']
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {str(e)}")
        return None


## For time being we are not using supabase.
def update_supabase(username, youtube_url, cloudinary_urls):
    """
    Update the Supabase database with the video information
    
    Args:
        username: The username of the user
        youtube_url: The YouTube URL of the original video
        cloudinary_urls: A single URL string or a list of URL strings
    """
    try:
        # Get environment variables directly
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        supabase_table = os.getenv('SUPABASE_TABLE', 'shorts')
        
        # Create Supabase client with direct env vars
        supabase = create_client(supabase_url, supabase_key)
        
        # Convert to list if it's a single URL
        if isinstance(cloudinary_urls, str):
            cloudinary_urls = [cloudinary_urls]
            
        # Insert records for each URL
        data_to_insert = []
        for url in cloudinary_urls:
            data_to_insert.append({
                "username": username,
                "youtube_url": youtube_url,
                "short_url": url,
                "created_at": "now()"
            })
        
        if data_to_insert:
            response = supabase.table(supabase_table).insert(data_to_insert).execute()
            if response.data:
                return response.data
        return None
    except Exception as e:
        logger.error(f"Supabase update error: {str(e)}")
        return None 