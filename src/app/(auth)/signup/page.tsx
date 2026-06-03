import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign Up | CodeFounder",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
