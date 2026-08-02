import { redirect } from "next/navigation";
import { PRINT_GUIDE } from "@/lib/printingBox";

/** 구 경로 /photobox → 사진인화안내 */
export default function PhotoboxRedirectPage() {
  redirect(PRINT_GUIDE.path);
}
