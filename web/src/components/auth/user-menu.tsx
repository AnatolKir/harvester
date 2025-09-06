"use client";

import React, { useState } from "react";
import {
  User,
  LogOut,
  Settings,
  Mail,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/supabase";
import { authUtils } from "@/lib/supabase";

interface UserMenuProps {
  className?: string;
}

function UserAvatar({ email }: { email: string }) {
  // Generate initials from email
  const getInitials = (email: string): string => {
    if (!email) return "U";

    const parts = email.split("@")[0];
    if (parts.length === 0) return "U";

    // If email has dots, use first letter of each part
    if (parts.includes(".")) {
      return parts
        .split(".")
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
    }

    // Otherwise use first two characters
    return parts.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(email);

  return (
    <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
      {initials}
    </div>
  );
}

export function UserMenu({ className }: UserMenuProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const [signOutLoading, setSignOutLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    setSignOutLoading(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSignOutLoading(false);
    }
  };

  const userEmail = user.email || "";
  const displayName = authUtils.getUserDisplayName(user);
  const isEmailConfirmed = authUtils.isEmailConfirmed(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`flex items-center space-x-2 px-2 ${className}`}
          disabled={authLoading}
        >
          <UserAvatar email={userEmail} />
          <div className="hidden md:flex md:flex-col md:items-start md:text-left">
            <span className="max-w-32 truncate text-sm font-medium">
              {displayName || userEmail}
            </span>
            {!isEmailConfirmed && (
              <span className="text-muted-foreground text-xs">Unverified</span>
            )}
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <UserAvatar email={userEmail} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {displayName || "User"}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {userEmail}
                </p>
              </div>
            </div>

            {!isEmailConfirmed && (
              <div className="flex items-center space-x-1 text-xs text-amber-600">
                <Mail className="h-3 w-3" />
                <span>Please verify your email</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signOutLoading}
          className="text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          {signOutLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{signOutLoading ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile/small spaces
export function UserMenuCompact({ className }: UserMenuProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const [signOutLoading, setSignOutLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    setSignOutLoading(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSignOutLoading(false);
    }
  };

  const userEmail = user.email || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          disabled={authLoading}
        >
          <UserAvatar email={userEmail} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="truncate text-sm font-medium">
              {authUtils.getUserDisplayName(user) || "User"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {userEmail}
            </p>
            {!authUtils.isEmailConfirmed(user) && (
              <div className="flex items-center space-x-1 text-xs text-amber-600">
                <Mail className="h-3 w-3" />
                <span>Email not verified</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signOutLoading}
          className="text-red-600 focus:text-red-600"
        >
          {signOutLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{signOutLoading ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
