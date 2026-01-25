/**
 * Azure DevOps integration module.
 * Exports client and mappers for ADO API access.
 */

export { ADOClient } from './client.js';
export type { ADOClientConfig } from './client.js';
export { mapWorkItem, mapPullRequest, mapReviewer } from './mappers.js';
