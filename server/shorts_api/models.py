from django.db import models
import json

# Create your models here.

class VideoProcessing(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )
    
    username = models.CharField(max_length=100, default='anonymous')
    youtube_url = models.URLField()
    original_video_path = models.CharField(max_length=512, blank=True, null=True)
    final_video_path = models.CharField(max_length=512, blank=True, null=True)
    cloudinary_url = models.URLField(blank=True, null=True)
    cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True)
    num_shorts = models.PositiveIntegerField(default=1)
    cloudinary_urls_json = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    add_captions = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Video Processing: {self.username} - {self.youtube_url} - {self.status}"

    @property
    def cloudinary_urls(self):
        """Get list of all cloudinary URLs for this processing task"""
        if not self.cloudinary_urls_json:
            return []
        return json.loads(self.cloudinary_urls_json)
    
    def add_cloudinary_url(self, url, public_id):
        """Add a cloudinary URL to the list"""
        urls = self.cloudinary_urls if self.cloudinary_urls_json else []
        urls.append({
            'url': url,
            'public_id': public_id
        })
        self.cloudinary_urls_json = json.dumps(urls)
        # Also update the main cloudinary_url with the first URL for backward compatibility
        if not self.cloudinary_url and url:
            self.cloudinary_url = url
            self.cloudinary_public_id = public_id
        self.save()

    class Meta:
        ordering = ['-created_at']

class LanguageDubbing(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )
    
    VOICE_CHOICES = (
        ('alloy', 'Alloy'),
        ('echo', 'Echo'),
        ('fable', 'Fable'),
        ('onyx', 'Onyx'),
        ('nova', 'Nova'),
        ('shimmer', 'Shimmer'),
    )
    
    username = models.CharField(max_length=100, default='anonymous')
    video_url = models.URLField(help_text="URL of the video to be dubbed")
    source_language = models.CharField(max_length=50, default='English')
    target_language = models.CharField(max_length=50, default='Hindi')
    voice = models.CharField(max_length=20, choices=VOICE_CHOICES, default='alloy')
    original_video_path = models.CharField(max_length=512, blank=True, null=True)
    dubbed_video_path = models.CharField(max_length=512, blank=True, null=True)
    cloudinary_url = models.URLField(blank=True, null=True)
    cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True)
    cloudinary_urls_json = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    add_captions = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Language Dubbing: {self.username} - {self.source_language} to {self.target_language} - {self.status}"
    
    @property
    def cloudinary_urls(self):
        """Get list of all cloudinary URLs for this dubbing task"""
        if not self.cloudinary_urls_json:
            return []
        return json.loads(self.cloudinary_urls_json)
    
    def add_cloudinary_url(self, url, public_id):
        """Add a cloudinary URL to the list"""
        urls = self.cloudinary_urls if self.cloudinary_urls_json else []
        urls.append({
            'url': url,
            'public_id': public_id
        })
        self.cloudinary_urls_json = json.dumps(urls)
        # Also update the main cloudinary_url with the first URL for backward compatibility
        if not self.cloudinary_url and url:
            self.cloudinary_url = url
            self.cloudinary_public_id = public_id
        self.save()
    
    class Meta:
        ordering = ['-created_at']
