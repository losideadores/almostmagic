export interface MagicReturnValueObject {
    description: string;
    optional: boolean;
}
export interface MagicReturnObject {
    [key: string]: string | MagicReturnValueObject;
}
export type MagicReturns = MagicReturnObject | string[] | string;
export interface MagicSpecs {
    returns?: MagicReturns;
    [key: string]: any;
}
export interface MagicCostContainer {
    usdSpent?: number;
}
export interface MagicConfig extends MagicCostContainer {
    alwaysReturnObject?: boolean;
    apiUrl?: string;
    descriptor?: string;
    examples?: object[];
    externalCostContainer?: MagicCostContainer;
    ignoreAmbiguityWarnings?: boolean;
    openaiKey?: string;
    optionalReturns?: string[] | true;
    outputKeys?: object;
    parameters?: object;
    postprocess?: (data: any) => any;
    retries?: number;
    specs?: MagicSpecs;
    templatesDatabaseId?: string;
    upvotesDatabaseId?: string;
}
export interface ForkOptions {
    mergeSpecs?: boolean;
}
export default class Magic {
    config: MagicConfig;
    lastMeta: object | null;
    get usdSpent(): number | undefined;
    set usdSpent(value: number | undefined);
    constructor(config?: MagicConfig);
    run(slug: string, variables?: object, parameters?: object, config?: MagicConfig): Promise<any>;
    generateFor(input: object, config?: MagicConfig): Promise<any>;
    generate(input?: object | null, config?: MagicConfig): Promise<any>;
    generate(returns: MagicReturns, input?: object | null, config?: MagicConfig): Promise<any>;
    upvote(generationId: string, config?: MagicConfig): Promise<any>;
    fork(config: MagicConfig, { mergeSpecs }?: ForkOptions): Magic;
    static create(config?: MagicConfig): Magic;
    static generate(returns: string | string[], input: object, config?: MagicConfig): Promise<any>;
}
