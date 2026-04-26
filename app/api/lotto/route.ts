export const dynamic = "force-dynamic";
export const revalidate = 300;

const SOURCES = [
 "https://www.jamaicaindex.com/lottery/jamaica-lotto-results-for-today",
 "https://www.lotterypost.com/results/jamaica"
];

function clean(t:string){
 return t
 .replace(/<script[\s\S]*?<\/script>/gi," ")
 .replace(/<style[\s\S]*?<\/style>/gi," ")
 .replace(/<[^>]+>/g," ")
 .replace(/&nbsp;/g," ")
 .replace(/&amp;/g,"&")
 .replace(/\s+/g," ")
 .trim();
}

function parse(text:string){
 const patterns = [
   /Cash Pot[^0-9]{0,30}(\d{1,2})/i,
   /Jamaica Cash Pot[^0-9]{0,30}(\d{1,2})/i,
   /Cashpot[^0-9]{0,30}(\d{1,2})/i
 ];

 for (const p of patterns){
   const m=text.match(p);
   if(m){
     return m[1];
   }
 }
 return null;
}

export async function GET(){
 try{
   for(const url of SOURCES){
     try{
       const res=await fetch(url,{cache:"no-store",headers:{"User-Agent":"Mozilla/5.0"}});
       const html=await res.text();
       const text=clean(html);
       const number=parse(text);

       if(number){
         return Response.json({
           source:url,
           updatedAt:new Date().toISOString(),
           results:[
             {
               label:"Cash Pot",
               draw:"Latest Draw",
               result:number
             }
           ]
         });
       }
     }catch{}
   }

   return Response.json({
     source:"Tha Core Backup",
     updatedAt:new Date().toISOString(),
     results:[
       {
         label:"Cash Pot",
         draw:"Latest Draw",
         result:"Awaiting update"
       }
     ]
   });

 }catch{
   return Response.json({
     source:"Tha Core Backup",
     updatedAt:new Date().toISOString(),
     results:[
       {
         label:"Cash Pot",
         draw:"Latest Draw",
         result:"Try refresh shortly"
       }
     ]
   });
 }
}