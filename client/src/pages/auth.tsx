import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Screen Shot 2025-06-25 at 5.29.45 PM_1750890591164.png";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface AuthProps {
  onComplete: (userId: number) => void;
}

export default function Auth({ onComplete }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInFormData) => {
      const response = await apiRequest("POST", "/api/auth/signin", data);
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      onComplete(user.id);
    },
    onError: (error) => {
      toast({
        title: "Sign in failed",
        description: "Please check your email and password.",
        variant: "destructive",
      });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        dietaryRestrictions: [],
        religiousDietaryNeeds: [],
      });
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Account created!",
        description: "Welcome to Cravii. Let's set up your preferences.",
      });
      onComplete(user.id);
    },
    onError: (error) => {
      toast({
        title: "Sign up failed",
        description: "Please try again or use a different email.",
        variant: "destructive",
      });
    },
  });

  const onSignInSubmit = (data: SignInFormData) => {
    signInMutation.mutate(data);
  };

  const onSignUpSubmit = (data: SignUpFormData) => {
    signUpMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-400 to-red-500 z-30">
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img 
                src={logoImage}
                alt="Cravii Logo" 
                className="w-16 h-16 mx-auto rounded-full"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Cravii</h1>
            <p className="text-gray-500 text-sm">swipe. cook. enjoy.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-colors ${
                !isSignUp 
                  ? 'bg-white text-red-500 shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-colors ${
                isSignUp 
                  ? 'bg-white text-red-500 shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          {/* Sign In Form */}
          {!isSignUp && (
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-6">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-left">
                        <label className="text-red-400 text-sm font-medium mb-2 block">Email</label>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10 border border-gray-200 rounded-xl py-3 bg-gray-50 focus:border-red-400 focus:ring-0 focus:bg-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-left">
                        <label className="text-red-400 text-sm font-medium mb-2 block">Password</label>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              type="password"
                              placeholder="Enter your password"
                              className="pl-10 border border-gray-200 rounded-xl py-3 bg-gray-50 focus:border-red-400 focus:ring-0 focus:bg-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit"
                  disabled={signInMutation.isPending}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-semibold text-base mt-8"
                >
                  {signInMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          )}

          {/* Sign Up Form */}
          {isSignUp && (
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-6">
                <FormField
                  control={signUpForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-left">
                        <label className="text-red-400 text-sm font-medium mb-2 block">Full Name</label>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              placeholder="Enter your full name"
                              className="pl-10 border border-gray-200 rounded-xl py-3 bg-gray-50 focus:border-red-400 focus:ring-0 focus:bg-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-left">
                        <label className="text-red-400 text-sm font-medium mb-2 block">Email</label>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10 border border-gray-200 rounded-xl py-3 bg-gray-50 focus:border-red-400 focus:ring-0 focus:bg-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-left">
                        <label className="text-red-400 text-sm font-medium mb-2 block">Password</label>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              type="password"
                              placeholder="Create a password"
                              className="pl-10 border border-gray-200 rounded-xl py-3 bg-gray-50 focus:border-red-400 focus:ring-0 focus:bg-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-left">
                        <label className="text-red-400 text-sm font-medium mb-2 block">Confirm Password</label>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <Input 
                              type="password"
                              placeholder="Confirm your password"
                              className="pl-10 border border-gray-200 rounded-xl py-3 bg-gray-50 focus:border-red-400 focus:ring-0 focus:bg-white"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit"
                  disabled={signUpMutation.isPending}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-semibold text-base mt-8"
                >
                  {signUpMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>
          )}

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our{" "}
              <button className="text-red-500 underline">Terms of Service</button>{" "}
              and{" "}
              <button className="text-red-500 underline">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}