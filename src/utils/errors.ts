export class OpsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'OpsError';
  }

  toUserMessage(): string {
    let msg = `[${this.code}] ${this.message}`;
    if (this.suggestion) {
      msg += `\n\nSuggestion: ${this.suggestion}`;
    }
    return msg;
  }
}

export class ConfigNotFoundError extends OpsError {
  constructor(path: string) {
    super(
      `Config file not found at ${path}`,
      'CONFIG_NOT_FOUND',
      'Run /ops:config to create your configuration.'
    );
    this.name = 'ConfigNotFoundError';
  }
}

export class MCPUnavailableError extends OpsError {
  constructor(source: string, originalError?: Error) {
    super(
      `${source} MCP server is unavailable: ${originalError?.message ?? 'Unknown error'}`,
      'MCP_UNAVAILABLE',
      `Check that the ${source} MCP server is running and configured.`
    );
    this.name = 'MCPUnavailableError';
  }
}
