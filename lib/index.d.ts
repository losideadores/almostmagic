export default function ({ apiUrl, templatesDatabaseId, upvotesDatabaseId, openAIkey, defaultParameters, usdSpent }?: {
    apiUrl?: string;
    templatesDatabaseId?: string;
    upvotesDatabaseId?: string;
    openAIkey?: string;
    defaultParameters?: object;
    usdSpent?: number;
}): {
    usdSpent: number;
    run: (slug: string, variables?: object, parameters?: object) => Promise<object>;
    generate: (outputKeys: string | string[], input: object) => Promise<object>;
    upvote: (generationId: string) => Promise<object>;
};
