"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/supabase/hooks";
import { authUtils } from "@/lib/supabase/auth-client";
import type { SignInFormData } from "@/types";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  className?: string;
}

export function LoginForm({
  onSuccess,
  onSwitchToSignup,
  className,
}: LoginFormProps) {
  const { signIn, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Partial<SignInFormData>
  >({});

  // Validation function
  const validateForm = (): boolean => {
    const errors: Partial<SignInFormData> = {};

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange =
    (field: keyof SignInFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      }

      // Clear auth error when user starts typing
      if (error) {
        clearError();
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { error: signInError } = await signIn(formData);

    if (!signInError && onSuccess) {
      onSuccess();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      return;
    }

    setResetLoading(true);

    try {
      const { auth } = await import("@/lib/supabase/auth-client");
      await auth.resetPassword(resetEmail);
      setResetSent(true);
    } catch (error) {
      console.error("Reset password error:", error);
    } finally {
      setResetLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (showForgotPassword) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              Reset your password
            </h2>
            <p className="text-muted-foreground">
              Enter your email address and we'll send you a reset link
            </p>
          </div>

          {resetSent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-green-800">
                  Check your email for a password reset link
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail("");
                }}
                className="w-full"
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={resetLoading || !resetEmail}
              >
                {resetLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send reset link
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForgotPassword(false)}
                className="w-full"
              >
                Back to sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Sign in to your account
          </h2>
          <p className="text-muted-foreground">
            Enter your email and password to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">
                {authUtils.formatAuthError(error)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange("email")}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
            {validationErrors.email && (
              <p className="text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange("password")}
                className="pr-10 pl-10"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-600">
                {validationErrors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-primary hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>

          {onSwitchToSignup && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{" "}
              </span>
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-primary hover:underline"
                disabled={loading}
              >
                Sign up
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
