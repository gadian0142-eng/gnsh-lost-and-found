import { getChatGPTUser } from "./chatgpt-auth";
import Board from "./board";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Board signedIn={Boolean(await getChatGPTUser())}/>;
}
