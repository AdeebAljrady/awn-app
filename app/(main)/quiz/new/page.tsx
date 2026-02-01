import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFileById } from "@/app/actions/db/files";
import QuizNew from "@/components/awn/QuizNew";

interface Props {
  searchParams: Promise<{ fileId?: string }>;
}

export default async function NewQuizPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  const fileId = params.fileId;

  // If fileId provided, fetch the file data
  let fileData = null;
  if (fileId) {
    const { data, error } = await getFileById(fileId);
    if (!error && data) {
      fileData = {
        id: data.id,
        name: data.file_name,
        url: data.file_url,
        path: data.file_path,
      };
    }
  }

  return <QuizNew initialFile={fileData} />;
}
