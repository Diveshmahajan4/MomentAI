"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Globe, Download, RefreshCw, Share2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface TranslationResultsProps {
  dubbing: {
    id: string;
    username: string;
    video_url: string;
    source_language: string;
    target_language: string;
    voice: string;
    status: string;
    cloudinary_url: string | null;
    cloudinary_urls: Array<{ url: string, public_id: string }>;
    created_at: string;
    updated_at: string;
  } | null;
  isLoading: boolean;
  onRetry?: () => void;
}

export function TranslationResults({ dubbing, isLoading, onRetry }: TranslationResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="h-[300px] w-full rounded-lg mb-4" />
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!dubbing || !dubbing.cloudinary_urls?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Translation Results</CardTitle>
          <CardDescription>
            Submit a video URL for translation and dubbing to see results here
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const handleDownload = (url: string) => {
    window.open(url, '_blank')
  }

  const handleShare = (url: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Translated Video',
        url
      })
    } else {
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('Link copied to clipboard!')
        })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="flex-col justify-center items-center">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <span>Translated Video</span>
                <Badge variant={dubbing.status === 'COMPLETED' ? 'success' : 'secondary'}>
                  {dubbing.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {dubbing.source_language} to {dubbing.target_language} using {dubbing.voice} voice •
                {dubbing.updated_at ? ` ${formatDistanceToNow(new Date(dubbing.updated_at), { addSuffix: true })}` : ''}
              </CardDescription>
            </div>
            {dubbing.status === 'COMPLETED' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare(dubbing.cloudinary_urls[0].url)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDownload(dubbing.cloudinary_urls[0].url)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className=" w-[40%]">
          {dubbing.status === 'COMPLETED' && dubbing.cloudinary_urls?.length > 0 ? (
            <div className="relative w-full aspect-[9/16] overflow-hidden rounded-lg bg-black flex justify-center items-center">
              <video
                src={dubbing.cloudinary_urls[0].url}
                controls
                className="absolute inset-0 w-full h-full object-cover"
                poster={`https://res.cloudinary.com/demo/video/upload/w_700/q_auto/l_play,w_100/fl_layer_apply,g_center/${dubbing.cloudinary_urls[0].public_id}.jpg`}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-muted/20 rounded-lg">
              <div className="text-center p-6">
                <Globe className="h-10 w-10 mb-4 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Processing Translation</h3>
                <p className="text-sm text-muted-foreground">
                  {dubbing.status === 'PENDING' ? 'Waiting to start translation...' :
                    dubbing.status === 'PROCESSING' ? 'Your video is being translated and dubbed...' :
                      dubbing.status === 'FAILED' ? 'Translation failed. Please try again.' :
                        'Processing...'}
                </p>
                {dubbing.status === 'FAILED' && onRetry && (
                  <Button variant="outline" className="mt-4" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
        {dubbing.status === 'COMPLETED' && dubbing.cloudinary_urls?.length > 0 && (
          <CardFooter className="p-4 border-t">
            <div className="text-sm text-muted-foreground max-w-sm">
              <span>Original URL: </span>
              <a
                href={dubbing.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-blue-500 block max-w-full truncate"
              >
                {dubbing.video_url}
              </a>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
} 