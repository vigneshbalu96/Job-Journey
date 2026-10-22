import { NextResponse } from "next/server";

/**
 * The bookmarklet grabs the rendered page text (which the server cannot see on
 * JS-heavy boards) and opens /clip with it. Text is capped so the URL stays
 * well under browser limits; the clip page tells the user if it was cut.
 */
export function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const js = `(function(){var t=(document.body&&document.body.innerText)||'';t=t.replace(/\\n{3,}/g,'\\n\\n').slice(0,14000);window.open('${origin}/clip?url='+encodeURIComponent(location.href)+'&text='+encodeURIComponent(t),'_blank');})();`;
  return new NextResponse(js, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
