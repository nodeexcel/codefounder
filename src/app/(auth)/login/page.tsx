import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In | CodeFounder",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
