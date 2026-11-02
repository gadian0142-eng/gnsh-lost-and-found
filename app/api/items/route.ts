import { authorize, boundedRequest, bucket, db, fail, json, photoKey } from "@/lib/item-server";
import { categories, checkFields } from "@/lib/item-fields";
export const dynamic = "force-dynamic";
const pageSize = 12;

export async function GET(request: Request) {
  const owner = await authorize(request);
  if (owner instanceof Response) return owner;
  const query = new URL(request.url).searchParams;
  const where: string[] = ["status IN ('keeping','returned')"]; const params: (string|number)[] = [];
  const filter = (clause: string, ...values: string[]) => { where.push(clause); params.push(...values); };
  const status = query.get("status"), category = query.get("category");
  if (status === "keeping" || status === "returned") filter("status = ?",status);
  if (categories.some(x => x === category)) filter("category = ?",category!);
  if (query.get("mine") === "1") filter("owner = ?",owner);
  const term = (query.get("q") ?? "").trim().slice(0,100);
  if (term) filter("(instr(lower(name),lower(?))>0 OR instr(lower(found_at),lower(?))>0 OR instr(lower(kept_at),lower(?))>0)",term,term,term);
  const clause = where.length ? " WHERE " + where.join(" AND ") : "";
  const requestedPage = Number(query.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1,Math.min(requestedPage,1000000)) : 1;
  const database = db();
  const [count, rows] = await database.batch<Record<string, unknown>>([
    database.prepare("SELECT count(*) AS total FROM items" + clause).bind(...params),
    database.prepare("SELECT id,name,category,found_at AS foundAt,found_on AS foundOn,kept_at AS keptAt,description,status,(owner=?) AS mine FROM items" + clause + " ORDER BY created DESC, id DESC LIMIT ? OFFSET ?").bind(owner,...params,pageSize,(page-1)*pageSize),
  ]);
  return json({total: Number(count.results[0].total), pageSize, items: rows.results.map(row=>({...row,mine:!!row.mine}))});
}

export async function POST(request: Request) {
  const owner = await authorize(request,true); if (owner instanceof Response) return owner;
  const limited = await boundedRequest(request,2_500_000);
  if (limited instanceof Response) return limited;
  let form: FormData;
  try { form = await limited.formData(); } catch { return fail("등록 양식을 다시 확인해 주세요.",400); }
  let fields;
  try { fields = checkFields(Object.fromEntries(form.entries())); }
  catch(e) { return fail((e as Error).message,400); }
  const photo = form.get("photo");
  if (!photo || typeof photo === "string" || photo.type !== "image/jpeg" || photo.size > 2_200_000 || photo.size < 4) return fail("등록할 물건 사진을 선택해 주세요.",400);
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (bytes[0]!==255 || bytes[1]!==216 || bytes[2]!==255 || bytes.at(-2)!==255 || bytes.at(-1)!==217) return fail("JPEG 사진을 읽을 수 없어요.",400);
  const id = crypto.randomUUID();
  const {name,category,foundAt,foundOn,keptAt,description} = fields;
  const storage = bucket();
  await storage.put(photoKey(id), bytes, {httpMetadata:{contentType:"image/jpeg"}});
  try {
    await db().prepare("INSERT INTO items (id,owner,name,category,found_at,found_on,kept_at,description,created) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id,owner,name,category,foundAt,foundOn,keptAt,description,Date.now()).run();
  } catch (error) { await storage.delete(photoKey(id)); throw error; }
  return json({id},201);
}
