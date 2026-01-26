/**
 * Represents an allocation of tokens to a named section
 */
interface Allocation {
  tokens: number;
  priority: number;
}

/**
 * Manages token budget allocation with priority-based overflow handling
 */
export class TokenBudget {
  private allocations: Map<string, Allocation> = new Map();
  private _used = 0;

  constructor(private readonly total: number) {}

  /**
   * Returns the number of tokens remaining in the budget
   */
  remaining(): number {
    return this.total - this._used;
  }

  /**
   * Returns the number of tokens currently allocated
   */
  used(): number {
    return this._used;
  }

  /**
   * Checks if the specified number of tokens can be allocated
   */
  canAllocate(tokens: number): boolean {
    return this._used + tokens <= this.total;
  }

  /**
   * Allocates tokens to a named section with priority
   */
  allocate(section: string, tokens: number, priority: number): void {
    this.allocations.set(section, { tokens, priority });
    this._used += tokens;
  }

  /**
   * Checks if a section has an allocation
   */
  hasAllocation(section: string): boolean {
    return this.allocations.has(section);
  }
}
