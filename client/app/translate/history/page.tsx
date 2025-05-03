"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

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
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Video, Globe, Play } from "lucide-react"

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

export default function TranslateHistoryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [parsedUser, setParsedUser] = useState<User>({
      name: "John Doe",
      email: "john@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
  })
  const [userDubbings, setUserDubbings] = useState<DubbingData[]>([])
  const [username, setUsername] = useState("")
  const { toast } = useToast()
  const supabase = createClient()
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
          
          // Once we have the username, fetch the user's dubbings
          await fetchUserDubbings(userEmail);
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
  
  // Function to fetch user's dubbings
  const fetchUserDubbings = async (userEmail: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:8000/api/dubbing/user/${encodeURIComponent(userEmail)}/`);
      
      if (response.ok) {
        const dubbings = await response.json();
        // Sort by creation date - newest first
        const sortedDubbings = dubbings.sort((a: DubbingData, b: DubbingData) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setUserDubbings(sortedDubbings);
      } else {
        console.error("Failed to fetch user dubbings");
        toast({
          title: "Failed to load history",
          description: "Could not load your translation history",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching user dubbings:", error);
      toast({
        title: "Failed to load history",
        description: "Could not load your translation history",
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

  // Group dubbings by date
  const groupedDubbings = userDubbings.reduce<Record<string, DubbingData[]>>((groups, dubbing) => {
    const date = new Date(dubbing.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(dubbing);
    return groups;
  }, {});

  const handleViewDubbing = (id: string) => {
    router.push(`/translate?id=${id}`);
  };

  return (
    <SidebarProvider>
      <div className="grid h-screen w-full overflow-hidden lg:grid-cols-[280px_1fr]">
        <AppSidebar 
          user={parsedUser}
          uploadedVideos={userDubbings.map((dubbing) => ({
            id: parseInt(dubbing.id),
            name: `${dubbing.source_language} to ${dubbing.target_language}`,
            date: new Date(dubbing.created_at).toLocaleDateString(),
          }))}
          className="hidden border-r lg:block" 
        />
        <div className="flex h-screen flex-col overflow-auto">
          <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 lg:px-8 lg:py-4">
            <SidebarTrigger />
            <div className="w-full flex-1">
              <h1 className="text-xl font-semibold tracking-tight">Translation History</h1>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink as={Link} href="/dashboard">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink as={Link} href="/translate">
                      Translation
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>History</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <Button size="sm" variant="outline" asChild>
                <Link href="/translate">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Translation
                </Link>
              </Button>
            </div>
            <Separator />
            
            {isLoading ? (
              <Card className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </Card>
            ) : userDubbings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Translation History</CardTitle>
                  <CardDescription>
                    You haven't created any translations yet. Go to the Translation page to get started.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild>
                    <Link href="/translate">
                      <Globe className="mr-2 h-4 w-4" />
                      Create a Translation
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <>
                {Object.entries(groupedDubbings).map(([date, dubbings]) => (
                  <div key={date} className="space-y-4">
                    <h2 className="text-lg font-semibold">{date}</h2>
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Translation</TableHead>
                            <TableHead>Voice</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dubbings.map((dubbing) => (
                            <TableRow key={dubbing.id}>
                              <TableCell className="font-medium">
                                {dubbing.source_language} → {dubbing.target_language}
                              </TableCell>
                              <TableCell>{dubbing.voice}</TableCell>
                              <TableCell>{getStatusBadge(dubbing.status)}</TableCell>
                              <TableCell>{formatDate(dubbing.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {dubbing.status === 'COMPLETED' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleViewDubbing(dubbing.id)}
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  )}
                                  {dubbing.video_url && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      asChild
                                    >
                                      <a 
                                        href={dubbing.video_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="sr-only">Source</span>
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                ))}
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
} 