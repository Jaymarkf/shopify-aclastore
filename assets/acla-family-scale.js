const collectionIndexes = new Map();

/** Share the compact index between the family grid and savings badges on this page. */
export function loadCollectionIndex(url, signal) {
  const key = new URL(url, location.href).href;
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  let job = collectionIndexes.get(key);
  if (job?.controller.signal.aborted || job?.expires < Date.now()) job = null;
  if (!job) {
    const controller = new AbortController();
    job = { controller, consumers: 0, done: false, expires: Infinity };
    const current = job;
    job.promise = readCollectionIndex(url, controller.signal).then(entries => {
      current.done = true;
      current.expires = Date.now() + 60000;
      return entries;
    }).catch(error => {
      if (collectionIndexes.get(key) === current) collectionIndexes.delete(key);
      throw error;
    });
    collectionIndexes.set(key, job);
  }
  const current = job;
  current.consumers++;
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (callback, value) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener('abort', abort);
      current.consumers--;
      if (!current.done && !current.consumers) current.controller.abort();
      callback(value);
    };
    const abort = () => finish(reject, new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    current.promise.then(value => finish(resolve, value), error => finish(reject, error));
  });
}

/** Read current collection membership and prices without downloading photos or product markup. */
async function readCollectionIndex(url, signal) {
  const read = async page => {
    const target = new URL(url, location.href);
    target.searchParams.set('page', String(page));
    const response = await fetch(target, { signal });
    if (!response.ok) throw new Error('Collection could not be loaded');
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    const data = JSON.parse(document.querySelector('[data-family-index]')?.textContent || 'null');
    if (!data?.collectionId || data.page !== page || !Array.isArray(data.entries) || !Number.isInteger(data.pages)) throw new Error('Invalid collection response');
    return data;
  };
  const first = await read(1);
  const pages = [first];
  let next = 2;
  await Promise.all(Array.from({ length: Math.min(3, first.pages - 1) }, async () => {
    while (next <= first.pages) {
      const page = next++;
      const data = await read(page);
      if (data.collectionId !== first.collectionId || data.count !== first.count) throw new Error('Collection changed during loading; retry');
      pages[page - 1] = data;
    }
  }));
  const entries = pages.flatMap(page => page.entries);
  if (entries.length !== first.count || new Set(entries.map(row => row[4])).size !== first.count) throw new Error('Incomplete collection; retry');
  return entries;
}

/** Lightweight assignment index plus cancellable, bounded-concurrency detail requests. */
export class FamilyCatalogSource {
  constructor(index, seed, url, signal, testCount = 0) {
    this.url = url;
    this.signal = signal;
    this.records = new Map(seed.map(record => [String(record.productId), record]));
    this.jobs = new Map();
    this.queue = [];
    this.active = 0;
    const seen = new Set();
    const entries = index.flatMap((source, sourceIndex) => {
      const row = source?.data ? [source.data[0], source.data[1], source.data[2], source.data[3], source.id, source.data[4], source.data[5]] : source;
      if (!Array.isArray(row) || !Number.isFinite(Number(row[3]))) return [];
      const productId = String(row[4] || '');
      if (!row[0] || !row[1] || !productId || seen.has(productId)) return [];
      seen.add(productId);
      return [{ key: productId, sourceIndex, productId, handle: row[0], name: row[1], sku: row[2] || '', price: Number(row[3]), comparePrice: Number(row[7]) || 0, checkoutRate: Number(row[8]) || 0, available: String(row[5] !== false), stock: row[6] ?? null, position: sourceIndex + 1, search: `${row[1]} ${row[2] || ''}` }];
    });
    this.realCount = entries.length;
    this.testMode = testCount > 0 && entries.length > 0;
    this.entries = this.testMode ? Array.from({ length: testCount }, (_, index) => ({ ...entries[index % entries.length], key: `sample-${index}`, position: index + 1, search: `${entries[index % entries.length].search} sample ${index + 1}` })) : entries;
    signal.addEventListener('abort', () => this.cancel(), { once: true });
  }
  details(entry) {
    const record = this.records.get(entry.productId);
    return record ? { ...record, key: entry.key, position: entry.position } : null;
  }
  cancel() {
    for (const job of this.jobs.values()) job.controller.abort();
    this.drain();
  }
  load(entries) {
    const pages = new Set(entries.filter(entry => !this.records.has(entry.productId)).map(entry => Math.floor(entry.sourceIndex / 20) + 1));
    for (const [page, job] of this.jobs) if (!pages.has(page)) job.controller.abort();
    const promises = [...pages].map(page => {
      const previous = this.jobs.get(page);
      if (previous && !previous.controller.signal.aborted) return previous.promise;
      let resolve, reject;
      const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
      const job = { page, promise, resolve, reject, controller: new AbortController() };
      this.jobs.set(page, job);
      this.queue.push(job);
      return promise;
    });
    this.drain();
    return Promise.allSettled(promises).then(results => results.filter(result => result.status === 'rejected' && result.reason?.name !== 'AbortError'));
  }
  drain() {
    while (this.active < 3 && this.queue.length) {
      const job = this.queue.shift();
      if (job.controller.signal.aborted || this.signal.aborted) {
        job.reject(new DOMException('Superseded', 'AbortError'));
        if (this.jobs.get(job.page) === job) this.jobs.delete(job.page);
        continue;
      }
      this.active++;
      this.fetchPage(job).then(job.resolve, job.reject).finally(() => {
        this.active--;
        if (this.jobs.get(job.page) === job) this.jobs.delete(job.page);
        this.drain();
      });
    }
  }
  async fetchPage(job) {
    const url = new URL(this.url, location.href);
    url.searchParams.set('page', String(job.page));
    const response = await fetch(url, { signal: job.controller.signal });
    if (!response.ok) throw new Error('Product details could not be loaded');
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    const data = JSON.parse(document.querySelector('[data-family-records]')?.textContent || 'null');
    if (!Array.isArray(data)) throw new Error('Invalid product response');
    for (const record of data) if (record.productId && record.variantId) this.records.set(String(record.productId), record);
  }
}

/** Savings against list price, including the explicitly configured checkout percentage. */
export function savingsPercent(price, comparePrice, checkoutRate = 0) {
  price = Number(price);
  const reference = Math.max(price, Number(comparePrice) || 0);
  const rate = Math.max(0, Math.min(100, Number(checkoutRate) || 0));
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(reference) || reference <= 0) return 0;
  const finalPrice = Math.round(price * (100 - rate) / 100);
  return Math.max(0, Math.min(100, Math.round((reference - finalPrice) * 100 / reference)));
}

/** Convert a viewport into contiguous row groups, including keyboard focus and its neighbors. */
export function visibleRows(total, columns, rowHeight, top, viewportHeight, focusedIndex = -1) {
  const rowCount = Math.ceil(total / columns);
  if (!rowCount) return [];
  const first = Math.max(0, Math.min(rowCount - 1, Math.floor(-top / rowHeight) - 2));
  const last = Math.min(rowCount, Math.max(first + 1, Math.ceil((viewportHeight - top) / rowHeight) + 2, first === 0 ? Math.ceil(24 / columns) : 0));
  const rows = new Set();
  for (let row = first; row < last; row++) rows.add(row);
  if (focusedIndex >= 0) {
    const focusedRow = Math.floor(focusedIndex / columns);
    for (let row = Math.max(0, focusedRow - 1); row <= Math.min(rowCount - 1, focusedRow + 1); row++) rows.add(row);
  }
  return [...rows].sort((a, b) => a - b);
}
