import { Header } from "@/components/Header";
import CheckEmailClient from "./CheckEmailClient";

type Props = {
  searchParams:
    Promise<{
      email?:
        string;
      role?:
        string;
    }>;
};

export default async function CheckEmailPage({
  searchParams,
}: Props) {
  const {
    email,
    role,
  } =
    await searchParams;

  return (
    <>
      <Header />

      <main
        className="shell detail"
        style={{
          maxWidth:
            600,
        }}
      >
        <CheckEmailClient
          email={
            email ??
            null
          }
          role={
            role ??
            null
          }
        />
      </main>
    </>
  );
}
