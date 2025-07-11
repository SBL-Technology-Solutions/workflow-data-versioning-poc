import { Slot } from "@radix-ui/react-slot";
import {
	createFormHook,
	createFormHookContexts,
	useStore,
} from "@tanstack/react-form";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const {
	fieldContext,
	formContext,
	useFieldContext: _useFieldContext,
	useFormContext,
} = createFormHookContexts();

const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		FormLabel,
		FormControl,
		FormDescription,
		FormMessage,
		FormItem,
	},
	formComponents: {},
});

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn("grid gap-2", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

const useFieldContext = () => {
	const { id } = React.useContext(FormItemContext);
	const { name, store, ...fieldContext } = _useFieldContext();

	const errors = useStore(store, (state) => state.meta.errors);
	const isBlurred = useStore(store, (state) => state.meta.isBlurred);

	if (!fieldContext) {
		throw new Error("useFieldContext should be used within <FormItem>");
	}

	return {
		id,
		name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		errors,
		store,
		isBlurred,
		...fieldContext,
	};
};

/**
 * Renders a form field label linked to its input, displaying error styling when the field has errors and has been blurred.
 *
 * Applies accessibility attributes and conditional styling based on the field's error and blur state.
 */
function FormLabel({
	className,
	...props
}: React.ComponentProps<typeof Label>) {
	const { formItemId, errors, isBlurred } = useFieldContext();

	return (
		<Label
			data-slot="form-label"
			data-error={!!errors.length && isBlurred}
			className={cn("data-[error=true]:text-destructive", className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

/**
 * Renders a form control component with accessibility attributes based on field state.
 *
 * Sets `aria-describedby` and `aria-invalid` only when the field has errors and has been blurred, ensuring error messages and descriptions are properly linked for assistive technologies.
 */
function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
	const { errors, formItemId, formDescriptionId, formMessageId, isBlurred } =
		useFieldContext();

	return (
		<Slot
			data-slot="form-control"
			id={formItemId}
			aria-describedby={
				errors.length && isBlurred
					? `${formDescriptionId} ${formMessageId}`
					: `${formDescriptionId}`
			}
			aria-invalid={!!errors.length && isBlurred}
			{...props}
		/>
	);
}

/**
 * Renders a form field description with appropriate accessibility attributes.
 *
 * Associates the description with the form field for screen readers using a unique ID.
 */
function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFieldContext();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

/**
 * Displays the first error message for a form field after it has been blurred, or renders children if no error is present.
 *
 * Returns `null` if there is no error message and no children to display.
 */
function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
	const { errors, formMessageId, isBlurred } = useFieldContext();
	const body =
		errors.length && isBlurred
			? String(errors.at(0)?.message ?? "")
			: props.children;
	if (!body) return null;

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			className={cn("text-destructive text-sm", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export { useAppForm, useFormContext, useFieldContext, withForm };
