import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign Up | CodeFounder",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
