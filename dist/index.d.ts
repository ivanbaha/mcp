#!/usr/bin/env node
declare class ContextBankServer {
    private server;
    private tempDirs;
    private defaultRepository;
    private defaultAccessToken?;
    constructor();
    private setupHandlers;
    private cloneRepository;
    private resolveRepository;
    private resolveAccessToken;
    private getMarkdownFiles;
    private getFileContent;
    private searchMarkdownContent;
    private findMarkdownFiles;
    private matchesFilter;
    private cleanupTempDir;
    private cleanup;
    run(): Promise<void>;
}
export default ContextBankServer;
//# sourceMappingURL=index.d.ts.map