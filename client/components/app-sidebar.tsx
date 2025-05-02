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
  Globe,
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
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Dubbing",
      url: "/translate",
      icon: Video,
    },
    {
      title: "History",
      url: "/dashboard/history",
      icon: Library,
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
    }
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
          <>
            <NavMain items={data.navMain} />
            <NavProjects
              projects={data.projects}
              onHistoryClick={handleHistoryClick}
            />
            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
