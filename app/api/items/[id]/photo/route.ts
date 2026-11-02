import { authorize, bucket, db, fail, photoKey } from "@/lib/item-server";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: {params:Promise<{id:string}>}) {
  const owner = await authorize(request); if(owner instanceof Response) return owner;
  const {id} = await context.params;
  const row = await db().prepare("SELECT id FROM items WHERE id=? AND status<>'deleting'").bind(id).first();
  if (!row) return fail("사진을 찾을 수 없어요.",404);
  const object = await bucket().get(photoKey(id)); if(!object) return fail("사진을 찾을 수 없어요.",404);
  return new Response(object.body,{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
