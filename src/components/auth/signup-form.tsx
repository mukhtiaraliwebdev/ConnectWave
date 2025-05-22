
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { auth, db, googleProvider, signInWithPopup } from "@/lib/firebase"; // Import googleProvider and signInWithPopup
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile, User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where, getDoc } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Basic phone number validation (allows numbers, +, spaces, hyphens, parentheses)
const phoneRegex = /^[+]?[\s./0-9()-]{7,}$/;

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores.")
    .optional(),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phoneNumber: z.string().optional().refine(val => !val || phoneRegex.test(val), {
    message: "Invalid phone number format.",
  }), // Optional phone number
});

type SignupFormValues = z.infer<typeof formSchema>;

async function isUsernameTaken(username: string): Promise<boolean> {
  if (!username) return false;
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

function generateUniqueProfileNumber(): string {
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `user_${randomNumber}`;
}

async function ensureUserProfile(firebaseUser: FirebaseUser, additionalData?: Partial<SignupFormValues>) {
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    let usernameToSet = additionalData?.username || '';
    if (!usernameToSet && firebaseUser.displayName) {
      const potentialUsername = firebaseUser.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (potentialUsername.length >= 3 && !(await isUsernameTaken(potentialUsername))) {
        usernameToSet = potentialUsername;
      }
    }
    if (!usernameToSet) {
      let generatedUsername = generateUniqueProfileNumber();
      while (await isUsernameTaken(generatedUsername)) {
        generatedUsername = generateUniqueProfileNumber();
      }
      usernameToSet = generatedUsername;
    }

    await setDoc(userDocRef, {
      id: firebaseUser.uid,
      name: additionalData?.name || firebaseUser.displayName || "New User",
      username: usernameToSet,
      email: firebaseUser.email,
      phoneNumber: additionalData?.phoneNumber || "",
      avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(usernameToSet || (additionalData?.name || "N")).substring(0,2).toUpperCase()}`,
      bio: "",
      interests: [],
      friends: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}


export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      phoneNumber: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    let finalUsername = values.username;

    if (finalUsername) {
      const taken = await isUsernameTaken(finalUsername);
      if (taken) {
        toast({
          variant: "destructive",
          title: "Username Taken",
          description: "This username is already in use. Please choose another.",
        });
        setIsLoading(false);
        form.setError("username", { type: "manual", message: "This username is already taken." });
        return;
      }
    } else {
      let generatedUsername = generateUniqueProfileNumber();
      while (await isUsernameTaken(generatedUsername)) {
        generatedUsername = generateUniqueProfileNumber();
      }
      finalUsername = generatedUsername;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        await updateAuthProfile(user, { displayName: values.name });
        await ensureUserProfile(user, {...values, username: finalUsername });
      }

      toast({
        title: "Signup Successful",
        description: "Welcome to ConnectWave! Please log in.",
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await ensureUserProfile(user); // Create profile if it doesn't exist
      toast({
        title: "Signed in with Google!",
        description: "Welcome to ConnectWave!",
      });
      router.push("/");
    } catch (error: any) {
      console.error("Google Signup error:", error);
      toast({
        variant: "destructive",
        title: "Google Sign-Up Failed",
        description: error.message || "Could not sign up with Google. Please try again.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-4" />
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>Join ConnectWave and start sharing!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="your_username (letters, numbers, _)" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    {/* TODO: Replace with a proper international phone number input library e.g., react-phone-number-input */}
                    <Input type="tel" placeholder="e.g., +1 123-456-7890" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>
        </Form>
        <div className="my-4 flex items-center">
          <Separator className="flex-1" />
          <span className="mx-4 text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={isLoading || isGoogleLoading}>
          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
          }
          Sign Up with Google
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col items-center text-sm">
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
