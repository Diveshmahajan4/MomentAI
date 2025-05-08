from django.urls import path
from .views import ShortsGeneratorView, VideoProcessingStatusView, UserVideosView, LanguageDubbingView, DubbingStatusView, UserDubbingsView
from . import views

urlpatterns = [
    path('shorts/', ShortsGeneratorView.as_view(), name='generate-shorts'),
    path('shorts/status/<int:processing_id>/', VideoProcessingStatusView.as_view(), name='processing-status'),
    path('shorts/user/<str:username>/', UserVideosView.as_view(), name='user-videos'),
    
    # Language dubbing endpoints
    path('dubbing/', LanguageDubbingView.as_view(), name='dub-video'),
    path('dubbing/status/<int:dubbing_id>/', DubbingStatusView.as_view(), name='dubbing-status'),
    path('dubbing/user/<str:username>/', UserDubbingsView.as_view(), name='user-dubbings'),
    path('instagram/upload/', views.upload_to_instagram, name='instagram-upload'),
] 