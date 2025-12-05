"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { redirect, useRouter } from "next/navigation";

interface School {
  id: number;
  name: string | null;
  description: string | null;
}

interface SchoolSelectorProps {
  schools: School[];
}

export default function SchoolSelector({ schools }: SchoolSelectorProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleRequestJoin() {
    if (!selectedSchool) return;

    setIsSubmitting(true);
    setRequestStatus("idle");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/requests/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
        }),
      });

      const data = await response.json();

      router.push("/");

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setRequestStatus("success");
    } catch (err) {
      setRequestStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between",
              !selectedSchool && "text-muted-foreground"
            )}
          >
            {selectedSchool ? selectedSchool.name : "Select a school"}
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {schools.length === 0 ? (
            <DropdownMenuItem disabled>No schools available</DropdownMenuItem>
          ) : (
            schools.map((school) => (
              <DropdownMenuItem
                key={school.id}
                onClick={() => {
                  setSelectedSchool(school);
                  setRequestStatus("idle");
                  setErrorMessage(null);
                }}
                className="cursor-pointer"
              >
                {school.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedSchool && (
        <div className="space-y-2">
          <Button
            onClick={handleRequestJoin}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Join School"}
          </Button>
          
          {requestStatus === "success" && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {/* Request submitted successfully! An admin will review your request. */}
              You successfully joined this school!
            </p>
          )}
          
          {requestStatus === "error" && errorMessage && (
            <p className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

