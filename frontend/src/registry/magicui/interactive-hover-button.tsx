import { Children, cloneElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export function InteractiveHoverButton({
  children,
  className,
  asChild = false,
  type = "button",
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const child = asChild
    ? Children.only(children) as ReactElement<{ children?: ReactNode }>
    : null;
  const label = child ? child.props.children : children;
  const content = (
    <>
      <span className="relative flex items-center justify-center gap-2">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-primary transition-transform duration-300 group-hover:scale-[100.8] group-focus-visible:scale-[100.8]"
        />
        <span className="relative inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0 group-focus-visible:translate-x-12 group-focus-visible:opacity-0">
          {label}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 flex translate-x-12 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      >
        <span>{label}</span>
        <ArrowRight className="size-4" />
      </span>
    </>
  );
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(
        "group relative inline-flex h-12 w-auto cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-background px-6 py-2 text-center text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...(!asChild ? { type } : {})}
      {...props}
    >
      {child ? cloneElement(child, undefined, content) : content}
    </Comp>
  );
}
