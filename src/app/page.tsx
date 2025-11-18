import Image from "next/image";
import { db } from "../db/drizzle";
import { membership, school, user } from "../db/schema";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function Home() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Get the current user from the database
  const currentDbUser = await db
    .select()
    .from(user)
    .where(eq(user.clerk_id, clerkUser.id))
    .limit(1);

  if (currentDbUser.length === 0) {
    redirect("/onboard");
  }

  const dbUser = currentDbUser[0];

  // Check if user is an admin
  const userMembership = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.user_id, dbUser.id),
        eq(membership.school_id, dbUser.school_id),
        eq(membership.role, "admin")
      )
    )
    .limit(1);

  if (userMembership.length === 0) {
    redirect("/lessons");
  } else {
    redirect("/admin/view-lessons");
  }

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
      <Link href="/sign-in">
        <Button className="bg-primary">Sign in</Button>
      </Link>
    </div>
  );
}
