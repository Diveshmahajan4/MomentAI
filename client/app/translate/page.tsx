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
import { TranslationForm } from "@//components/translation-form"
import { TranslationResults } from "@//components/translation-results"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { History, Globe, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

interface DubbingData {
  id: string
  username: string
  video_url: string
  source_language: string
  target_language: string
  voice: string
  status: string
  cloudinary_url: string | null
  cloudinary_urls: Array<{ url: string, public_id: string }>
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
  processing: DubbingData
}

// Client component that handles URL parameters
function TranslatePageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [parsedUser, setParsedUser] = useState<User>({
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=32&width=32",
  })
  const [userDubbings, setUserDubbings] = useState<DubbingData[]>([])
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
          
          // If we have an ID from URL, fetch that specific dubbing
          if (idFromUrl) {
            await fetchDubbingById(idFromUrl);
          } else {
            // Otherwise fetch all user dubbings
            await fetchUserDubbings(userEmail);
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

  // Function to fetch a specific dubbing by ID
  const fetchDubbingById = async (id: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`http://localhost:8000/api/dubbing/status/${id}/`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'COMPLETED') {
          setApiResponse({
            message: "Retrieved dubbing",
            processing: data
          });
        }
        
        // Also fetch all dubbings to keep the list updated
        if (username) {
          await fetchUserDubbings(username);
        }
      } else {
        console.error("Failed to fetch dubbing by ID");
        toast({
          title: "Failed to load dubbing",
          description: "Could not load the requested dubbing",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching dubbing by ID:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Function to fetch user's dubbings
  const fetchUserDubbings = async (userEmail: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`http://localhost:8000/api/dubbing/user/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: userEmail }),
      });
      
      if (response.ok) {
        const dubbings = await response.json();
        setUserDubbings(dubbings);
        
        // If there are completed dubbings, set the latest one as the current dubbing
        // (only if we're not already loading a specific dubbing by ID)
        if (!idFromUrl) {
          const completedDubbings = dubbings.filter((dubbing: DubbingData) => dubbing.status === 'COMPLETED');
          
          if (completedDubbings.length > 0) {
            // Sort by updated_at to get the most recent one
            const latestDubbing = completedDubbings.sort((a: DubbingData, b: DubbingData) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0];
            
            // Set the latest dubbing as the current dubbing
            setApiResponse({
              message: "Retrieved previous dubbing",
              processing: latestDubbing
            });
          }
        }
      } else {
        console.error("Failed to fetch user dubbings");
      }
    } catch (error) {
      console.error("Error fetching user dubbings:", error);
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
        const response = await fetch(`http://localhost:8000/api/dubbing/status/${processingId}/`);
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
          
          // Update our list of user dubbings to include this new one
          setUserDubbings(prevDubbings => {
            const exists = prevDubbings.some(dubbing => dubbing.id === data.id);
            if (exists) {
              return prevDubbings.map(dubbing => 
                dubbing.id === data.id ? data : dubbing
              );
            } else {
              return [...prevDubbings, data];
            }
          });
          
          // Clear the interval when completed
          clearInterval(interval);
          
          toast({
            title: "Translation completed!",
            description: "Your video has been successfully translated and dubbed.",
          });
        } else if (data.status === 'FAILED') {
          toast({
            title: "Translation failed",
            description: "There was an error processing your video.",
            variant: "destructive",
          });
          
          // Clear the interval when failed
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error fetching status update:", error);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [processingId, processingStatus]);

  const handleTranslationSubmit = async (
    url: string, 
    sourceLanguage: string, 
    targetLanguage: string, 
    voice: string, 
    addCaptions: boolean
  ) => {
    try {
      setIsSubmitting(true)
      setIsLoading(true)
      
      const response = await fetch('http://localhost:8000/api/dubbing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          username,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          voice,
          add_captions: addCaptions
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Translation response:', data);
      
      setApiResponse(data);
      setProcessingId(data.processing.id);
      setProcessingStatus(data.processing.status);
      
      toast({
        title: "Translation started",
        description: `Your video is being translated from ${sourceLanguage} to ${targetLanguage}`,
      });
      
      await fetchUserDubbings(username);
      
    } catch (error) {
      console.error('Error submitting translation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit translation request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false)
    }
  };

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
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dubbing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/translate/history">
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Link>
              </Button>
            </div>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold tracking-tight">Translation & Dubbing</h1>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <TranslationForm 
                  onSubmit={handleTranslationSubmit} 
                  isLoading={isSubmitting}
                />
              </div>
              <div>
                <TranslationResults 
                  dubbing={apiResponse?.processing || null} 
                  isLoading={isLoadingHistory && !apiResponse}
                />
              </div>
            </div>
            {userDubbings.filter(d => d.status === 'COMPLETED').length > 0 && (
              <div className="mt-6">
                <h2 className="mb-4 text-lg font-semibold">Recent Translations</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {userDubbings
                    .filter(dubbing => dubbing.status === 'COMPLETED')
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 4)
                    .map(dubbing => (
                      <Link 
                        key={dubbing.id} 
                        href={`/translate?id=${dubbing.id}`}
                        className="block overflow-hidden rounded-lg border bg-background p-2 transition-colors hover:bg-accent/50"
                      >
                        <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                          {dubbing.cloudinary_urls && dubbing.cloudinary_urls.length > 0 && (
                            <div className="relative h-full w-full">
                              <video 
                                src={dubbing.cloudinary_urls[0].url}
                                className="object-cover"
                                poster={`https://res.cloudinary.com/demo/video/upload/w_700/q_auto/l_play,w_100/fl_layer_apply,g_center/${dubbing.cloudinary_urls[0].public_id}.jpg`}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Globe className="h-8 w-8 text-white opacity-80" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <h3 className="line-clamp-1 text-sm font-medium">
                            {dubbing.source_language} → {dubbing.target_language}
                          </h3>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {new Date(dubbing.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Main page component with Suspense boundary
export default function TranslatePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TranslatePageContent />
    </Suspense>
  )
} 