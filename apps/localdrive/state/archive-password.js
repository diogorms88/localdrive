export function archivePassword(release) {
  const sources = [release, ...(release.parts || []).flatMap(part => part.sources)];
  const passwords = new Set();
  for (const source of sources) {
    const value = source.archivePassword;
    if (value == null || value === '') continue;
    if (typeof value !== 'string' || value.length > 1024 || value.includes('\0'))
      throw new Error('Invalid archive password metadata.');
    passwords.add(value);
  }
  if (passwords.size > 1)
    throw new Error('Archive volumes have conflicting passwords. Choose another complete source.');
  return passwords.values().next().value;
}
