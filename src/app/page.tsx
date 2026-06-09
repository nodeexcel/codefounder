import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { NewLandingPage } from "@/components/landing/NewLandingPage";
import "./newui-landing.css";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Supabase falls back to Site URL when /auth/callback isn't whitelisted,
  // so the OAuth code lands here. Relay it to the proper callback handler.
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(String(params.code))}`);
  }

  const htmlPath = path.join(
    process.cwd(),
    "src",
    "app",
    "newui-landing-body.html",
  );
  const html = fs.readFileSync(htmlPath, "utf-8");

  return <NewLandingPage html={html} />;
}
