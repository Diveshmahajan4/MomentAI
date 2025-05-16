"use client"

import React, { useEffect, useState, Suspense } from "react"
import { AppSidebar } from "@//components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@//components/ui/breadcrumb"
import { Separator } from "@//components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@//components/ui/sidebar"
import { PodcastForm } from "@//components/podcast-form"
import { ReelsResults } from "@//components/reels-results"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { History, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

interface ProcessingData {
  id: string
  username: string
  youtube_url: string
  status: string
  cloudinary_url: string | null
  cloudinary_urls: Array<{ url: string, public_id: string }>
  num_shorts: number
  created_at: string
  updated_at: string
}

interface User {
  name: string
  email: string
  avatar: string
} 

interface ApiResponse {
  message: string
  processing: ProcessingData
}

// Client component that handles URL parameters
function DashboardContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [parsedUser, setParsedUser] = useState<User>({
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=32&width=32",
  })
  const [userVideos, setUserVideos] = useState<ProcessingData[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const idFromUrl = searchParams.get('id')

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (user) {
          console.log("User fetched:", user);
          const parsedUser :User = {
            name: user.user_metadata?.full_name ?? "Jane Doe",
            email: user.email ?? "janedoe@gmail.com",
            avatar: user.user_metadata?.avatar_url ?? '/default-avatar.png',
          }
          setParsedUser(parsedUser);
          const userEmail = user.email || "Unknown User";
          setUsername(userEmail);
          
          // If we have an ID from URL, fetch that specific processing
          if (idFromUrl) {
            await fetchProcessingById(idFromUrl);
          } else {
            // Otherwise fetch all user videos
            await fetchUserVideos(userEmail);
          }
        } else {
          setIsLoadingHistory(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setIsLoadingHistory(false);
      }
    };

    fetchUser();
  }, [idFromUrl]);

  // Function to fetch a specific processing by ID
  const fetchProcessingById = async (id: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`http://localhost:8000/api/shorts/status/${id}/`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'COMPLETED') {
          setApiResponse({
            message: "Retrieved video",
            processing: data
          });
        }
        
        // Also fetch all videos to keep the list updated
        if (username) {
          await fetchUserVideos(username);
        }
      } else {
        console.error("Failed to fetch processing by ID");
        toast({
          title: "Failed to load video",
          description: "Could not load the requested video",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching processing by ID:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Function to fetch user's videos
  const fetchUserVideos = async (userEmail: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`http://localhost:8000/api/shorts/user/${encodeURIComponent(userEmail)}/`);
      
      if (response.ok) {
        const videos = await response.json();
        setUserVideos(videos);
        
        // If there are completed videos, set the latest one as the current video
        // (only if we're not already loading a specific video by ID)
        if (!idFromUrl) {
          const completedVideos = videos.filter((video: ProcessingData) => video.status === 'COMPLETED');
          
          if (completedVideos.length > 0) {
            // Sort by updated_at to get the most recent one
            const latestVideo = completedVideos.sort((a: ProcessingData, b: ProcessingData) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0];
            
            // Set the latest video as the current video
            setApiResponse({
              message: "Retrieved previous video",
              processing: latestVideo
            });
          }
        }
      } else {
        console.error("Failed to fetch user videos");
      }
    } catch (error) {
      console.error("Error fetching user videos:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Poll for status updates if we have a processing ID and status is not completed
  useEffect(() => {
    if (!processingId || processingStatus === 'COMPLETED' || processingStatus === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/shorts/status/${processingId}/`);
        const data = await response.json();
        
        setProcessingStatus(data.status);
        
        // Update the API response with the latest data
        if (data.status === 'COMPLETED') {
          setApiResponse(prev => {
            if (!prev) return null;
            return {
              ...prev,
              processing: data
            };
          });
          
          // Update our list of user videos to include this new one
          setUserVideos(prevVideos => {
            const exists = prevVideos.some(video => video.id === data.id);
            if (exists) {
              return prevVideos.map(video => 
                video.id === data.id ? data : video
              );
            } else {
              return [data, ...prevVideos];
            }
          });
          
          setIsLoading(false);
          clearInterval(interval);
          
          toast({
            title: 'Processing completed',
            description: "We've generated shorts from your podcast",
          });
        } else if (data.status === 'FAILED') {
          setIsLoading(false);
          clearInterval(interval);
          
          toast({
            title: 'Processing failed',
            description: data.error_message || 'Please try again later',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 5000); 

    return () => clearInterval(interval);
  }, [processingId, processingStatus, toast]);

  const handlePodcastSubmit = async (url: string, isYoutubeUrl: boolean, addCaptions: boolean, numShorts: number) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('http://localhost:8000/api/shorts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          username: username,
          num_shorts: numShorts,
          add_captions: addCaptions,
        }),
      })
  
      const data = await response.json()
      console.log('API Response:', data)
  
      if (response.ok) {
        setApiResponse(data)
        setProcessingId(data.processing.id)
        setProcessingStatus(data.processing.status)
        setUserVideos(prevVideos => [data.processing, ...prevVideos]);
        toast({
          title: 'Processing started',
          description: `Started processing ${data.processing.num_shorts} shorts from your podcast`,
        })
      } else {
        setIsLoading(false)
        toast({
          title: 'Something went wrong',
          description: data?.error || 'Please try again later',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('API Error:', error)
      setIsLoading(false)
      toast({
        title: 'Something went wrong',
        description: 'Please try again later',
        variant: 'destructive',
      })
    }
  }

  // Transform the backend API response format to the format expected by ReelsResults
  const transformedApiResponse = apiResponse && apiResponse.processing.status === 'COMPLETED' ? {
    message: apiResponse.message,
    video_path: apiResponse.processing.youtube_url,
    clips: apiResponse.processing.cloudinary_urls.map((item, index) => ({
      clip_number: index + 1,
      url: item.url
    }))
  } : null;

  return (
    <SidebarProvider>
      <AppSidebar user={parsedUser}/>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Podcast to Shorts</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild className="ml-auto">
                <Link href="/dashboard/history">
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Link>
              </Button>
            </div>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold tracking-tight">Create Shorts from Podcasts</h1>
            <PodcastForm onSubmit={handlePodcastSubmit} isLoading={isLoading} />
            {isLoadingHistory ? (
              <div className="mt-6 text-center">
                <p>Loading your videos...</p>
              </div>
            ) : (
              <>
                {processingStatus && processingStatus !== 'COMPLETED' && isLoading && (
                  <div className="mt-6 text-center">
                    <p className="text-lg font-medium">Processing your podcast...</p>
                    <p className="text-sm text-muted-foreground">Status: {processingStatus}</p>
                  </div>
                )}
                {transformedApiResponse && (
                  <div className="mt-6">
                    <ReelsResults apiResponse={transformedApiResponse} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Main page component with Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}