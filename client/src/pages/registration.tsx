import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const registrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationProps {
  onComplete: (userId: number) => void;
}

export default function Registration({ onComplete }: RegistrationProps) {
  const { toast } = useToast();
  
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
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
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-400 to-red-500 z-30">
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {/* Profile Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✏️</span>
              </div>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <div className="text-left">
                      <label className="text-red-400 text-sm font-medium mb-2 block">Name</label>
                      <FormControl>
                        <Input 
                          placeholder=""
                          className="border-0 border-b-2 border-gray-200 rounded-none px-0 py-3 bg-transparent focus:border-red-400 focus:ring-0 placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="text-left">
                      <label className="text-red-400 text-sm font-medium mb-2 block">Email</label>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder=""
                          className="border-0 border-b-2 border-gray-200 rounded-none px-0 py-3 bg-transparent focus:border-red-400 focus:ring-0 placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <div className="text-left">
                      <label className="text-red-400 text-sm font-medium mb-2 block">Phone</label>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder=""
                          className="border-0 border-b-2 border-gray-200 rounded-none px-0 py-3 bg-transparent focus:border-red-400 focus:ring-0 placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dietary/Allergy Restrictions Link */}
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <span className="text-red-400 text-sm font-medium">Dietary/Allergy Restrictions</span>
                <span className="text-gray-400">›</span>
              </div>
              
              <div className="space-y-3 pt-4">
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-semibold text-base"
                >
                  {createUserMutation.isPending ? "Creating Account..." : "Change Password 🔒"}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full border-2 border-red-200 text-red-500 hover:bg-red-50 py-4 rounded-full font-semibold text-base"
                >
                  Logout ↗
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
