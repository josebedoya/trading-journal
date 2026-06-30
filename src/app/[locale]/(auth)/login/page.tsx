import { setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/organisms/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "@/lib/i18n/navigation";
import { signIn } from "@/server/actions/auth";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) redirect({ href: "/dashboard", locale });

  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <LoginForm action={signIn} />
    </main>
  );
}
