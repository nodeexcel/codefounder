import fs from "fs";
import path from "path";
import { NewLandingPage } from "@/components/landing/NewLandingPage";
import "./newui-landing.css";

export default function Home() {
  const htmlPath = path.join(
    process.cwd(),
    "src",
    "app",
    "newui-landing-body.html",
  );
  const html = fs.readFileSync(htmlPath, "utf-8");

  return <NewLandingPage html={html} />;
}
