export interface MagicConfig {
    apiUrl?: string;
    templatesDatabaseId?: string;
    upvotesDatabaseId?: string;
    openaiKey?: string;
    defaultParameters?: object;
    usdSpent?: number;
}
export declare class Magic {
    config: MagicConfig;
    get usdSpent(): number | undefined;
    set usdSpent(value: number | undefined);
    constructor(config?: MagicConfig);
    run(slug: string, variables?: object, parameters?: object, config?: MagicConfig): Promise<any>;
    generate(outputKeys: string | string[], input: object, config?: MagicConfig): Promise<any>;
    upvote(generationId: string, config?: MagicConfig): Promise<any>;
    static create(config?: MagicConfig): Magic;
    static generate(outputKeys: string | string[], input: object, config?: MagicConfig): Promise<any>;
}
export default Magic;
