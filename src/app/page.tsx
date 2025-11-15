import Image from "next/image";
import { db } from "../db/drizzle";
import { school } from "../db/schema";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
      <Link href="/sign-in/onboard"><Button className="bg-primary">Sign in</Button></Link>
    </div>
  );
}
