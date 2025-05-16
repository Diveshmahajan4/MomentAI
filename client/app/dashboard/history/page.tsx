"use client"

import React, { useEffect, useState } from "react"
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
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Video, Edit as EditIcon, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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
  error_message?: string | null
}

interface User {
  name: string
  email: string
  avatar: string
}

export default function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [parsedUser, setParsedUser] = useState<User>({
      name: "John Doe",
      email: "john@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
  })
  const [userVideos, setUserVideos] = useState<ProcessingData[]>([])
  const [username, setUsername] = useState("")
  const { toast } = useToast()
  const supabase = createClient()
  const [selectedVideo, setSelectedVideo] = useState<ProcessingData | null>(null)
  const router = useRouter()
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (user) {
          const parsedUser :User = {
            name: user.user_metadata?.full_name ?? "Jane Doe",
            email: user.email ?? "janedoe@gmail.com",
            avatar: user.user_metadata?.avatar_url ?? '/default-avatar.png',
          }
          setParsedUser(parsedUser);
          const userEmail = user.email || "Unknown User";
          setUsername(userEmail);
          
          // Once we have the username, fetch the user's videos
          await fetchUserVideos(userEmail);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleTranslate = (url: string) => {
    // Navigate to the translate page with the video URL as a query parameter
    router.push(`/translate?videoUrl=${encodeURIComponent(url)}`);
    
    toast({
      title: "Opening translator",
      description: "Redirecting to the translation page",
    });
  }
  
  // Function to fetch user's videos
  const fetchUserVideos = async (userEmail: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8000/api/shorts/user/${encodeURIComponent(userEmail)}/`);
      
      if (response.ok) {
        const videos = await response.json();
        // Sort by creation date - newest first
        const sortedVideos = videos.sort((a: ProcessingData, b: ProcessingData) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setUserVideos(sortedVideos);
      } else {
        console.error("Failed to fetch user videos");
        toast({
          title: "Failed to load history",
          description: "Could not load your processing history",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching user videos:", error);
      toast({
        title: "Failed to load history",
        description: "Could not load your processing history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary">Processing</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  // Group videos by date
  const groupedVideos = userVideos.reduce<Record<string, ProcessingData[]>>((groups, video) => {
    const date = new Date(video.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(video);
    return groups;
  }, {});

  // Function to extract video ID from YouTube URL
  const getYouTubeVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1);
      }
      
      if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        if (urlObj.pathname === '/watch') {
          return urlObj.searchParams.get('v');
        }
        
        if (urlObj.pathname.startsWith('/embed/') || urlObj.pathname.startsWith('/v/')) {
          return urlObj.pathname.split('/')[2];
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Function to get YouTube thumbnail URL
  const getYouTubeThumbnail = (url: string): string => {
    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return '/placeholder-video.jpg'; // Fallback image
  };
  
  // Function to get a simplified title from the URL
  const getVideoTitle = (url: string): string => {
    try {
      const videoId = getYouTubeVideoId(url);
      if (videoId) {
        // For YouTube, we're extracting what might be a title from the URL path
        // In a real app, you'd probably get this from YouTube API or store it when processing
        const urlObj = new URL(url);
        if (urlObj.pathname.includes('watch') && urlObj.searchParams.has('v')) {
          return `YouTube Video (${videoId})`;
        }
        return `YouTube Video (${videoId})`;
      }
      
      // For other URLs, just show the filename or domain
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      if (lastPart && lastPart !== '') {
        return lastPart;
      }
      
      return urlObj.hostname;
    } catch (error) {
      return 'Unknown Video';
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar user={parsedUser} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Processing History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Processing History</h1>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-10">
                <p>Loading your history...</p>
              </div>
            ) : userVideos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-10">
                  <Video className="h-16 w-16 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold">No videos processed yet</h3>
                  <p className="text-muted-foreground">
                    Start creating shorts from your podcasts to see your history here
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/dashboard">
                      Create Your First Short
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Video Details Modal */}
                {selectedVideo && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
                    <Card className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                      <CardHeader>
                        <CardTitle>Video Processing Details</CardTitle>
                        <CardDescription>
                          Created on {formatDate(selectedVideo.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium">Source</h3>
                            <div className="flex items-start gap-3 mt-1">
                              <div className="w-24 h-14 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                <img 
                                  src={getYouTubeThumbnail(selectedVideo.youtube_url)} 
                                  alt="Video thumbnail" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLImageElement).src = '/placeholder-video.jpg';
                                  }}
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {getVideoTitle(selectedVideo.youtube_url)}
                                </span>
                                <a href={selectedVideo.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 flex items-center text-sm">
                                  Original Video <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-medium">Status</h3>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(selectedVideo.status)}
                              {selectedVideo.error_message && <span className="text-red-500 text-sm">{selectedVideo.error_message}</span>}
                            </div>
                          </div>
                          
                          {selectedVideo.status === 'COMPLETED' && selectedVideo.cloudinary_urls && (
                            <div>
                              <h3 className="font-medium mb-2">Generated Clips ({selectedVideo.cloudinary_urls.length})</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedVideo.cloudinary_urls.map((clip, index) => (
                                  <div key={clip.public_id} className="flex-col justify-center items-center border rounded-md p-2">
                                    <video 
                                      src={clip.url} 
                                      className="w-full h-36 object-cover rounded-md mb-2" 
                                      controls 
                                    />
                                    <div className="flex justify-between items-center">
                                      <span>Clip {index + 1}</span>
                                      <div className="flex gap-2">
                                        <a 
                                          href={clip.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-blue-500 text-sm"
                                        >
                                        <Button variant="outline">
                                          View
                                        </Button>
                                        </a>
                                        <Link
                                          href={`/dashboard/edit?id=${selectedVideo.id}&clip=${index}`}
                                          className="text-blue-500 text-sm ml-2"
                                        >
                                          <Button variant="outline">
                                          Edit
                                        </Button>
                                        </Link>
                                        <Button variant="outline" className="text-blue-500 text-sm" onClick={() => handleTranslate(clip.url)}>
                                          Translate
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSelectedVideo(null)}>Close</Button>
                        {selectedVideo.status === 'COMPLETED' && (
                          <>
                            <Button asChild variant="outline">
                              <Link href={`/dashboard/edit?id=${selectedVideo.id}`}>
                                <EditIcon className="h-4 w-4 mr-2" />
                                Edit Video
                              </Link>
                            </Button>
                            <Button asChild>
                              <Link href={`/dashboard?id=${selectedVideo.id}`}>View in Dashboard</Link>
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  </div>
                )}
                
                {/* History Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Processing History</CardTitle>
                    <CardDescription>
                      View all your previous video processing requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.entries(groupedVideos).map(([date, videos]) => (
                      <div key={date} className="mb-8">
                        <h3 className="text-lg font-medium mb-3">{formatDate(date)}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Source</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Clips</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {videos.map((video) => (
                              <TableRow key={video.id}>
                                <TableCell className="min-w-[200px]">
                                  <div className="flex items-center gap-3">
                                    <div className="w-16 h-9 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                      <img 
                                        src={getYouTubeThumbnail(video.youtube_url)} 
                                        alt="Video thumbnail" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          // Fallback if image fails to load
                                          (e.target as HTMLImageElement).src = '/placeholder-video.jpg';
                                        }}
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium truncate max-w-[150px]">
                                        {getVideoTitle(video.youtube_url)}
                                      </span>
                                      <a 
                                        href={video.youtube_url} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline"
                                      >
                                        Source Link
                                      </a>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(video.status)}</TableCell>
                                <TableCell>{formatDate(video.created_at)}</TableCell>
                                <TableCell>
                                  {video.status === 'COMPLETED' ? 
                                    (video.cloudinary_urls?.length || 0) : 
                                    '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setSelectedVideo(video)}
                                    >
                                      View Details
                                    </Button>
                                    {video.status === 'COMPLETED' && (
                                      <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <Link href={`/dashboard/edit?id=${video.id}`}>
                                          <EditIcon className="h-4 w-4 mr-2" />
                                          Edit
                                        </Link>
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => handleTranslate(video.youtube_url)}>
                                        <Globe className="h-4 w-4 mr-2"/>
                                        Translate
                                      </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 