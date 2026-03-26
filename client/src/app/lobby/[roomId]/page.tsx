import LobbyClient from "./LobbyClient";

export default async function Lobby({
    params,
    searchParams,
}: {
    params: Promise<{ roomId: string }>;
    searchParams: Promise<{ name: string }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const roomId = resolvedParams.roomId;
    const name = resolvedSearchParams.name || "Anonymous";

    return <LobbyClient roomId={roomId} initialName={name} />;
}
