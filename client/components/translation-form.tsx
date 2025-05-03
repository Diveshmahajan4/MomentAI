"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Upload, Globe, Youtube } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const voiceOptions = [
  { value: "alloy", label: "Alloy" },
  { value: "echo", label: "Echo" },
  { value: "fable", label: "Fable" },
  { value: "onyx", label: "Onyx" },
  { value: "nova", label: "Nova" },
  { value: "shimmer", label: "Shimmer" },
]

const languageOptions = [
  { value: "Hindi", label: "Hindi" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Chinese", label: "Chinese" },
  { value: "Arabic", label: "Arabic" },
  { value: "Russian", label: "Russian" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Italian", label: "Italian" },
]

const translationSchema = z.object({
  videoUrl: z
    .string()
    .min(1, { message: "Video URL is required" })
    .url({ message: "Please enter a valid URL" }),
  sourceLanguage: z.string().default("English"),
  targetLanguage: z.string().min(1, { message: "Target language is required" }),
  voice: z.string().min(1, { message: "Voice is required" }),
  addCaptions: z.boolean().default(true),
})

interface TranslationFormProps {
  onSubmit: (
    url: string, 
    sourceLanguage: string, 
    targetLanguage: string, 
    voice: string, 
    addCaptions: boolean
  ) => Promise<void>;
  isLoading: boolean;
}

export function TranslationForm({ onSubmit, isLoading }: TranslationFormProps) {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const videoUrlFromParams = searchParams.get('videoUrl') || ""

  const form = useForm<z.infer<typeof translationSchema>>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      videoUrl: videoUrlFromParams,
      sourceLanguage: "English",
      targetLanguage: "Hindi",
      voice: "alloy",
      addCaptions: true,
    },
  })

  // Update the form when videoUrlFromParams changes
  React.useEffect(() => {
    if (videoUrlFromParams) {
      form.setValue('videoUrl', videoUrlFromParams)
    }
  }, [videoUrlFromParams, form])

  async function handleSubmit(values: z.infer<typeof translationSchema>) {
    await onSubmit(
      values.videoUrl, 
      values.sourceLanguage, 
      values.targetLanguage, 
      values.voice, 
      values.addCaptions
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Video Translation & Dubbing</h2>
        <p className="text-muted-foreground">Translate and dub your videos into multiple languages</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                </FormControl>
                <FormDescription>Enter the URL of a video to translate (YouTube)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="sourceLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Language</FormLabel>
                  <Select
                    disabled={true}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Currently only supports English as source</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Language</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Language to translate to</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voice</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {voiceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Voice for the dubbed audio</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="addCaptions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Add Captions</FormLabel>
                  <FormDescription>
                    Automatically add translated captions to your video
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
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Translation
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Translate & Dub Video
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
} 