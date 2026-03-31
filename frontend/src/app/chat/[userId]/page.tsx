import ChatClient from "./ChatClient";

export function generateStaticParams() {
  return [{ userId: "_" }];
}

export default function ChatPage() {
  return <ChatClient />;
}
