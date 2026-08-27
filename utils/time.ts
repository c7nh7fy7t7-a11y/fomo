export function timeAgo(iso: string, includeAgo = false) {
  const parsed = new Date(iso).getTime();
  const seconds = Number.isFinite(parsed) ? Math.max(0, Math.floor((Date.now() - parsed) / 1000)) : 0;
  let value: string;
  if (seconds < 60) value = `${seconds}s`;
  else if (seconds < 3600) value = `${Math.floor(seconds / 60)}m`;
  else if (seconds < 86400) value = `${Math.floor(seconds / 3600)}h`;
  else if (seconds < 604800) value = `${Math.floor(seconds / 86400)}d`;
  else value = `${Math.floor(seconds / 604800)}w`;
  return includeAgo ? `${value} ago` : value;
}
