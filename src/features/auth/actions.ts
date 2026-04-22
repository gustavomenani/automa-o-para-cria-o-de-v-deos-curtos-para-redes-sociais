"use server";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/features/auth/session";
import { loginInputSchema } from "@/features/auth/schemas";

export type LoginActionState = {
  message?: string;
};

const INVALID_LOGIN_MESSAGE = "Faca login para acessar seus projetos.";

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function maybeCreateInitialUser(email: string, password: string) {
  const initialEmail = process.env.INITIAL_USER_EMAIL?.trim().toLowerCase();
  const initialPassword = process.env.INITIAL_USER_PASSWORD;

  if (!initialEmail || !initialPassword || email !== initialEmail || password !== initialPassword) {
    return null;
  }

  const userCount = await prisma.user.count();

  if (userCount > 0) {
    return null;
  }

  return prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: email.split("@")[0] || null,
    },
  });
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? INVALID_LOGIN_MESSAGE };
  }

  const { email, password } = parsed.data;
  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await maybeCreateInitialUser(email, password));

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { message: INVALID_LOGIN_MESSAGE };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login?loggedOut=1");
}
