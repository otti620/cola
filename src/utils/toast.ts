export interface ToastOptions {
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "profit";
  amount?: number;
  duration?: number;
}

export function notifyToast(options: ToastOptions) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: options }));
  }
}
