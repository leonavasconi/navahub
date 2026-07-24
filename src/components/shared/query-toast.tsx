"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function QueryToast({ successMessage }: { successMessage: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const success = searchParams.get("success");
  const warning = searchParams.get("warning");

  useEffect(() => {
    if (!success && !warning) return;
    if (warning) {
      toast.warning(warning);
    } else if (success) {
      toast.success(successMessage);
    }
    router.replace(pathname, { scroll: false });
  }, [success, warning, successMessage, router, pathname]);

  return null;
}
