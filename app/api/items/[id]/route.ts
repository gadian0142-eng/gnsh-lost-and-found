import { authorize, boundedRequest, db, fail, json, bucket, photoKey } from "@/lib/item-server";
import { checkFields } from "@/lib/item-fields";
type Context = { params: Promise<{id:string}> };
export async function PATCH(request: Request, context: Context) {
  const owner = await authorize(request,true); if(owner instanceof Response) return owner;
  const {id} = await context.params;
  const limited = await boundedRequest(request,16_384); if (limited instanceof Response) return limited;
  let data; try { data = await limited.json(); } catch { return fail("입력 내용을 확인해 주세요.",400); }
  if (!data || typeof data !== "object") return fail("입력 내용을 확인해 주세요.",400);
  let statement;
  if ("status" in data) {
    if (data.status !== "keeping" && data.status !== "returned") return fail("상태를 확인해 주세요.",400);
    statement = db().prepare("UPDATE items SET status=? WHERE id=? AND owner=? AND status<>'deleting'").bind(data.status,id,owner);
  } else {
    let f; try { f = checkFields(data as Record<string,unknown>); } catch(e) { return fail((e as Error).message,400); }
    statement = db().prepare("UPDATE items SET name=?,category=?,found_at=?,found_on=?,kept_at=?,description=? WHERE id=? AND owner=? AND status<>'deleting'")
      .bind(f.name,f.category,f.foundAt,f.foundOn,f.keptAt,f.description,id,owner);
  }
  const result = await statement.run();
  return result.meta.changes ? json({ok:true}) : fail("수정할 수 있는 게시물이 없어요.",404);
}
export async function DELETE(request: Request, context: Context) {
  const owner = await authorize(request,true); if(owner instanceof Response) return owner;
  const {id} = await context.params;
  // Hide the item first so neither a failed storage deletion nor a retry exposes a broken photo.
  const result = await db().prepare("UPDATE items SET status='deleting' WHERE id=? AND owner=?").bind(id,owner).run();
  if (!result.meta.changes) return fail("삭제할 수 있는 게시물이 없어요.",404);
  await bucket().delete(photoKey(id));
  await db().prepare("DELETE FROM items WHERE id=? AND owner=? AND status='deleting'").bind(id,owner).run();
  return json({ok:true});
}
