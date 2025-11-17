"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import { useClerk, UserButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

export const Navbar = () => {
  const { isSignedIn, user } = useClerk();

  return (
    <div className="flex justify-start flex-row p-3 space-x-3">
      {isSignedIn && user?.publicMetadata.admin === true && (
        <>
          <Link href="/admin/create-lesson">
            <Button variant="ghost">Create Lesson</Button>
          </Link>
          <Link href="/admin/create-lesson">
            <Button variant="ghost">View Lessons</Button>
          </Link>
          <Link href="/admin/create-lesson">
            <Button variant="ghost">Progress</Button>
          </Link>
          <Link href="/admin/requests">
            <Button variant="ghost">Join Requests</Button>
          </Link>
        </>
      )}
       {isSignedIn && user?.publicMetadata.admin !== true && (
        <>
          <Link href="/lessons">
            <Button variant="ghost">Lessons</Button>
          </Link>
          <Link href="/progress">
            <Button variant="ghost">Progress</Button>
          </Link>
        </>
      )}
      <div className="flex-1" />
      <ModeToggle />
      <UserButton />
    </div>
  );
};
