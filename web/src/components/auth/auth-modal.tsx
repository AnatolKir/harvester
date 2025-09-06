"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { SignUpForm } from "./signup-form";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: AuthMode;
  onSuccess?: () => void;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultMode = "login",
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, defaultMode]);

  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const switchToLogin = () => setMode("login");
  const switchToSignup = () => setMode("signup");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-2">
          {mode === "login" ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToSignup={switchToSignup}
            />
          ) : (
            <SignUpForm
              onSuccess={handleSuccess}
              onSwitchToLogin={switchToLogin}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
