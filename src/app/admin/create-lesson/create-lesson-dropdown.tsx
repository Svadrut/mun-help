import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

export const CreateLessonDropdown = ({
  activityType,
  setActivityType,
}: {
  activityType: string;
  setActivityType: Dispatch<SetStateAction<"writing" | "speaking" | "both">>;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="inline-block">
          <Button variant="outline" className="w-auto min-w-0 px-2 py-1">
            {activityType.substring(0, 1).toUpperCase() + activityType.substring(1)}
            <ChevronDownIcon className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="start"
        className="min-w-[120px]"
      >
        <DropdownMenuItem onClick={() => setActivityType("writing")}>
          Writing
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActivityType("speaking")}>
          Speaking
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActivityType("both")}>
          Both
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
