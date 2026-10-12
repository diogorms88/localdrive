const KEPT = 8;

export function createPageCache(read) {
  const pages = new Map();
  return file => {
    if (!/^data\/pages\/[a-z0-9%_-]+\.json$/i.test(file)) throw new Error('Invalid page data path.');
    let page = pages.get(file);
    if (!page) {
      page = JSON.parse(read(file));
      if (!Array.isArray(page.about) || !Array.isArray(page.shots))
        throw new Error('Invalid page data; rebuild the catalog.');
      if (pages.size === KEPT) pages.delete(pages.keys().next().value);
    }
    pages.delete(file);
    pages.set(file, page);
    return page;
  };
}
