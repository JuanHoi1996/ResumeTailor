import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "ResumeTailor", description: "Grounded, experience-level resume tailoring." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
