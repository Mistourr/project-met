export type FetcherOptions = {
  /** Cooldown after the first refusal, in ms. Doubles each time the server still refuses. */
  baseDelay?: number;
  /** Upper bound for the cooldown, in ms. */
  maxDelay?: number;
  /** How many times one request may be retried before giving up. Defaults to forever. */
  maxRetries?: number;
  /** Response statuses that mean "try again later". */
  retryStatuses?: number[];
}

type FetchRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
  attempts: number;
}

/***
  * A Fetcher that waits out server throttling with one shared cooldown.
  * Use `fetch` like the normal one: the promise only resolves once a request
  * actually goes through, so the consumer just waits in the meantime.
  *
  * Requests are sent right away until the server refuses one (a status in
  * `retryStatuses`: the Met API answers 403 when a client sends too much, or a
  * network error, which is what a blocked cross-origin response looks like).
  * Then the fetcher is blocked:
  *  - the refused request and every new one wait in a queue, nothing is sent;
  *  - after the cooldown, a single probe request (the head of the queue) is sent;
  *  - if the probe is refused, the cooldown doubles (up to `maxDelay`) and the
  *    probe waits again;
  *  - if it goes through, the queue is let out gradually: each request that
  *    goes through sends 2 more, so the pace doubles instead of a burst that
  *    would get blocked again. New requests queue behind until it is empty.
  * Requests already in flight that get refused during a block go back in the
  * queue without restarting the cooldown, so the server sees nothing until it ends.
  * Aborting `init.signal` removes a queued request and rejects its promise.
*/
export class Fetcher {
  private baseDelay: number
  private maxDelay: number
  private maxRetries: number
  private retryStatuses: Set<number>

  private queue: FetchRequest[] = []
  private blocked = false
  private probe: FetchRequest | undefined
  private cooldown = 0

  constructor({
    baseDelay = 1000,
    maxDelay = 30_000,
    maxRetries = Infinity,
    retryStatuses = [403, 429, 500, 502, 503, 504],
  }: FetcherOptions = {}) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.maxRetries = maxRetries;
    this.retryStatuses = new Set(retryStatuses);
  }

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted)
        return reject(signal.reason);
      const request: FetchRequest = { input, init, resolve, reject, attempts: 0 };
      signal?.addEventListener("abort", () => {
        const i = this.queue.indexOf(request);
        if (i !== -1) {
          this.queue.splice(i, 1);
          reject(signal.reason);
        }
      }, { once: true });
      if (this.blocked || this.queue.length > 0)
        this.queue.push(request);
      else
        this.send(request);
    });
  }

  async getJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await this.fetch(input, init);
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText} for ${response.url}`);
    return await response.json()
  }

  private async send(r: FetchRequest) {
    let response: Response | undefined;
    let error: unknown;
    try {
      response = await fetch(r.input, r.init);
    } catch (e) {
      error = e;
    }

    const isProbe = r === this.probe;
    if (isProbe)
      this.probe = undefined;
    const aborted = r.init?.signal?.aborted ?? false;
    const refused = !aborted && (response
      ? this.retryStatuses.has(response.status)
      : error instanceof TypeError);

    if (refused && r.attempts < this.maxRetries) {
      r.attempts++;
      // Back at the front: it was asked for before anything still queued.
      this.queue.unshift(r);
    } else if (response) {
      r.resolve(response);
    } else {
      r.reject(error);
    }

    if (refused)
      this.block(isProbe, response);
    else if (isProbe && aborted)
      this.sendProbe(); // The probe told us nothing: try the next one now.
    else {
      if (isProbe)
        this.blocked = false;
      // A request sent before the block that went through tells us nothing either.
      if (!this.blocked)
        this.release(2);
    }
  }

  /**
   * Starts a cooldown, or a longer one if the probe was refused.
   * A refusal from a request sent before the block doesn't touch the running cooldown.
   */
  private block(fromProbe: boolean, response?: Response) {
    if (this.blocked && !fromProbe)
      return;
    this.blocked = true;
    this.cooldown = Math.min(this.maxDelay, this.cooldown ? this.cooldown * 2 : this.baseDelay);
    // Honor Retry-After (in seconds) when the server sends one.
    const retryAfter = Number(response?.headers.get("Retry-After")) * 1000 || 0;
    setTimeout(() => this.sendProbe(), Math.max(this.cooldown, retryAfter));
  }

  private sendProbe() {
    this.probe = this.queue.shift();
    if (this.probe)
      this.send(this.probe);
    else
      this.release(0); // Everything waiting was aborted: just resume.
  }

  /** Sends up to `count` queued requests. Once the queue is empty, we're fully recovered. */
  private release(count: number) {
    this.blocked = false;
    for (let i = 0; i < count && this.queue.length > 0; i++)
      this.send(this.queue.shift()!);
    // Keep the cooldown growing if we get blocked again while still catching up.
    if (this.queue.length === 0)
      this.cooldown = 0;
  }
}
