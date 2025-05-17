#!/usr/bin/env python
"""
Migration script to move data from SQLite to Supabase
"""
import os
import sys
import json
import django
from datetime import datetime

# Add the project directory to the sys.path
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'shorts_generator.settings')
django.setup()

# Import Django models and Supabase client
from shorts_api.models import VideoProcessing, LanguageDubbing
from shorts_api.supabase_client import (
    create_video_processing, create_language_dubbing,
    initialize_supabase_tables
)

def migrate_video_processing():
    """Migrate all video processing records to Supabase"""
    video_processings = VideoProcessing.objects.all()
    print(f"Found {len(video_processings)} video processing records")
    
    migrated_count = 0
    for video in video_processings:
        # Convert the object to a dictionary
        data = {
            'id': str(video.id),
            'username': video.username,
            'youtube_url': video.youtube_url,
            'original_video_path': video.original_video_path,
            'final_video_path': video.final_video_path,
            'cloudinary_url': video.cloudinary_url,
            'cloudinary_public_id': video.cloudinary_public_id,
            'num_shorts': video.num_shorts,
            'cloudinary_urls_json': video.cloudinary_urls_json,
            'status': video.status,
            'error_message': video.error_message,
            'created_at': video.created_at.isoformat(),
            'updated_at': video.updated_at.isoformat(),
            'add_captions': video.add_captions
        }
        
        # Create the record in Supabase
        result = create_video_processing(data)
        if result:
            migrated_count += 1
            print(f"Migrated video processing record {video.id}")
        else:
            print(f"Failed to migrate video processing record {video.id}")
    
    print(f"Successfully migrated {migrated_count} video processing records")
    return migrated_count

def migrate_language_dubbing():
    """Migrate all language dubbing records to Supabase"""
    dubbings = LanguageDubbing.objects.all()
    print(f"Found {len(dubbings)} language dubbing records")
    
    migrated_count = 0
    for dubbing in dubbings:
        # Convert the object to a dictionary
        data = {
            'id': str(dubbing.id),
            'username': dubbing.username,
            'video_url': dubbing.video_url,
            'source_language': dubbing.source_language,
            'target_language': dubbing.target_language,
            'voice': dubbing.voice,
            'original_video_path': dubbing.original_video_path,
            'dubbed_video_path': dubbing.dubbed_video_path,
            'cloudinary_url': dubbing.cloudinary_url,
            'cloudinary_public_id': dubbing.cloudinary_public_id,
            'cloudinary_urls_json': dubbing.cloudinary_urls_json,
            'status': dubbing.status,
            'error_message': dubbing.error_message,
            'created_at': dubbing.created_at.isoformat(),
            'updated_at': dubbing.updated_at.isoformat(),
            'add_captions': dubbing.add_captions
        }
        
        # Create the record in Supabase
        result = create_language_dubbing(data)
        if result:
            migrated_count += 1
            print(f"Migrated language dubbing record {dubbing.id}")
        else:
            print(f"Failed to migrate language dubbing record {dubbing.id}")
    
    print(f"Successfully migrated {migrated_count} language dubbing records")
    return migrated_count

def main():
    """Main function"""
    print("Initializing Supabase tables...")
    initialize_supabase_tables()
    
    print("\nNOTE: Make sure you've created the tables in Supabase before running this migration!")
    print("You can find the SQL script in server/supabase_migrations/create_tables.sql\n")
    
    choice = input("Do you want to proceed with migration? (y/n): ")
    if choice.lower() != 'y':
        print("Migration cancelled")
        return
    
    print("\nStarting migration...")
    video_count = migrate_video_processing()
    dubbing_count = migrate_language_dubbing()
    
    print("\nMigration completed!")
    print(f"Migrated {video_count} video processing records")
    print(f"Migrated {dubbing_count} language dubbing records")
    print("\nPlease verify your data in Supabase before deploying.")

if __name__ == "__main__":
    main() 