import { GameLayout } from "@/components/game/GameLayout";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GameLayout>{children}</GameLayout>;
}
