import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CreateSchoolForm from "./create-school-form";
import { user } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/src/db/drizzle";

export default async function CreateSchoolPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  if (clerkUser) {
    // Check if user already exists in the database with a school
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.clerk_id, clerkUser.id))
      .limit(1);

    // If user exists and has a school_id, redirect them
    if (existingUser.length > 0 && existingUser[0].school_id) {
      redirect("/");
    }
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

