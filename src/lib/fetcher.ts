type FetchRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
  promise: Promise<Response>
}

/***
  * A Fetcher class that implements a rate limiter per second.
  * Construct it with a rate limit per second and then use fetch like usual.
*/
export class Fetcher {
  private rate: undefined | number = 0
  private count: number = 0
  private start: number = 0
  private queue: FetchRequest[] = [];
  constructor(rate?: number) {
    rate = rate;
  }
  consume() {
    const r = this.queue.shift();
    if (r)
      this.fetch(r.input, r.init, r.promise);
  }
  fetch(input: RequestInfo | URL, init?: RequestInit, promise?: Promise<Response>): Promise<Response> {
    // if (this.rate && this.count >= this.rate) {
    //   const response = new Promise<Response>((resolve, reject) => { });
    //   this.queue.push({
    //     input: input,
    //     init: init,
    //     promise: response
    //   })
    //   return response;
    // } else {
    //   if (promise) {
    //     promise.resolve()
    //   }
    //   return fetch(input, init);
    // }
    return fetch(input, init)
  }
  async getJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await this.fetch(input, init);
    return await response.json()
  }
}
