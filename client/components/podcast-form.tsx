"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Upload, Youtube } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"

const youtubeUrlSchema = z.object({
  youtubeUrl: z
    .string()
    .min(1, { message: "YouTube URL is required" })
    .url({ message: "Please enter a valid URL" })
    .refine(
      (url) => {
        // Basic YouTube URL validation
        return (
          url.includes("youtube.com/watch") ||
          url.includes("youtu.be/") ||
          url.includes("youtube.com/v/") ||
          url.includes("youtube.com/embed/")
        )
      },
      { message: "Please enter a valid YouTube URL" },
    ),
  addCaptions: z.boolean().default(true),
  numShorts: z.coerce.number().min(1, { message: "At least 1 short is required" }).max(10, { message: "Maximum 10 shorts allowed" }).default(1),
})

const fileUploadSchema = z.object({
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, { message: "Please select a file" })
    .refine((files) => files[0].size <= 20 * 1024 * 1024, {
      message: "File size must be less than 20MB",
    })
    .refine(
      (files) => {
        const file = files[0]
        return ["video/mp4", "video/avi", "video/quicktime"].includes(file.type)
      },
      { message: "File must be in MP4, AVI, or MOV format" },
    ),
  addCaptions: z.boolean().default(true),
  numShorts: z.coerce.number().min(1, { message: "At least 1 short is required" }).max(10, { message: "Maximum 10 shorts allowed" }).default(1),
})

interface PodcastFormProps {
  onSubmit: (url: string, isYoutubeUrl: boolean, addCaptions: boolean, numShorts: number) => Promise<void>;
  isLoading: boolean;
}

export function PodcastForm({ onSubmit, isLoading }: PodcastFormProps) {
  const [activeTab, setActiveTab] = React.useState("youtube")
  const { toast } = useToast()

  const youtubeForm = useForm<z.infer<typeof youtubeUrlSchema>>({
    resolver: zodResolver(youtubeUrlSchema),
    defaultValues: {
      youtubeUrl: "",
      addCaptions: true,
      numShorts: 1,
    },
  })

  const fileForm = useForm<z.infer<typeof fileUploadSchema>>({
    resolver: zodResolver(fileUploadSchema),
    defaultValues: {
      addCaptions: true,
      numShorts: 1,
    },
  })

  async function onYoutubeSubmit(values: z.infer<typeof youtubeUrlSchema>) {
    await onSubmit(values.youtubeUrl, true, values.addCaptions, values.numShorts);
  }

  async function onFileSubmit(values: z.infer<typeof fileUploadSchema>) {
    const fileURL = URL.createObjectURL(values.file[0]);
    await onSubmit(fileURL, false, values.addCaptions, values.numShorts);
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Tabs defaultValue="youtube" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="youtube">YouTube URL</TabsTrigger>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
        </TabsList>
        <TabsContent value="youtube" className="mt-6">
          <Form {...youtubeForm}>
            <form onSubmit={youtubeForm.handleSubmit(onYoutubeSubmit)} className="space-y-6">
              <FormField
                control={youtubeForm.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing
                            </>
                          ) : (
                            <>
                              <Youtube className="mr-2 h-4 w-4" />
                              Generate
                            </>
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Enter the URL of a YouTube podcast video</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={youtubeForm.control}
                name="numShorts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Shorts</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormDescription>How many shorts to generate (1-10)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={youtubeForm.control}
                name="addCaptions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Add Captions</FormLabel>
                      <FormDescription>
                        Automatically add captions to your shorts. Captions are generated using speech recognition and highlight words as they are spoken.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <Form {...fileForm}>
            <form onSubmit={fileForm.handleSubmit(onFileSubmit)} className="space-y-6">
              <FormField
                control={fileForm.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Upload Podcast</FormLabel>
                    <FormControl>
                      <div className="grid gap-4">
                        <Input
                          type="file"
                          accept=".mp4,.avi,.mov"
                          onChange={(e) => onChange(e.target.files)}
                          {...rest}
                        />
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload & Generate
                            </>
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Upload a video file (MP4, AVI, MOV, max 20MB)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={fileForm.control}
                name="numShorts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Shorts</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormDescription>How many shorts to generate (1-10)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={fileForm.control}
                name="addCaptions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Add Captions</FormLabel>
                      <FormDescription>
                        Automatically add captions to your shorts. Captions are generated using speech recognition and highlight words as they are spoken.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
  