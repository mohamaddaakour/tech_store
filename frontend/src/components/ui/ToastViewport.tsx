import { useToastStore } from "../../store/toastStore";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          onClick={() => dismiss(item.id)}
          className={[
            "animate-rise pointer-events-auto cursor-pointer rounded-control px-4 py-2.5 text-[13px] shadow-2xl ring-1",
            "bg-surface-2 text-ink ring-line-strong",
            item.tone === "success" ? "border-l-2 border-accent" : "border-l-2 border-danger",
          ].join(" ")}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
