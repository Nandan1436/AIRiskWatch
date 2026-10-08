import type { ReactNode } from "react";
import { Lock, Mail } from "lucide-react";
import { Eyebrow } from "../layout";
import styles from "./Auth.module.css";

const PERKS = [
  {
    icon: Mail,
    title: "Monthly digest",
    text: "The month's incidents, top domains and trends, in your inbox on the 1st.",
  },
  { icon: Lock, title: "Private by default", text: "We store only your email and username." },
];

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className={styles.auth}>
      <div className={styles.pitch}>
        <Eyebrow>Free account</Eyebrow>
        <h1>
          Stay ahead of
          <br />
          <span>AI harms</span>.
        </h1>
        <p>Browsing is open to everyone. An account adds the monthly digest by email.</p>
        {PERKS.map(({ icon: Icon, title: perk, text }) => (
          <div key={perk} className={styles.perk}>
            <span className={styles.perkIcon}>
              <Icon />
            </span>
            <div>
              <b>{perk}</b>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.box}>
        <h2>{title}</h2>
        <div className={styles.sub}>{subtitle}</div>
        {children}
        <div className={styles.footer}>{footer}</div>
      </div>
    </div>
  );
}
