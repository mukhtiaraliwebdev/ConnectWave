import { Wind } from 'lucide-react';
import type { SVGProps } from 'react';
import { cn } from "@/lib/utils"; // Added this import

interface LogoProps extends SVGProps<SVGSVGElement> {
  showText?: boolean;
  iconClassName?: string;
  textClassName?: string;
}

export function Logo({ showText = true, className, iconClassName, textClassName, ...props }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Wind className={cn("h-7 w-7 text-primary", iconClassName)} {...props} />
      {showText && <span className={cn("text-xl font-bold text-primary", textClassName)}>ConnectWave</span>}
    </div>
  );
}
