"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

// Single-user tool: one operator credential from env vars, no user table.
// Fine for a personal dev instance — swap for a real auth provider/passkey
// before this ever leaves localhost (see DESIGN.md §11).
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (email !== process.env.AUTH_EMAIL || password !== process.env.AUTH_PASSWORD) {
    return { error: "That email or password isn't right." };
  }

  await createSession();
  redirect("/focus");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
