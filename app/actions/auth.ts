"use server";

import { signIn, signOut } from "@/auth";

export async function loginWithGoogle(formData: FormData) {
  const redirectTo = (formData.get("redirectTo") as string) || "/";
  await signIn("google", { redirectTo });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
