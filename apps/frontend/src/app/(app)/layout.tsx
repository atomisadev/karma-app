import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import { eden } from "@/lib/api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = await getToken();
  if (token) {
    const res = await eden.api.user.me.get({
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = res.data as any;
    // if (me && me.onboardingCompleted === false) {
    //   redirect("/onboarding");
    // }
  }

  return children;
}
