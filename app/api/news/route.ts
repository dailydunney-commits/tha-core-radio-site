export const dynamic = "force-dynamic";
export const revalidate = 900;

const feeds: Record<string,string> = {
  world:"https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en",
  music:"https://news.google.com/rss/search?q=reggae+dancehall+music+news&hl=en-US&gl=US&ceid=US:en",
  sports:"https://news.google.com/rss/search?q=sports+news&hl=en-US&gl=US&ceid=US:en",
  business:"https://news.google.com/rss/search?q=business+money+news&hl=en-US&gl=US&ceid=US:en",
  weather:"https://news.google.com/rss/search?q=Jamaica+weather+storm+news&hl=en-US&gl=US&ceid=US:en",
  "radio-updates":"https://news.google.com/rss/search?q=radio+broadcast+music+news&hl=en-US&gl=US&ceid=US:en"
};

function decode(text:string){
  let out = text || "";
  for (let i = 0; i < 3; i++) {
    out = out
      .replace(/<!\[CDATA\[/g,"")
      .replace(/\]\]>/g,"")
      .replace(/&lt;/g,"<")
      .replace(/&gt;/g,">")
      .replace(/&quot;/g,'"')
      .replace(/&#39;/g,"'")
      .replace(/&apos;/g,"'")
      .replace(/&nbsp;/g," ")
      .replace(/&amp;/g,"&");
  }
  return out;
}

function clean(text:string){
  return decode(text)
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/Ã¢â‚¬Â¢/g,"•")
    .replace(/â€¢/g,"•")
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢/g,"•")
    .replace(/\s+/g," ")
    .trim();
}

function shorten(text:string){
  const c = clean(text);
  return c.length > 320 ? c.slice(0,320) + "..." : c;
}

export async function GET(request:Request){
  const {searchParams} = new URL(request.url);
  const category = searchParams.get("category") || "world";
  const feed = feeds[category] || feeds.world;

  try{
    const res = await fetch(feed,{next:{revalidate:900}});
    const xml = await res.text();
    const rawItems = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    const items = rawItems.slice(0,12).map((item)=>{
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "News Source";
      const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";

      return {
        title: clean(title),
        link: "",
        source: clean(source),
        pubDate: clean(pubDate),
        description: shorten(description)
      };
    });

    return Response.json({
      category,
      updatedAt:new Date().toISOString(),
      items
    });
  }catch{
    return Response.json({
      category,
      updatedAt:new Date().toISOString(),
      items:[
        {
          title:"Live news loading soon",
          link:"",
          source:"Tha Core Newsroom",
          pubDate:new Date().toUTCString(),
          description:"Live news is temporarily loading. Please refresh shortly."
        }
      ]
    });
  }
}