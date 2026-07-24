#!/usr/bin/env node

/** Generate preview and verify watermark marker in PNG bytes */

import { verifyWatermarkFromPreviewUrl } from "./prepPaid.mjs";



export async function runWatermark(base, session) {

  if (!session?.previewImageUrl) {

    return { name: "watermark", ok: false, error: "no session preview" };

  }

  const v = verifyWatermarkFromPreviewUrl(session.previewImageUrl);

  return {

    name: "watermark",

    ok: v.ok,

    bytes: v.bytes,

    mock: !!session.mock,

    watermarkFlag: session.watermark || null,

    error: v.ok ? undefined : v.error || "marked png too small",

  };

}


