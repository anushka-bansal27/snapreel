"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  // Fix for Hydration Error: Ensure we only render the date string after mounting
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handlePresetChange = (value: string) => {
    const now = new Date();
    switch (value) {
      case "today":
        setDate({ from: now, to: now });
        break;
      case "yesterday":
        const yesterday = addDays(now, -1);
        setDate({ from: yesterday, to: yesterday });
        break;
      case "last7":
        setDate({ from: addDays(now, -6), to: now });
        break;
      case "last30":
        setDate({ from: addDays(now, -29), to: now });
        break;
      case "thisMonth":
        setDate({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: now });
        break;
      case "last3Months":
        setDate({ from: addDays(now, -90), to: now });
        break;
      case "lastYear":
        setDate({ from: addDays(now, -365), to: now });
        break;
      case "allTime":
        setDate({ from: new Date(2020, 0, 1), to: now });
        break;
      default:
        break;
    }
  }
  
  return (
    <div className={cn("grid gap-2 w-full sm:w-auto", className)}>
      <Select onValueChange={handlePresetChange} defaultValue="today">
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select a preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7">Last 7 days</SelectItem>
          <SelectItem value="last30">1 month</SelectItem>
          <SelectItem value="last3Months">3 months</SelectItem>
          <SelectItem value="lastYear">1 year</SelectItem>
          <SelectItem value="allTime">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
