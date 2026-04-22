export const SCHEDULE_PAST_DATE_ERROR =
  "Escolha uma data e horario futuros para salvar o agendamento.";

export function parseScheduledAt(date: string, time: string) {
  const scheduledAt = new Date(`${date}T${time}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data ou horario invalido.");
  }

  return scheduledAt;
}

export function assertFutureSchedule(scheduledAt: Date, now = new Date()) {
  if (scheduledAt.getTime() <= now.getTime()) {
    throw new Error(SCHEDULE_PAST_DATE_ERROR);
  }
}
