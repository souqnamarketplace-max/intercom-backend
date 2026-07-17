// Granular scopes an owner can assign to a partner API key, so an integrator
// (e.g. Yardi gets write:residents, a CCTV/VMS vendor gets only
// read:audit_events) is only ever given as much access as it needs.
export const PARTNER_API_SCOPES = [
  'read:audit_events',
  'read:residents',
  'write:residents',
  'read:devices',
  'read:units',
] as const;

export type PartnerApiScope = (typeof PARTNER_API_SCOPES)[number];
