import os
import json
from supabase import create_client
import logging
from dotenv import load_dotenv
from django.conf import settings

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

# Table names from settings
VIDEO_PROCESSING_TABLE = getattr(settings, 'SUPABASE_TABLE_VIDEO_PROCESSING', 'video_processing')
LANGUAGE_DUBBING_TABLE = getattr(settings, 'SUPABASE_TABLE_LANGUAGE_DUBBING', 'language_dubbing')

def initialize_supabase_tables():
    """
    Initialize the Supabase tables if they don't exist.
    This would normally be handled by database migrations in a production environment.
    """
    try:
        # Create VideoProcessing table
        # Note: This is a simplified approach - in a production environment,
        # you would use proper SQL migrations or Supabase's database setup tools
        
        # For demonstration purposes only - this won't actually create tables
        # as Supabase requires SQL migrations through the dashboard or API
        logger.info("Supabase tables should be created through the Supabase dashboard")
        logger.info("Please create the following tables:")
        logger.info(f"1. {VIDEO_PROCESSING_TABLE}")
        logger.info(f"2. {LANGUAGE_DUBBING_TABLE}")
        
        return True
    except Exception as e:
        logger.error(f"Error initializing Supabase tables: {str(e)}")
        return False

# VideoProcessing CRUD operations
def create_video_processing(data):
    """Create a new video processing record in Supabase"""
        
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        response = supabase.table(VIDEO_PROCESSING_TABLE).insert(data).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error creating video processing: {str(e)}")
        return None

def get_video_processing(id):
    """Get a video processing record by ID"""
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        response = supabase.table(VIDEO_PROCESSING_TABLE).select('*').eq('id', id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting video processing: {str(e)}")
        return None

def update_video_processing(id, data):
    """Update a video processing record"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        response = supabase.table(VIDEO_PROCESSING_TABLE).update(data).eq('id', id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating video processing: {str(e)}")
        return None

def get_video_processing_by_username(username):
    """Get all video processing records for a username"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return []
            
        response = supabase.table(VIDEO_PROCESSING_TABLE).select('*').eq('username', username).order('created_at', desc=True).execute()
        if response.data:
            return response.data
        return []
    except Exception as e:
        logger.error(f"Error getting video processing by username: {str(e)}")
        return []

def add_cloudinary_url_to_video_processing(id, url, public_id):
    """Add a Cloudinary URL to a video processing record"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        # First get the existing record
        record = get_video_processing(id)
        if not record:
            return None
        
        # Get existing URLs or initialize an empty list
        urls = json.loads(record.get('cloudinary_urls_json', '[]')) if record.get('cloudinary_urls_json') else []
        
        # Add the new URL
        urls.append({
            'url': url,
            'public_id': public_id
        })
        
        # Update the record
        data = {
            'cloudinary_urls_json': json.dumps(urls)
        }
        
        # If this is the first URL, also update the main cloudinary_url
        if not record.get('cloudinary_url'):
            data.update({
                'cloudinary_url': url,
                'cloudinary_public_id': public_id
            })
        
        return update_video_processing(id, data)
    except Exception as e:
        logger.error(f"Error adding Cloudinary URL: {str(e)}")
        return None

# LanguageDubbing CRUD operations
def create_language_dubbing(data):
    """Create a new language dubbing record in Supabase"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        response = supabase.table(LANGUAGE_DUBBING_TABLE).insert(data).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error creating language dubbing: {str(e)}")
        return None

def get_language_dubbing(id):
    """Get a language dubbing record by ID"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        response = supabase.table(LANGUAGE_DUBBING_TABLE).select('*').eq('id', id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting language dubbing: {str(e)}")
        return None

def update_language_dubbing(id, data):
    """Update a language dubbing record"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        response = supabase.table(LANGUAGE_DUBBING_TABLE).update(data).eq('id', id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating language dubbing: {str(e)}")
        return None

def get_language_dubbing_by_username(username):
    """Get all language dubbing records for a username"""
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return []
            
        response = supabase.table(LANGUAGE_DUBBING_TABLE).select('*').eq('username', username).order('created_at', desc=True).execute()
        if response.data:
            return response.data
        return []
    except Exception as e:
        logger.error(f"Error getting language dubbing by username: {str(e)}")
        return []

def add_cloudinary_url_to_language_dubbing(id, url, public_id):
    """Add a Cloudinary URL to a language dubbing record"""
    
    # Use Supabase
    try:
        if not supabase:
            logger.error("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.")
            return None
            
        # First get the existing record
        record = get_language_dubbing(id)
        if not record:
            return None
        
        # Get existing URLs or initialize an empty list
        urls = json.loads(record.get('cloudinary_urls_json', '[]')) if record.get('cloudinary_urls_json') else []
        
        # Add the new URL
        urls.append({
            'url': url,
            'public_id': public_id
        })
        
        # Update the record
        data = {
            'cloudinary_urls_json': json.dumps(urls)
        }
        
        # If this is the first URL, also update the main cloudinary_url
        if not record.get('cloudinary_url'):
            data.update({
                'cloudinary_url': url,
                'cloudinary_public_id': public_id
            })
        
        return update_language_dubbing(id, data)
    except Exception as e:
        logger.error(f"Error adding Cloudinary URL: {str(e)}")
        return None 