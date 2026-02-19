/**
 * Shared prefix conversion utilities.
 *
 * Marker prefixes use dashes (e.g., "my-prefix") while metadata/key prefixes
 * use underscores (e.g., "my_prefix"). These conversions are used across
 * sync, check, rules, agents, and managed-content modules.
 */

/** Convert a marker prefix (dashes) to a metadata prefix (underscores). */
export function toMetadataPrefix(markerPrefix: string): string {
  return markerPrefix.replace(/-/g, "_");
}

/** Convert a metadata prefix (underscores) to a marker prefix (dashes). */
export function toMarkerPrefix(metadataPrefix: string): string {
  return metadataPrefix.replace(/_/g, "-");
}
