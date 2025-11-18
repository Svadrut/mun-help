"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface JoinRequest {
  id: number;
  school_id: number;
  name: string;
  email: string;
  clerk_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string | Date;
  updated_at: Date;
}

interface RequestsTableProps {
  requests: JoinRequest[];
}

export default function RequestsTable({ requests: initialRequests }: RequestsTableProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [processingId, setProcessingId] = useState<number | null>(null);

  async function handleApprove(requestId: number) {
    setProcessingId(requestId);

    try {
      const response = await fetch("/api/requests/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve request");
      }

      // Remove the approved request from the list
      setRequests(requests.filter((req) => req.id !== requestId));
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Error approving request:", error);
      alert(error instanceof Error ? error.message : "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleAdmin(requestId: number) {
    setProcessingId(requestId);

    try {
      const response = await fetch("/api/requests/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve request");
      }

      // Remove the approved request from the list
      setRequests(requests.filter((req) => req.id !== requestId));
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Error approving request:", error);
      alert(error instanceof Error ? error.message : "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(requestId: number) {
    setProcessingId(requestId);

    try {
      const response = await fetch("/api/requests/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject request");
      }

      // Remove the rejected request from the list
      setRequests(requests.filter((req) => req.id !== requestId));
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert(error instanceof Error ? error.message : "Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No pending requests at this time.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Requested At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.name}</TableCell>
              <TableCell>{request.email}</TableCell>
              <TableCell>
                {typeof request.created_at === "string"
                  ? request.created_at
                  : new Date(request.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                  >
                    {processingId === request.id ? "Processing..." : "Reject"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdmin(request.id)}
                    disabled={processingId === request.id}
                  >
                    {processingId === request.id ? "Processing..." : "Admin"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                  >
                    {processingId === request.id ? "Processing..." : "Approve"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

