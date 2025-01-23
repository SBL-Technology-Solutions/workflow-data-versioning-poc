"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";

interface StateSelectorProps {
  states: string[];
  defaultState: string;
}

export const StateSelector = ({ states, defaultState }: StateSelectorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useQueryState("state", {
    defaultValue: defaultState,
    parse: (value) => value,
    serialize: (value) => value,
  });

  const handleStateChange = (newState: string) => {
    setState(newState);
    const params = new URLSearchParams(searchParams);
    params.set("state", newState);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 py-6">
      <span className="text-muted-foreground">State:</span>
      <Select value={state} onValueChange={handleStateChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select state" />
        </SelectTrigger>
        <SelectContent>
          {states.map((stateOption) => (
            <SelectItem key={stateOption} value={stateOption}>
              {stateOption}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};