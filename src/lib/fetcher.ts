type FetchRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
}

/***
  * A Fetcher class that implements a rate limiter per second.
  * Construct it with a rate limit per second and then use fetch like usual.
  * Without a rate (or with a non-positive one), requests are not limited.
*/
export class Fetcher {
  private rate: undefined | number
  private count: number = 0
  private start: number = 0
  private queue: FetchRequest[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(rate?: number) {
    this.rate = rate !== undefined && rate > 0 ? rate : undefined;
  }

  /**
   * Sends as many queued requests as the current one-second window allows,
   * then schedules itself for the start of the next window if some remain.
   */
  private consume() {
    this.timer = undefined;
    while (this.queue.length > 0) {
      const now = Date.now();
      if (now - this.start >= 1000) {
        this.start = now;
        this.count = 0;
      }
      if (this.rate !== undefined && this.count >= this.rate) {
        this.timer = setTimeout(() => this.consume(), this.start + 1000 - now);
        return;
      }
      this.count++;
      const r = this.queue.shift()!;
      fetch(r.input, r.init).then(r.resolve, r.reject);
    }
  }

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      this.queue.push({ input, init, resolve, reject });
      // If a timer is pending, the queue is already waiting for the next window.
      if (this.timer === undefined)
        this.consume();
    });
  }

  async getJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await this.fetch(input, init);
    return await response.json()
  }
}
