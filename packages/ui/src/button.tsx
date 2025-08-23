"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const Button = ({
  children,
  className,
  appName,
  onClick,
  disabled,
  isLoading,
}: ButtonProps) => {
  return (
    <button
      className={`inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ${className ?? ""}`}
      onClick={onClick ?? (() => alert(`Hello from your ${appName} app!`))}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
