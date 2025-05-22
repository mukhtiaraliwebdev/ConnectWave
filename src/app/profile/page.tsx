
"use client";

import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Save, Mail, Info, Tag, Loader2, ImageUp, User as UserIcon, Phone } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import type { User } from "@/types";
import { useRouter } from 'next/navigation';

async function isUsernameTakenByOther(username: string, currentUserId: string): Promise<boolean> {
  if (!username) return false;
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return false;
  return querySnapshot.docs.some(doc => doc.id !== currentUserId);
}

// Basic phone number validation (allows numbers, +, spaces, hyphens, parentheses)
const phoneRegex = /^[+]?[\s./0-9()-]{7,}$/;

export default function ProfilePage() {
  const { currentUser, appUser, loading: authLoading, initialLoading: authInitialLoading, refreshAppUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>(undefined);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!authInitialLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authInitialLoading, router]);

  const resetFormFields = useCallback((userData: User | null, firebaseAuthUser: typeof currentUser | null) => {
    if (userData) {
      setName(userData.name || "");
      setUsername(userData.username || "");
      setPhoneNumber(userData.phoneNumber || "");
      setBio(userData.bio || "");
      setInterests((userData.interests || []).join(", "));
      setLocalAvatarUrl(userData.avatarUrl || firebaseAuthUser?.photoURL || `https://placehold.co/128x128.png?text=${(userData.username || "N").substring(0,1)}`);
    } else if(firebaseAuthUser) { 
      setName(firebaseAuthUser.displayName || "");
      setUsername(""); 
      setPhoneNumber(firebaseAuthUser.phoneNumber || "");
      setLocalAvatarUrl(firebaseAuthUser.photoURL || `https://placehold.co/128x128.png?text=${(firebaseAuthUser.displayName || "U").substring(0,1)}`);
      setBio("");
      setInterests("");
    }
  }, []);


  useEffect(() => {
    const loadUserData = (userData: User | null) => {
      resetFormFields(userData, currentUser);
      setProfileLoading(false);
    };

    if (appUser) {
      loadUserData(appUser);
    } else if (!authLoading && !authInitialLoading && currentUser) {
      const fetchUserData = async () => {
        setProfileLoading(true);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          loadUserData(userDocSnap.data() as User);
        } else {
           toast({ variant: "destructive", title: "Error", description: "Could not load profile data."});
           setProfileLoading(false);
        }
      };
      fetchUserData();
    } else if (authInitialLoading) {
      setProfileLoading(true);
    } else {
      setProfileLoading(false);
    }
  }, [appUser, currentUser, authLoading, authInitialLoading, toast, resetFormFields]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewAvatarFile(file);
      setLocalAvatarUrl(URL.createObjectURL(file)); 
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to save." });
      return;
    }
    setIsSaving(true);
    setUsernameError(null);
    setPhoneNumberError(null);

    if (!username.match(/^[a-zA-Z0-9_]{3,}$/)) {
      setUsernameError("Username must be at least 3 characters and contain only letters, numbers, or underscores.");
      setIsSaving(false);
      return;
    }
    if (username !== appUser?.username) { 
      const taken = await isUsernameTakenByOther(username, currentUser.uid);
      if (taken) {
        setUsernameError("This username is already taken. Please choose another.");
        setIsSaving(false);
        return;
      }
    }
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      setPhoneNumberError("Invalid phone number format.");
      setIsSaving(false);
      return;
    }

    let finalAvatarUrl = appUser?.avatarUrl || localAvatarUrl; 

    if (newAvatarFile) {
      try {
        const formData = new FormData();
        formData.append('file', newAvatarFile);
        formData.append('type', 'avatar');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload avatar.');
        }
        const { url } = await uploadResponse.json();
        finalAvatarUrl = url;

      } catch (error) {
        console.error("Error uploading avatar:", error);
        toast({ variant: "destructive", title: "Avatar Upload Failed", description: `Could not upload new avatar. ${(error as Error).message}` });
      }
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: name,
        username: username,
        phoneNumber: phoneNumber || "", // Save empty string if cleared
        bio: bio,
        interests: interests.split(",").map(i => i.trim()).filter(i => i),
        avatarUrl: finalAvatarUrl,
        updatedAt: serverTimestamp(),
      });
      
      await refreshAppUser(); 
      
      setLocalAvatarUrl(finalAvatarUrl); 
      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
      setIsEditing(false);
      setNewAvatarFile(null); 
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ variant: "destructive", title: "Update Failed", description: `Could not save your profile. ${(error as Error).message}` });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (authInitialLoading || profileLoading) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-3xl py-4 text-center">
          <p>Please log in to view your profile. Redirecting...</p>
        </div>
      </AppLayout>
    );
  }
  
  const currentDisplayName = isEditing ? name : (appUser?.name || name || "User");
  const currentUsername = isEditing ? username : (appUser?.username || username || "no_username_set");
  const currentPhoneNumber = isEditing ? phoneNumber : (appUser?.phoneNumber || "");
  const displayAvatarUrl = localAvatarUrl || `https://placehold.co/128x128.png?text=${(currentDisplayName || "U").substring(0,1)}`;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl py-4">
        <Card className="shadow-xl">
          <CardHeader className="items-center text-center">
            <div className="relative">
              <Avatar className="mb-4 h-32 w-32 border-4 border-primary">
                <AvatarImage src={displayAvatarUrl} alt={currentDisplayName} data-ai-hint="profile avatar" />
                <AvatarFallback className="text-4xl">{(currentDisplayName || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {isEditing && (
                 <Button 
                    size="icon" 
                    variant="outline" 
                    className="absolute bottom-4 right-0 rounded-full shadow-md bg-background hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <ImageUp className="h-4 w-4" />
                    <span className="sr-only">Edit Avatar</span>
                 </Button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            <CardTitle className="text-3xl font-bold">{currentDisplayName}</CardTitle>
            <p className="text-lg text-primary">@{currentUsername}</p>
            <CardDescription className="text-md text-muted-foreground">
              <Mail className="mr-1 inline h-4 w-4" />
              {currentUser.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div>
              <Label htmlFor="name" className="flex items-center text-sm font-medium text-muted-foreground">
                <UserIcon className="mr-2 h-4 w-4" /> Full Name
              </Label>
              {isEditing ? (
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" disabled={isSaving} />
              ) : (
                <p className="mt-1 text-lg text-foreground">{name || "No name set."}</p>
              )}
            </div>

            <div>
              <Label htmlFor="username" className="flex items-center text-sm font-medium text-muted-foreground">
                <UserIcon className="mr-2 h-4 w-4" /> Username
              </Label>
              {isEditing ? (
                <>
                  <Input id="username" value={username} onChange={(e) => {setUsername(e.target.value); setUsernameError(null);}} className="mt-1" disabled={isSaving} />
                  {usernameError && <p className="mt-1 text-sm text-destructive">{usernameError}</p>}
                </>
              ) : (
                <p className="mt-1 text-lg text-foreground">{username || "No username set."}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="flex items-center text-sm font-medium text-muted-foreground">
                <Phone className="mr-2 h-4 w-4" /> Phone Number (Optional)
              </Label>
              {isEditing ? (
                 <>
                  {/* TODO: Replace with a proper international phone number input library e.g., react-phone-number-input */}
                  <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => {setPhoneNumber(e.target.value); setPhoneNumberError(null);}} placeholder="e.g., +1 123-456-7890" className="mt-1" disabled={isSaving} />
                  {phoneNumberError && <p className="mt-1 text-sm text-destructive">{phoneNumberError}</p>}
                 </>
              ) : (
                <p className="mt-1 text-lg text-foreground">{currentPhoneNumber || "Not set."}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="bio" className="flex items-center text-sm font-medium text-muted-foreground">
                <Info className="mr-2 h-4 w-4" /> Bio
              </Label>
              {isEditing ? (
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 min-h-[100px]" disabled={isSaving} />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-foreground">{bio || "No bio yet."}</p>
              )}
            </div>

            <div>
              <Label htmlFor="interests" className="flex items-center text-sm font-medium text-muted-foreground">
                <Tag className="mr-2 h-4 w-4" /> Interests
              </Label>
              {isEditing ? (
                <Input id="interests" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g., coding, travel, music (comma-separated)" className="mt-1" disabled={isSaving} />
              ) : (
                <p className="mt-1 text-foreground">{interests || "No interests specified."}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t p-6">
            {isEditing ? (
              <div className="flex w-full gap-2">
                <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false); 
                  setNewAvatarFile(null);
                  setUsernameError(null);
                  setPhoneNumberError(null);
                  resetFormFields(appUser, currentUser);
                }} className="flex-1" disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="w-full">
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
