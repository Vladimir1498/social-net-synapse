"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-bionic-card group-[.toaster]:text-bionic-text group-[.toaster]:border-bionic-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-bionic-text-dim",
          actionButton: "group-[.toast]:bg-bionic-accent group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-bionic-bg group-[.toast]:text-bionic-text",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
