import { Toaster as Sonner } from "sonner";

/** App-wide toast host. Every toast renders <PyreToast>, so sonner stays unstyled. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      gap={10}
      visibleToasts={4}
      offset={20}
      toastOptions={{ unstyled: true, classNames: { toast: "w-full flex justify-center" } }}
    />
  );
}
