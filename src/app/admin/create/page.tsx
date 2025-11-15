import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CreateSchoolForm from "./create-school-form";

export default async function CreateSchoolPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create a New School</h1>
          <p className="text-muted-foreground">
            Add a new school to the platform and become its administrator.
          </p>
        </div>
        
        <CreateSchoolForm />
      </div>
    </div>
  );
}

