import {
	Select,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";

interface StateSelectorProps {
	states: string[];
	currentState: string;
	onStateChange: (newState: string) => void;
}

export function StateSelector({
	states,
	currentState,
	onStateChange,
}: StateSelectorProps) {
	return (
		<div className="flex items-center gap-2 py-6">
			<span className="text-muted-foreground">State:</span>
			<Select value={currentState} onValueChange={onStateChange}>
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
}
