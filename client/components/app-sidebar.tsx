"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Command,
  History,
  Home,
  Library,
  Mic,
  Settings,
  Star,
  Video,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "John Doe",
    email: "john@example.com",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: Home,
      isActive: true,
      items: [
        { title: "Overview", url: "#" },
        { title: "Analytics", url: "#" },
      ],
    },
    {
      title: "Content",
      url: "#",
      icon: Video,
      items: [
        { title: "Podcast to Shorts", url: "#", isActive: true },
        { title: "My Shorts", url: "#" },
        { title: "Templates", url: "#" },
      ],
    },
    {
      title: "Library",
      url: "#",

      icon: Library,
      items: [
        { title: "Podcasts", url: "#" },
        { title: "Uploads", url: "#" },
        { title: "Favorites", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      items: [
        { title: "Account", url: "#" },
        { title: "Preferences", url: "#" },
        { title: "Billing", url: "#" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Help & Support",
      url: "#",
      icon: BookOpen,
    },
  ],
  projects: [
    {
      name: "Recent Podcasts",
      url: "#",
      icon: Mic,
    },
    {
      name: "Saved Clips",
      url: "#",
      icon: Star,
    },
    {
      name: "History",
      url: "#",
      icon: History,
    },
  ],
};

export function AppSidebar({
  uploadedVideos = [],
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  uploadedVideos?: { id: number; name: string; date: string }[];
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  console.log("User in sidebar: ", user);
  const [showHistory, setShowHistory] = useState(false);

  const handleHistoryClick = () => {
    setShowHistory(!showHistory);
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Command className="size-4" />
          </div>
          <div className="grid text-left text-sm leading-tight">
            <span className="truncate font-semibold">Moment AI</span>
            <span className="truncate text-xs">Shorts Generator</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!showHistory ? (
          <>
            <NavMain items={data.navMain} />
            <NavProjects
              projects={data.projects}
              onHistoryClick={handleHistoryClick}
            />
            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </>
        ) : (
          <div className="p-4">
            <h2 className="text-lg font-bold mb-3">Upload History</h2>
            {uploadedVideos.length > 0 ? (
              <ul className="space-y-2">
                {uploadedVideos.map((video) => (
                  <li key={video.id} className="border p-2 rounded-md">
                    <span className="font-medium">{video.name}</span>
                    <br />
                    <span className="text-xs text-gray-500">{video.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No videos uploaded yet.</p>
            )}
            <button
              onClick={handleHistoryClick}
              className="mt-4 w-full bg-blue-500 text-white p-2 rounded-md"
            >
              Back to Sidebar
            </button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
