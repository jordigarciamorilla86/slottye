import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import DeleteAccountClient from "./DeleteAccountClient";

export default async function DeleteAccountPage() {
  await requireActiveUser();

  return <DeleteAccountClient />;
}