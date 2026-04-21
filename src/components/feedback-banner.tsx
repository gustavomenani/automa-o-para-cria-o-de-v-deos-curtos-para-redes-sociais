type FeedbackBannerProps = {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function FeedbackBanner({ type, title, message }: FeedbackBannerProps) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${styles[type]}`}>
      <p className="font-semibold">{title}</p>
      {message ? <p className="mt-1 leading-6 opacity-80">{message}</p> : null}
    </div>
  );
}
