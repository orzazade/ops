import { z } from 'zod';

const VipSchema = z.object({
  name: z.string(),
  role: z.string(),
  priority: z.enum(['highest', 'high', 'medium', 'low']),
});

const AzureSchema = z.object({
  organization: z.string(),
  default_project: z.string().optional(),
});

const UserSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  team: z.string().optional(),
});

const PrioritiesSchema = z.object({
  sprint_commitment: z.number().default(3),
  vip_involvement: z.number().default(3),
  blocking_others: z.number().default(2),
  age_over_3_days: z.number().default(2),
  p1_priority: z.number().default(2),
  p2_priority: z.number().default(1),
  carried_over: z.number().default(1),
}).default({
  sprint_commitment: 3,
  vip_involvement: 3,
  blocking_others: 2,
  age_over_3_days: 2,
  p1_priority: 2,
  p2_priority: 1,
  carried_over: 1,
});

const GsdSchema = z.object({
  scan_paths: z.array(z.string()).default(['.']),
  exclude: z.array(z.string()).default(['node_modules', '.git']),
}).default({
  scan_paths: ['.'],
  exclude: ['node_modules', '.git'],
});

const PreferencesSchema = z.object({
  briefing_length: z.enum(['concise', 'detailed']).default('concise'),
  response_style: z.enum(['professional', 'casual']).default('professional'),
  timezone: z.string().default('UTC'),
}).default({
  briefing_length: 'concise',
  response_style: 'professional',
  timezone: 'UTC',
});

export const OpsConfigSchema = z.object({
  azure: AzureSchema,
  user: UserSchema.optional(),
  vips: z.array(VipSchema).default([]),
  priorities: PrioritiesSchema,
  gsd: GsdSchema,
  preferences: PreferencesSchema,
});

export type OpsConfig = z.infer<typeof OpsConfigSchema>;
export type ADOConfig = z.infer<typeof AzureSchema>;
