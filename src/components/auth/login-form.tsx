
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
import { signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where } from "firebase/firestore";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

// Helper function from signup form, slightly adapted
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

async function ensureUserProfileOnLogin(firebaseUser: FirebaseUser) {
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // This case is mostly for users who signed up with Google directly
    // and might not have a Firestore profile yet if they never completed a separate signup.
    let usernameToSet = '';
    if (firebaseUser.displayName) {
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
      name: firebaseUser.displayName || "New User",
      username: usernameToSet,
      email: firebaseUser.email,
      phoneNumber: firebaseUser.phoneNumber || "", // Google might provide phone number
      avatarUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(usernameToSet).substring(0,2).toUpperCase()}`,
      bio: "",
      interests: [],
      friends: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
     toast({
        title: "Profile Created",
        description: "We've set up a basic profile for you.",
      });
  }
}


export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back to ConnectWave!",
      });
      router.push("/"); 
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserProfileOnLogin(result.user); // Ensure profile exists
      toast({
        title: "Signed in with Google!",
        description: "Welcome to ConnectWave!",
      });
      router.push("/");
    } catch (error: any) {
      console.error("Google Login error:", error);
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-4" />
        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </Form>
        <div className="my-4 flex items-center">
          <Separator className="flex-1" />
          <span className="mx-4 text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading || isGoogleLoading}>
           {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
          }
          Sign In with Google
        </Button>

      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 text-sm">
        <Link href="#" className="text-primary hover:underline">
            Forgot password?
        </Link>
        <span>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
