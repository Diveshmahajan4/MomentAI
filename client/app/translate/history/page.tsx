"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@//components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@//components/ui/breadcrumb";
import { Separator } from "@//components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@//components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Video, Globe, Play } from "lucide-react";

interface DubbingData {
  id: string;
  username: string;
  video_url: string;
  source_language: string;
  target_language: string;
  voice: string;
  status: string;
  cloudinary_url: string | null;
  cloudinary_urls: Array<{ url: string; public_id: string }>;
  created_at: string;
  updated_at: string;
}

interface User {
  name: string;
  email: string;
  avatar: string;
}

export default function TranslateHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [parsedUser, setParsedUser] = useState<User>({
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=32&width=32",
  });
  const [userDubbings, setUserDubbings] = useState<DubbingData[]>([]);
  const [username, setUsername] = useState("");
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const parsedUser: User = {
            name: user.user_metadata?.full_name ?? "Jane Doe",
            email: user.email ?? "janedoe@gmail.com",
            avatar: user.user_metadata?.avatar_url ?? "/default-avatar.png",
          };
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
      const response = await fetch(`http://localhost:8000/api/dubbing/user/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: userEmail }),
      });

      if (response.ok) {
        const dubbings = await response.json();
        // Sort by creation date - newest first
        const sortedDubbings = dubbings.sort(
          (a: DubbingData, b: DubbingData) =>
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
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "PROCESSING":
        return <Badge variant="secondary">Processing</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  // Group dubbings by date
  const groupedDubbings = userDubbings.reduce<Record<string, DubbingData[]>>(
    (groups, dubbing) => {
      const date = new Date(dubbing.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(dubbing);
      return groups;
    },
    {}
  );

  const handleViewDubbing = (id: string) => {
    router.push(`/translate?id=${id}`);
  };

  return (
    <SidebarProvider>
      <AppSidebar user={parsedUser} />
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/translate">Dubbing</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/translate">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dubbing
                </Link>
              </Button>
            </div>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Translation History</h1>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-10">
                <p>Loading your history...</p>
              </div>
            ) : userDubbings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Translation History</CardTitle>
                  <CardDescription>
                    You haven&apos;t created any translations yet. Go to the
                    Dubbing page to get started.
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
                  <div key={date} className="mb-8">
                    <h3 className="text-lg font-medium mb-3">{date}</h3>
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Translation</TableHead>
                            <TableHead>Voice</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dubbings.map((dubbing) => (
                            <TableRow key={dubbing.id}>
                              <TableCell className="font-medium">
                                {dubbing.source_language} →{" "}
                                {dubbing.target_language}
                              </TableCell>
                              <TableCell>{dubbing.voice}</TableCell>
                              <TableCell>
                                {getStatusBadge(dubbing.status)}
                              </TableCell>
                              <TableCell>
                                {formatDate(dubbing.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {dubbing.status === "COMPLETED" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleViewDubbing(dubbing.id)
                                      }
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  )}
                                  {dubbing.video_url && (
                                    <Button size="sm" variant="ghost" asChild>
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
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
