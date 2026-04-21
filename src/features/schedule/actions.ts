"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schedulePostSchema = z.object({
  projectId: z.string().min(1),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE"]),
  date: z.string().min(1, "Informe a data."),
  time: z.string().min(1, "Informe o horario."),
  caption: z.string().trim().min(1, "Informe a legenda da postagem."),
});

function parseScheduledAt(date: string, time: string) {
  const scheduledAt = new Date(`${date}T${time}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data ou horario invalido.");
  }

  return scheduledAt;
}

export async function schedulePostAction(formData: FormData) {
  const parsed = schedulePostSchema.safeParse({
    projectId: formData.get("projectId"),
    platform: formData.get("platform"),
    date: formData.get("date"),
    time: formData.get("time"),
    caption: formData.get("caption"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados de agendamento invalidos.");
  }

  const project = await prisma.contentProject.findUnique({
    where: { id: parsed.data.projectId },
    include: {
      generatedVideos: {
        where: { status: "READY" },
        take: 1,
      },
    },
  });

  if (!project) {
    throw new Error("Projeto nao encontrado.");
  }

  if (project.generatedVideos.length === 0) {
    throw new Error("Gere um video antes de agendar a postagem.");
  }

  const scheduledAt = parseScheduledAt(parsed.data.date, parsed.data.time);

  await prisma.$transaction([
    prisma.scheduledPost.create({
      data: {
        projectId: project.id,
        platform: parsed.data.platform,
        scheduledAt,
        caption: parsed.data.caption,
        status: "SCHEDULED",
      },
    }),
    prisma.contentProject.update({
      where: { id: project.id },
      data: { status: "SCHEDULED" },
    }),
  ]);

  revalidatePath("/schedule");
  revalidatePath("/contents");
  revalidatePath(`/contents/${project.id}`);
  redirect("/schedule");
}
