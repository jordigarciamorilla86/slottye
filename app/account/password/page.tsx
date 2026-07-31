import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import ChangePasswordClient from "./ChangePasswordClient";

export default async function ChangePasswordPage() {
  await requireActiveUser();

  return <ChangePasswordClient />;
}