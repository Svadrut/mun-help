"use client";

import { useEffect, useState } from "react";
import { getPassword, PASSWORD_NEEDED, setPassword } from "@/lib/api";
import { Grader } from "../components/grader";
import { ModeToggle } from "../components/ModeToggle";

export default function Home() {
  const [askPassword, setAskPassword] = useState(false);

  useEffect(() => {
    const show = () => setAskPassword(true);
    window.addEventListener(PASSWORD_NEEDED, show);
    return () => window.removeEventListener(PASSWORD_NEEDED, show);
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Rubric Grader</h1>
          <p className="text-sm text-muted-foreground">
            Grade a zip of student PDFs against your rubric, check the results, download a CSV.
          </p>
        </div>
        {askPassword && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPassword(String(new FormData(e.currentTarget).get("password")));
              setAskPassword(false);
            }}
          >
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Site password"
              defaultValue={getPassword()}
              className="rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm"
            />
            <button className="text-sm font-medium underline">Save</button>
          </form>
        )}
        <ModeToggle />
      </header>
      <Grader />
    </div>
  );
}
