from rest_framework import serializers
from .models import VideoProcessing, LanguageDubbing

class VideoProcessingSerializer(serializers.ModelSerializer):
    cloudinary_urls = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoProcessing
        fields = ['id', 'username', 'youtube_url', 'status', 'cloudinary_url', 
                  'cloudinary_urls', 'num_shorts', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'cloudinary_url', 'cloudinary_urls', 
                            'created_at', 'updated_at']
    
    def get_cloudinary_urls(self, obj):
        """Return all cloudinary URLs for this processing task"""
        return obj.cloudinary_urls

class VideoRequestSerializer(serializers.Serializer):
    url = serializers.URLField(required=True)
    username = serializers.CharField(required=True, max_length=100)
    num_shorts = serializers.IntegerField(required=False, default=1, min_value=1, max_value=5)
    add_captions = serializers.BooleanField(required=False, default=True)

class LanguageDubbingSerializer(serializers.ModelSerializer):
    cloudinary_urls = serializers.SerializerMethodField()
    
    class Meta:
        model = LanguageDubbing
        fields = ['id', 'username', 'video_url', 'source_language', 'target_language',
                 'voice', 'status', 'cloudinary_url', 'cloudinary_urls', 
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'cloudinary_url', 'cloudinary_urls', 
                           'created_at', 'updated_at']
    
    def get_cloudinary_urls(self, obj):
        """Return all cloudinary URLs for this dubbing task"""
        return obj.cloudinary_urls

class DubbingRequestSerializer(serializers.Serializer):
    url = serializers.URLField(required=True)
    username = serializers.CharField(required=True, max_length=100)
    source_language = serializers.CharField(required=False, default='English', max_length=50)
    target_language = serializers.CharField(required=False, default='Hindi', max_length=50)
    voice = serializers.ChoiceField(
        required=False,
        default='alloy',
        choices=[choice[0] for choice in LanguageDubbing.VOICE_CHOICES]
    )
    add_captions = serializers.BooleanField(required=False, default=True) 