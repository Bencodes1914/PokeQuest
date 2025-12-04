import { cn } from "@/lib/utils";

export function PokeballIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-6 w-6", className)}
      {...props}
    >
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zM12 12H2M12 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />
      <path d="M12 12h10" />
      <path d="M20 12a8 8 0 0 0-8-8M4 12a8 8 0 0 1 8-8" />
    </svg>
  );
}
