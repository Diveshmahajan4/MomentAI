from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import VideoProcessing, LanguageDubbing
from .serializers import VideoProcessingSerializer, VideoRequestSerializer, LanguageDubbingSerializer, DubbingRequestSerializer
from .tasks import start_processing_video, start_dubbing_process
from Components.Instagram import InstagramUploader
from rest_framework.decorators import api_view

# Create your views here.

class ShortsGeneratorView(APIView):
    """
    API endpoint to generate short videos from YouTube URLs
    """
    
    def post(self, request, format=None):
        serializer = VideoRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            url = serializer.validated_data['url']
            username = serializer.validated_data['username']
            num_shorts = serializer.validated_data.get('num_shorts', 1)
            add_captions = serializer.validated_data.get('add_captions', True)
            
            # Create a new video processing record
            video_processing = VideoProcessing.objects.create(
                youtube_url=url,
                username=username,
                num_shorts=num_shorts,
                status='PENDING',
                add_captions=add_captions
            )
            
            # Start processing in the background
            start_processing_video(video_processing.id)
            
            # Return the processing record with a 202 Accepted status
            response_serializer = VideoProcessingSerializer(video_processing)
            return Response(
                {
                    'message': f'Video processing started for {num_shorts} shorts',
                    'processing': response_serializer.data
                }, 
                status=status.HTTP_202_ACCEPTED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class VideoProcessingStatusView(APIView):
    """
    API endpoint to check the status of a video processing task
    """
    
    def get(self, request, processing_id, format=None):
        try:
            video_processing = VideoProcessing.objects.get(id=processing_id)
            serializer = VideoProcessingSerializer(video_processing)
            return Response(serializer.data)
        except VideoProcessing.DoesNotExist:
            return Response(
                {'error': 'Processing task not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class UserVideosView(APIView):
    """
    API endpoint to get all videos for a specific user
    """
    
    def get(self, request, username, format=None):
        videos = VideoProcessing.objects.filter(username=username)
        serializer = VideoProcessingSerializer(videos, many=True)
        return Response(serializer.data)

class LanguageDubbingView(APIView):
    """
    API endpoint to translate and dub videos from one language to another
    """
    
    def post(self, request, format=None):
        serializer = DubbingRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            url = serializer.validated_data['url']
            username = serializer.validated_data['username']
            source_language = serializer.validated_data.get('source_language', 'English')
            target_language = serializer.validated_data.get('target_language', 'Hindi')
            voice = serializer.validated_data.get('voice', 'alloy')
            add_captions = serializer.validated_data.get('add_captions', True)
            
            # Create a new language dubbing record
            dubbing = LanguageDubbing.objects.create(
                video_url=url,
                username=username,
                source_language=source_language,
                target_language=target_language,
                voice=voice,
                status='PENDING',
                add_captions=add_captions
            )
            
            # Start processing in the background
            start_dubbing_process(dubbing.id)
            
            # Return the processing record with a 202 Accepted status
            response_serializer = LanguageDubbingSerializer(dubbing)
            return Response(
                {
                    'message': f'Language dubbing started from {source_language} to {target_language}',
                    'processing': response_serializer.data
                }, 
                status=status.HTTP_202_ACCEPTED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DubbingStatusView(APIView):
    """
    API endpoint to check the status of a language dubbing task
    """
    
    def get(self, request, dubbing_id, format=None):
        try:
            dubbing = LanguageDubbing.objects.get(id=dubbing_id)
            serializer = LanguageDubbingSerializer(dubbing)
            return Response(serializer.data)
        except LanguageDubbing.DoesNotExist:
            return Response(
                {'error': 'Dubbing task not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class UserDubbingsView(APIView):
    """
    API endpoint to get all language dubbing tasks for a specific user
    """
    
    def get(self, request, username, format=None):
        dubbings = LanguageDubbing.objects.filter(username=username)
        serializer = LanguageDubbingSerializer(dubbings, many=True)
        return Response(serializer.data)

@api_view(['POST'])
def upload_to_instagram(request):
    try:
        video_url = request.data.get('video_path')  # This is now a Cloudinary URL
        caption = request.data.get('caption', '')
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not all([video_url, username, password]):
            return Response({
                'error': 'Missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        uploader = InstagramUploader()
        
        # Login to Instagram
        if not uploader.login(username, password):
            return Response({
                'error': 'Instagram login failed'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        # Upload the reel (now handles Cloudinary URL internally)
        result = uploader.upload_reel(video_url, caption)
        
        if result:
            return Response({
                'message': 'Reel uploaded successfully',
                'data': "Video uploaded to Instagram successfully!"
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Failed to upload reel'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)