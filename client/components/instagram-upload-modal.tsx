import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Instagram } from "lucide-react"

interface InstagramUploadModalProps {
  videoPath: string
  onSuccess?: () => void
}

export function InstagramUploadModal({ videoPath, onSuccess }: InstagramUploadModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [caption, setCaption] = useState("")
  const { toast } = useToast()

  const handleUpload = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/api/instagram/upload/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_path: videoPath,
          username,
          password,
          caption,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload to Instagram")
      }

      toast({
        title: "Success",
        description: "Video uploaded to Instagram successfully!",
      })

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload to Instagram",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Instagram className="mr-2 h-4 w-4" />
          Upload to Instagram
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload to Instagram</DialogTitle>
          <DialogDescription>
            Enter your Instagram credentials to upload the video as a reel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Instagram Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your Instagram username"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Instagram Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Instagram password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter a caption for your reel"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={loading || !username || !password}
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 