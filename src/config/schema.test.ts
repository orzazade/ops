import { describe, it, expect } from 'vitest';
import { OpsConfigSchema } from './schema.js';

describe('OpsConfigSchema', () => {
  it('validates minimal config with required fields', () => {
    const config = { azure: { organization: 'Appxite' } };
    expect(() => OpsConfigSchema.parse(config)).not.toThrow();
  });

  it('rejects config missing azure.organization', () => {
    const config = { azure: {} };
    expect(() => OpsConfigSchema.parse(config)).toThrow();
  });

  it('applies default values for optional fields', () => {
    const config = { azure: { organization: 'Appxite' } };
    const result = OpsConfigSchema.parse(config);
    expect(result.vips).toEqual([]);
    expect(result.gsd.scan_paths).toEqual(['.']);
  });

  it('validates VIP contact structure', () => {
    const config = {
      azure: { organization: 'Appxite' },
      vips: [{ name: 'John', role: 'VP', priority: 'high' }]
    };
    expect(() => OpsConfigSchema.parse(config)).not.toThrow();
  });

  it('validates priority weights are numbers', () => {
    const config = {
      azure: { organization: 'Appxite' },
      priorities: { sprint_commitment: 'high' } // string instead of number
    };
    expect(() => OpsConfigSchema.parse(config)).toThrow();
  });
});
