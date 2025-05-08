"use client"

import * as React from "react"
import { Play, Share2, Download, Pause, Volume2, VolumeX, Globe } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Slider } from "@/components/ui/slider"
import { InstagramUploadModal } from "@/components/instagram-upload-modal"

interface Clip {
  clip_number: number
  url: string
}

interface ApiResponse {
  message: string
  video_path: string
  clips: Clip[]
}

interface ReelsResultsProps {
  apiResponse: ApiResponse | null
}

export function ReelsResults({ apiResponse }: ReelsResultsProps) {
  const [currentPlayingIndex, setCurrentPlayingIndex] = React.useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const [videoDurations, setVideoDurations] = React.useState<number[]>([])
  const [currentTimes, setCurrentTimes] = React.useState<number[]>([])
  const [isMuted, setIsMuted] = React.useState<boolean[]>([])
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([])
  const { toast } = useToast()
  const router = useRouter()

  // Initialize state arrays when clips change
  React.useEffect(() => {
    if (apiResponse?.clips) {
      setVideoDurations(new Array(apiResponse.clips.length).fill(0))
      setCurrentTimes(new Array(apiResponse.clips.length).fill(0))
      setIsMuted(new Array(apiResponse.clips.length).fill(false))
    }
  }, [apiResponse?.clips])
  
  // Update current time during playback
  const handleTimeUpdate = (index: number) => {
    const video = videoRefs.current[index]
    if (video) {
      setCurrentTimes(prev => {
        const updated = [...prev]
        updated[index] = video.currentTime
        return updated
      })
    }
  }
  
  // Get video duration when loaded
  const handleLoadedMetadata = (index: number) => {
    const video = videoRefs.current[index]
    if (video) {
      setVideoDurations(prev => {
        const updated = [...prev]
        updated[index] = video.duration
        return updated
      })
    }
  }

  // Function to handle play button click
  const handlePlay = (index: number) => {
    // Pause any currently playing video
    if (currentPlayingIndex !== null && currentPlayingIndex !== index) {
      const currentVideo = videoRefs.current[currentPlayingIndex]
      if (currentVideo) {
        currentVideo.pause()
      }
    }
    
    // Play the selected video
    const video = videoRefs.current[index]
    if (video) {
      if (video.paused) {
        video.play()
          .then(() => {
            setCurrentPlayingIndex(index)
          })
          .catch(error => {
            console.error("Error playing video:", error)
            toast({
              title: "Playback error",
              description: "Could not play this video. Try again.",
              variant: "destructive"
            })
          })
      } else {
        video.pause()
        setCurrentPlayingIndex(null)
      }
    }
  }

  // Function to handle download
  const handleDownload = (url: string, clipNumber: number) => {
    // Create a temporary anchor element
    const a = document.createElement('a')
    a.href = url
    a.download = `clip-${clipNumber}.mp4`
    a.style.display = 'none'
    document.body.appendChild(a)
    
    // Trigger download and cleanup
    a.click()
    
    // Delay removal to ensure download starts
    setTimeout(() => {
      document.body.removeChild(a)
    }, 100)
    
    // Show success toast
    toast({
      title: "Download started",
      description: `Clip ${clipNumber} is being downloaded`,
    })
  }
  
  // Function to handle translation
  const handleTranslate = (url: string) => {
    // Navigate to the translate page with the video URL as a query parameter
    router.push(`/translate?videoUrl=${encodeURIComponent(url)}`);
    
    toast({
      title: "Opening translator",
      description: "Redirecting to the translation page",
    });
  }
  
  // Handle seek in progress bar
  const handleSeek = (index: number, value: number[]) => {
    const video = videoRefs.current[index]
    if (video) {
      video.currentTime = value[0]
    }
  }
  
  // Toggle mute for a specific video
  const toggleMute = (index: number) => {
    const video = videoRefs.current[index]
    if (video) {
      const newMutedState = !video.muted
      video.muted = newMutedState
      setIsMuted(prev => {
        const updated = [...prev]
        updated[index] = newMutedState
        return updated
      })
    }
  }
  
  // Format time for display (MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  if (!apiResponse || !apiResponse.clips || apiResponse.clips.length === 0) return null

  // Set up videoRefs array based on clips length
  if (videoRefs.current.length !== apiResponse.clips.length) {
    videoRefs.current = Array(apiResponse.clips.length).fill(null)
  }

  return (
    <div id="results-section" className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Generated Shorts</h2>
        <p className="text-muted-foreground">
          {apiResponse.clips.length} shorts generated successfully
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {apiResponse.clips.map((clip, index) => (
          <Card 
            key={`clip-${clip.clip_number}`} 
            className="overflow-hidden"
          >
            <CardHeader className="p-0">
              <div 
                className="relative aspect-video bg-muted"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={clip.url}
                  className="h-full w-full object-cover cursor-pointer"
                  onEnded={() => setCurrentPlayingIndex(null)}
                  onTimeUpdate={() => handleTimeUpdate(index)}
                  onLoadedMetadata={() => handleLoadedMetadata(index)}
                  playsInline
                  onClick={() => handlePlay(index)}
                />
                
                {/* Play/Pause overlay button - only show when not playing */}
                {currentPlayingIndex !== index && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlay(index)
                    }}
                  >
                    <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full opacity-80 hover:opacity-100">
                      <Play className="h-6 w-6" />
                    </Button>
                  </div>
                )}
                
                {/* Video controls - show when hovered or playing */}
                {(hoveredIndex === index || currentPlayingIndex === index) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex flex-col gap-2">
                      {/* Progress bar */}
                      <Slider
                        value={[currentTimes[index] || 0]}
                        max={videoDurations[index] || 100}
                        step={0.1}
                        onValueChange={(values) => handleSeek(index, values)}
                        className="h-1"
                      />
                      
                      {/* Controls row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Play/Pause button */}
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 rounded-full text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePlay(index)
                            }}
                          >
                            {currentPlayingIndex === index ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          
                          {/* Volume button */}
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 rounded-full text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMute(index)
                            }}
                          >
                            {isMuted[index] ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {/* Time display */}
                        <span className="text-xs text-white">
                          {formatTime(currentTimes[index] || 0)} / {formatTime(videoDurations[index] || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex justify-between items-center">
              <CardTitle className="line-clamp-2 text-base">Clip {clip.clip_number}</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  navigator.clipboard.writeText(clip.url)
                  toast({
                    title: "Link copied",
                    description: "Video link copied to clipboard",
                  })
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between p-2 pt-0">
              <div className="flex flex-col space-x-1 space-y-1 w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.preventDefault()
                    handleDownload(clip.url, clip.clip_number)
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    handleTranslate(clip.url)
                  }}
                >
                  <Globe className="mr-1 h-4 w-4" />
                  Translate
                </Button>
                <InstagramUploadModal 
                  videoPath={clip.url}
                  onSuccess={() => {
                    toast({
                      title: "Success",
                      description: "Video uploaded to Instagram successfully!",
                    })
                  }}
                />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

