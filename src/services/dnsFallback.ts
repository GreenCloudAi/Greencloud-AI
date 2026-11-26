import dns from "node:dns";

let isInitialized = false;

/**
 * Initializes a resilient DNS fallback for Node.js backend runtimes.
 * If the local gateway/router DNS (e.g. 192.168.1.4) fails with EAI_AGAIN or ENOTFOUND
 * when resolving cloud endpoints (like sts.us-east-1.amazonaws.com), this fallback
 * automatically queries public DNS servers (8.8.8.8, 1.1.1.1).
 */
export function initDnsFallback() {
  if (isInitialized || typeof window !== "undefined") {
    return;
  }
  isInitialized = true;

  try {
    // Configure Node c-ares resolver to use reliable public resolvers
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

    const originalLookup = dns.lookup;

    const fallbackLookup = function (hostname: string, options: any, callback: any) {
      let cb = callback;
      let opts = options;
      if (typeof opts === "function") {
        cb = opts;
        opts = {};
      }

      originalLookup(hostname, opts, (err, address, family) => {
        if (err && (err.code === "EAI_AGAIN" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT")) {
          // Fallback to c-ares resolve4
          dns.resolve4(hostname, (resErr, addresses) => {
            if (!resErr && addresses && addresses.length > 0) {
              if (opts && opts.all) {
                return cb(
                  null,
                  addresses.map((addr) => ({ address: addr, family: 4 }))
                );
              }
              return cb(null, addresses[0], 4);
            }

            // If IPv4 resolution yielded nothing, try IPv6
            dns.resolve6(hostname, (res6Err, addrs6) => {
              if (!res6Err && addrs6 && addrs6.length > 0) {
                if (opts && opts.all) {
                  return cb(
                    null,
                    addrs6.map((addr) => ({ address: addr, family: 6 }))
                  );
                }
                return cb(null, addrs6[0], 6);
              }
              // If both failed, return original error
              return cb(err, address, family);
            });
          });
        } else {
          return cb(err, address, family);
        }
      });
    };

    fallbackLookup.__promisify__ = originalLookup.__promisify__;
    dns.lookup = fallbackLookup as unknown as typeof dns.lookup;

    console.log("[GreenCloud DNS] Resilient DNS fallback active (8.8.8.8 / 1.1.1.1 configured).");
  } catch (e) {
    console.warn("[GreenCloud DNS] Could not initialize DNS fallback:", e);
  }
}

// Auto-run when module is loaded in Node
initDnsFallback();
