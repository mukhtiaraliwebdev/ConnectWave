
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, MessageCircle, User, LogOut, Settings, Loader2, Bell as BellIcon } from 'lucide-react'; // Removed Sparkles
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  exact?: boolean;
  protected?: boolean;
}

interface NavMenuProps {
  friendRequestCount: number;
  unreadGeneralNotificationCount: number;
  unreadMessageCount: number;
}

export function NavMenu({ friendRequestCount, unreadGeneralNotificationCount, unreadMessageCount }: NavMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading } = useAuth(); 
  const { toast } = useToast();

  const totalBellNotifications = friendRequestCount + unreadGeneralNotificationCount;

  const navItems: NavItem[] = [
    { href: '/', label: 'Feed', icon: Home, exact: true, protected: true },
    { href: '/explore', label: 'Explore', icon: Search, protected: true },
    // { href: '/recommendations', label: 'For You', icon: Sparkles, protected: true }, // "For You" module removed
    { href: '/notifications', label: 'Notifications', icon: BellIcon, badgeCount: totalBellNotifications, protected: true },
    { href: '/messages', label: 'Messages', icon: MessageCircle, badgeCount: unreadMessageCount, protected: true },
    { href: '/profile', label: 'Profile', icon: User, protected: true },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
    }
  };

  if (loading) {
    return (
       <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarMenu className="flex-1">
      {navItems.map((item) => {
        if (item.protected && !currentUser) {
          return null;
        }
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        
        const currentBadgeCount = item.badgeCount || 0;

        return (
          <SidebarMenuItem key={item.label}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                variant="default"
                size="default"
                isActive={isActive}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                tooltip={item.label}
              >
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                {currentBadgeCount > 0 && (
                  <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden bg-destructive text-destructive-foreground">
                    {currentBadgeCount > 9 ? '9+' : currentBadgeCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
      {currentUser && (
        <SidebarMenuItem className="mt-auto">
          <SidebarMenuButton
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleLogout}
              tooltip="Logout"
          >
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
