import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        chip: "badge-chip h-auto min-h-[23px] rounded-full border px-[9px] py-[2px] text-[0.72rem] leading-[1.2] font-semibold",
      },
      tone: {
        success: "tone--success",
        warning: "tone--warning",
        info: "tone--info",
        danger: "tone--danger",
        neutral: "tone--neutral",
      },
      palette: {
        "color-0": "palette--color-0",
        "color-1": "palette--color-1",
        "color-2": "palette--color-2",
        "color-3": "palette--color-3",
        "color-4": "palette--color-4",
        "color-5": "palette--color-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant = "default", tone, palette, render, ...props }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps(
      {
        className: cn(badgeVariants({ variant, tone, palette }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
      tone,
      palette,
    },
  });
}

export { Badge, badgeVariants };
