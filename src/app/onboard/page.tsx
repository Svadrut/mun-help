import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../../db/drizzle";
import { school, user } from "../../db/schema";
import { eq } from "drizzle-orm";
import SchoolSelector from "./school-selector";
import Link from "next/link";

export default async function Onboard() {
  // Get the current authenticated user from Clerk
  const clerkUser = await currentUser();

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

  // Fetch all schools from the database
  let schools = await db.select().from(school);
  schools = schools.filter((school) => school.name !== "test");

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Select your school</h2>
          <SchoolSelector schools={schools} />
        </div>
    
        {/* <div className="pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Do you want to add a new school?{" "}
            <Link 
              href="/admin/create" 
              className="text-primary hover:underline font-medium"
            >
              Add a new school
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
}
