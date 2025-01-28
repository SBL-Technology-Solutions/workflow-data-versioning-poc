import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

export const actionClient = createSafeActionClient({
    defineMetadataSchema() {
        return z.object({
            actionName: z.string(),
        });
    },
    handleServerError(e, utils) {
        const { clientInput, metadata } = utils;
        console.log('clientInput', clientInput);
        console.error(`Error in action ${metadata?.actionName}:`, e.message);

        return e.message;
    }
});