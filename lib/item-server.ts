import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export const db = () => { if (!env.DB) throw new Error("Database unavailable"); return env.DB; };
export const bucket = () => { if (!env.BUCKET) throw new Error("Photo storage unavailable"); return env.BUCKET; };
export const json = (value: unknown, status = 200) =>
  Response.json(value, {status, headers: {"Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff"}});
export const fail = (message: string, status: number) => json({error:message}, status);
export async function authorize(request: Request, write = false): Promise<string | Response> {
  const user = await getChatGPTUser();
  if (!user) return fail("학교 게시판에 접속하려면 로그인이 필요해요.", 401);
  // A custom header requires a same-origin request (no CORS grants on these routes).
  if (write && request.headers.get("x-found-desk") !== "1") return fail("이 요청을 처리할 수 없어요.", 403);
  return user.userId;
}
export const photoKey = (id: string) => "photos/" + id + ".jpg";

// Enforce the same size limit when the client sends a chunked request.
export async function boundedRequest(request: Request, limit: number): Promise<Request | Response> {
  const tooLarge = () => fail("입력 용량이 너무 커요. 크기를 줄여 다시 시도해 주세요.",413);
  if (Number(request.headers.get("content-length") ?? 0) > limit) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return fail("입력 내용이 없어요.",400);
  const chunks: ArrayBuffer[] = []; let size = 0;
  try {
    for (;;) {
      const {value,done} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); return tooLarge(); }
      chunks.push(Uint8Array.from(value).buffer);
    }
  } finally { reader.releaseLock(); }
  return new Request(request.url,{method:request.method,headers:request.headers,body:new Blob(chunks)});
}
