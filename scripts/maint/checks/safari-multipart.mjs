#!/usr/bin/env node

/** iOS UA multipart download path */

export async function runSafariMultipart(base, session) {

  if (!session?.orderId || !session?.unlockToken || !session?.previewVault) {

    return { name: "safari-multipart", ok: false, error: "no session" };

  }



  const vault = session.previewVault || "";

  const meta = {

    orderId: session.orderId,

    unlockToken: session.unlockToken,

    shotId: "safari_test",

    mode: "again",

    format: "binary",

  };

  const fd = new FormData();

  fd.append("meta", JSON.stringify(meta));

  fd.append("vault", new Blob([vault], { type: "application/octet-stream" }), "vault.bin");



  const dl = await fetch(`${base}/api/download`, {

    method: "POST",

    headers: {

      Accept: "image/png",

      "User-Agent":

        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",

    },

    body: fd,

  });

  const transport = dl.headers.get("X-Djs-Transport");

  const buf = Buffer.from(await dl.arrayBuffer());

  return {

    name: "safari-multipart",

    ok: dl.ok && buf.length > 100 && buf[0] === 0x89,

    status: dl.status,

    transport,

    bytes: buf.length,

  };

}


