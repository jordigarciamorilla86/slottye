import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ businessId: string }>;
};

export default async function LegacyAdminBusinessImagesPage({ params }: Props) {
  const { businessId } = await params;
  redirect(`/admin/businesses/${businessId}/edit#imagenes`);
}
