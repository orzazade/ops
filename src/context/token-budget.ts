import { Result, ok, err } from 'neverthrow';

/**
 * Represents an allocation of tokens to a named section
 */
interface Allocation {
  tokens: number;
  priority: number;
}

/**
 * Error thrown when a section cannot fit even after dropping lower priority sections
 */
export class OverflowError extends Error {
  constructor(
    message: string,
    public readonly section: string,
    public readonly requiredTokens: number,
    public readonly priority: number,
    public readonly droppedSections: string[],
    public readonly freedTokens: number,
    public readonly shortfall: number
  ) {
    super(message);
    this.name = 'OverflowError';
  }
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

  /**
   * Handles overflow by dropping lower priority sections to make space
   *
   * Returns Ok with array of dropped section names if space can be freed.
   * Returns Err(OverflowError) if cannot fit even after dropping all lower priority sections.
   *
   * NOTE: Does NOT allocate the new section. Caller must call allocate() after successful overflow handling.
   */
  handleOverflow(
    section: string,
    tokens: number,
    priority: number
  ): Result<string[], OverflowError> {
    // Find sections with lower priority than new section
    const droppable = Array.from(this.allocations.entries())
      .filter(([_, alloc]) => alloc.priority < priority)
      .sort((a, b) => a[1].priority - b[1].priority); // Lowest priority first

    let freed = 0;
    const dropped: string[] = [];

    for (const [name, alloc] of droppable) {
      this.allocations.delete(name);
      this._used -= alloc.tokens;
      freed += alloc.tokens;
      dropped.push(name);

      if (this.canAllocate(tokens)) {
        return ok(dropped);
      }
    }

    // Still can't fit even after dropping all lower priority sections
    const shortfall = tokens - this.remaining();
    return err(
      new OverflowError(
        `Cannot fit ${section} (${tokens} tokens, priority ${priority}). ` +
          `Dropped ${dropped.length} sections (${freed} tokens) but need ${shortfall} more.`,
        section,
        tokens,
        priority,
        dropped,
        freed,
        shortfall
      )
    );
  }
}
