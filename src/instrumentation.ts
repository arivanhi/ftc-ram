export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const globalRef = globalThis as typeof globalThis & { __ftcReminderTimerStarted?: boolean };
  if (globalRef.__ftcReminderTimerStarted) return;
  globalRef.__ftcReminderTimerStarted = true;

  const { sendDueReturnReminders } = await import('@/lib/mailer');
  const run = async () => {
    try {
      const res = await sendDueReturnReminders();
      if (res.sent > 0 || res.failed > 0) {
        console.log(`[reminder-scheduler] checked=${res.checked} sent=${res.sent} failed=${res.failed}`);
      }
    } catch (err) {
      console.error('[reminder-scheduler] error:', err);
    }
  };

  // Run hourly without blocking server shutdown
  const timer = setInterval(run, 60 * 60 * 1000);
  timer.unref?.();
}
