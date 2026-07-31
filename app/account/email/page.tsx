import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import ChangeEmailClient from "./ChangeEmailClient";

export default async function ChangeEmailPage() {
  await requireActiveUser();

  return <ChangeEmailClient />;
}