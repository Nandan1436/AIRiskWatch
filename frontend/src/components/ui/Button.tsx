import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantMap: Record<ButtonVariant, string> = {
  primary: styles.variantPrimary,
  secondary: styles.variantGhost,
  ghost: styles.variantGhost,
  danger: styles.variantDanger,
};

const sizeMap: Record<ButtonSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
};

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

function buttonClass({ variant = "primary", size = "md", block, className = "" }: StyleProps) {
  return `${styles.base} ${variantMap[variant]} ${sizeMap[size]} ${block ? styles.block : ""} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

export function Button({ variant, size, block, className, ...props }: ButtonProps) {
  return (
    <button type="button" {...props} className={buttonClass({ variant, size, block, className })} />
  );
}

type ButtonLinkProps = LinkProps & StyleProps;

export function ButtonLink({ variant, size, block, className, ...props }: ButtonLinkProps) {
  return <Link {...props} className={buttonClass({ variant, size, block, className })} />;
}
