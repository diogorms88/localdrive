export function consoleRoots(mounts) {
  const roots = ['/data'];
  let listed;
  try {
    listed = mounts();
  } catch (error) {
    console.log(`[downloads] drives not listed: ${error.message}`);
    return roots;
  }
  for (const mount of listed) {
    if (/^\/mnt\/(?:usb|ext)\d+$/.test(mount.path) && !roots.includes(mount.path)) roots.push(mount.path);
  }
  return roots;
}
