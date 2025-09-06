"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/supabase/hooks";
import { authUtils } from "@/lib/supabase/auth-client";
import type { SignUpFormData } from "@/types";

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

export function SignUpForm({
  onSuccess,
  onSwitchToLogin,
  className,
}: SignUpFormProps) {
  const { signUp, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<SignUpFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpComplete, setSignUpComplete] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Partial<SignUpFormData>
  >({});

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    Object.values(checks).forEach((check) => {
      if (check) strength++;
    });

    return { strength, checks };
  };

  // Validation function
  const validateForm = (): boolean => {
    const errors: Partial<SignUpFormData> = {};

    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange =
    (field: keyof SignUpFormData) =>
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

      // Real-time password confirmation validation
      if (field === "confirmPassword" && formData.password !== value) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: value ? "Passwords do not match" : undefined,
        }));
      } else if (
        field === "password" &&
        formData.confirmPassword &&
        formData.confirmPassword !== value
      ) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      } else if (field === "confirmPassword" && formData.password === value) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: undefined,
        }));
      } else if (field === "password" && formData.confirmPassword === value) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: undefined,
        }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { error: signUpError } = await signUp({
      email: formData.email,
      password: formData.password,
    });

    if (!signUpError) {
      setSignUpComplete(true);
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthText =
    ["Very Weak", "Weak", "Fair", "Good", "Strong"][
      passwordStrength.strength - 1
    ] || "Very Weak";
  const strengthColor =
    ["red", "red", "yellow", "blue", "green"][passwordStrength.strength - 1] ||
    "red";

  if (signUpComplete) {
    return (
      <div className={className}>
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Check your email
              </h2>
              <p className="text-muted-foreground">
                We've sent a confirmation link to{" "}
                <strong>{formData.email}</strong>
              </p>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 p-4">
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Next steps:</strong>
              </p>
              <ol className="list-inside list-decimal space-y-1 text-left">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the confirmation link</li>
                <li>Return here to sign in</li>
              </ol>
            </div>
          </div>

          {onSwitchToLogin && (
            <Button type="button" onClick={onSwitchToLogin} className="w-full">
              Back to sign in
            </Button>
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
            Create your account
          </h2>
          <p className="text-muted-foreground">
            Enter your details to get started with the TikTok Domain Harvester
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
            <Label htmlFor="signup-email">Email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="signup-email"
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
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
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

            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Password strength:
                  </span>
                  <span
                    className={`text-xs font-medium text-${strengthColor}-600`}
                  >
                    {strengthText}
                  </span>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 w-full rounded-full ${
                        level <= passwordStrength.strength
                          ? `bg-${strengthColor}-500`
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${passwordStrength.checks.length ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${passwordStrength.checks.lowercase && passwordStrength.checks.uppercase ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>Mixed case letters</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-2 w-2 rounded-full ${passwordStrength.checks.number ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    <span>At least one number</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange("confirmPassword")}
                className="pr-10 pl-10"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="text-sm text-red-600">
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>

          {onSwitchToLogin && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{" "}
              </span>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary hover:underline"
                disabled={loading}
              >
                Sign in
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
