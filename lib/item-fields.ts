export const categories = ["전자기기", "문구·도서", "의류·가방", "생활용품", "기타"] as const;
export type Status = "keeping" | "returned";
export type ItemFields = {
  name: string; category: string; foundAt: string; foundOn: string; keptAt: string; description: string;
};
export type BoardItem = ItemFields & { id: string; status: Status; mine: boolean };
export function todayKorea() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}
export function checkFields(raw: Record<string, unknown>): ItemFields {
  const field = (key: string, label: string, max: number, required = true) => {
    const value = typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
    if (required && !value) throw new Error(label + " 항목을 입력해 주세요.");
    if (value.length > max) throw new Error(label + " 항목은 " + max + "자까지 입력할 수 있어요.");
    return value;
  };
  const result = {
    name: field("name", "물건 이름", 60), category: field("category", "분류", 20),
    foundAt: field("foundAt", "습득 위치", 100), foundOn: field("foundOn", "습득 날짜", 10),
    keptAt: field("keptAt", "보관 장소", 100), description: field("description", "특징", 500, false),
  };
  if (!(categories as readonly string[]).includes(result.category)) throw new Error("물건 분류를 선택해 주세요.");
  const epoch = Date.parse(result.foundOn + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.foundOn) || !Number.isFinite(epoch) ||
      new Date(epoch).toISOString().slice(0,10) !== result.foundOn || result.foundOn > todayKorea()) {
    throw new Error("습득 날짜는 오늘까지의 유효한 날짜로 입력해 주세요.");
  }
  return result;
}
