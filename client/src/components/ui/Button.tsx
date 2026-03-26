import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "glass" | "gradient";
    size?: "default" | "sm" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                    {
                        "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40": variant === "default",
                        "border border-white/20 bg-transparent hover:bg-white/10 text-white": variant === "outline",
                        "hover:bg-white/10 text-white": variant === "ghost",
                        "glass-button text-white": variant === "glass",
                        "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20": variant === "gradient",
                        "h-10 px-4 py-2": size === "default",
                        "h-9 rounded-md px-3": size === "sm",
                        "h-12 rounded-xl px-8 text-base": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
